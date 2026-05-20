package com.reeva.backend.expense;

import com.reeva.backend.ai.OcrService;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.attachment.AttachmentType;
import com.reeva.backend.expense.attachment.AttachmentRepository;
import com.reeva.backend.expense.attachment.ExpenseAttachment;
import com.reeva.backend.expense.comment.CommentService;
import com.reeva.backend.expense.comment.dto.CommentRequest;
import com.reeva.backend.expense.comment.dto.CommentResponse;
import com.reeva.backend.expense.dto.EmployeeExpenseCorrectionRequest;
import com.reeva.backend.expense.dto.ExpenseRequest;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.expense.dto.ExpenseUpdateRequest;
import com.reeva.backend.expense.queue.OcrQueuePublisher;
import com.reeva.backend.project.Project;
import com.reeva.backend.project.ProjectService;
import com.reeva.backend.storage.StorageService;
import com.reeva.backend.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

@Service
public class ExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseService.class);

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final CommentService commentService;
    private final AuditService auditService;
    private final OcrService ocrService;
    private final OcrQueuePublisher ocrQueuePublisher;
    private final AttachmentRepository attachmentRepository;
    private final ProjectService projectService;

    @Value("${app.demo.allow-test-expense-date:false}")
    private boolean allowTestExpenseDate;

    public ExpenseService(ExpenseRepository expenseRepository, StorageService storageService,
                          CommentService commentService, AuditService auditService,
                          OcrService ocrService, OcrQueuePublisher ocrQueuePublisher,
                          AttachmentRepository attachmentRepository, ProjectService projectService) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.commentService = commentService;
        this.auditService = auditService;
        this.ocrService = ocrService;
        this.ocrQueuePublisher = ocrQueuePublisher;
        this.attachmentRepository = attachmentRepository;
        this.projectService = projectService;
    }

    @Transactional
    public ExpenseResponse create(User currentUser, MultipartFile file, ExpenseRequest request) {
        StorageService.StoredFile stored = storageService.store(file);
        Project project = projectService.getEmployeeProject(currentUser, request.projectId());

        String category = CategoryUtils.normalize(request.category());
        if (category == null) {
            throw BusinessException.badRequest("Categoria invalida");
        }
        boolean dateOverrideRequested = Boolean.TRUE.equals(request.testExpenseDateOverride());
        if (dateOverrideRequested && !allowTestExpenseDate) {
            throw BusinessException.badRequest("Data de teste nao esta habilitada neste ambiente");
        }
        if (!dateOverrideRequested && !request.expenseDate().equals(LocalDate.now())) {
            throw BusinessException.badRequest("Data manual de despesa nao esta habilitada neste ambiente");
        }
        Expense expense = new Expense(
            currentUser.getCompany(), currentUser, project, request.title(), category,
            request.amount(), request.expenseDate(),
            request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.OTHER
        );
        expense.setDemoDateOverride(dateOverrideRequested);
        expense.setDescription(request.description());

        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, null, ExpenseStatus.DRAFT, currentUser, "Expense created")
        );

        AttachmentType attachType = resolveAttachmentType(stored.mimeType());
        int sizeKb = (int) (stored.fileSize() / 1024);
        var attachment = new ExpenseAttachment(expense, currentUser, stored.originalName(),
            stored.filePath(), sizeKb, stored.mimeType(), attachType);
        attachment.setFileSha256(sha256(file));
        expense.getAttachments().add(attachment);

        expenseRepository.save(expense);

        Map<String, Object> auditMetadata = new HashMap<>();
        auditMetadata.put("title", request.title());
        auditMetadata.put("amount", request.amount());
        auditMetadata.put("projectId", project.getId());
        if (dateOverrideRequested) {
            auditMetadata.put("testExpenseDateOverride", true);
            auditMetadata.put("testExpenseDate", request.expenseDate());
        }

        auditService.log(
            currentUser.getCompany().getId(), currentUser.getId(),
            "EXPENSE_CREATED", "Expense", expense.getId(),
            auditMetadata, null
        );

        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse submit(User currentUser, UUID expenseId) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be submitted");
        }

        if (!expense.getAttachments().isEmpty()) {
            var attachment = expense.getAttachments().get(0);
            String fileSha256 = attachment.getFileSha256();
            if (fileSha256 != null && !fileSha256.isBlank()) {
                var duplicates = attachmentRepository.findActiveDuplicatesByFileSha256(
                    currentUser.getCompany().getId(), expense.getId(), fileSha256);
                if (!duplicates.isEmpty()) {
                    return ExpenseResponse.from(rejectDuplicateOnSubmit(
                        expense, duplicates.get(0).getExpense(), currentUser, "imagem identica ja enviada"));
                }
            }
        }

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.SUBMITTED);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, from, ExpenseStatus.SUBMITTED, currentUser, "Submitted by employee")
        );

        Expense saved = expenseRepository.save(expense);
        try {
            ocrQueuePublisher.publish(saved.getId());
        } catch (Exception ex) {
            log.warn("Could not enqueue OCR job for expense {}; processing synchronously. Cause: {}",
                saved.getId(), ex.getMessage());
            ocrService.processExpense(saved.getId());
        }
        return ExpenseResponse.from(saved);
    }

    private Expense rejectDuplicateOnSubmit(Expense expense, Expense original, User currentUser, String evidence) {
        ExpenseStatus from = expense.getStatus();
        expense.setDuplicateOfExpense(original);
        expense.setAiScore((short) 0);
        expense.setComplianceScore((short) 0);
        expense.setAiAlertLevel(AiAlertLevel.HIGH);
        expense.setAiAnalysis("Possivel duplicidade detectada: " + evidence + ".");
        expense.setAiDecision(AiDecision.PENDING_MANUAL_REVIEW);
        expense.setAiDecisionReason("Possivel duplicidade contra a despesa " + original.getId() + " por " + evidence + ".");
        expense.setPolicyCompliant(true);
        expense.setPolicyViolationReason(null);
        expense.setSefazStatus(SefazStatus.UNAVAILABLE);
        expense.setSefazValidationMessage("Possivel duplicidade detectada na base da empresa; gestor deve revisar.");
        expense.setAutoApprovalEligible(false);
        expense.setManualReviewReason("Possivel duplicidade detectada. Gestor deve revisar antes de aprovar.");
        expense.transitionTo(ExpenseStatus.PENDING_REVIEW);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(
                expense, from, ExpenseStatus.PENDING_REVIEW, currentUser,
                "Sistema: possivel duplicidade da despesa " + original.getId() + " (" + evidence + ")"
            )
        );
        return expenseRepository.save(expense);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> listMine(User currentUser, Pageable pageable) {
        return expenseRepository.findByUserIdNotDeleted(currentUser.getId(), pageable)
            .map(ExpenseResponse::from);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse findMine(User currentUser, UUID expenseId) {
        return ExpenseResponse.from(getOwnedExpense(currentUser, expenseId));
    }

    @Transactional(readOnly = true)
    public ExpenseStatus getStatus(User currentUser, UUID expenseId) {
        return getOwnedExpense(currentUser, expenseId).getStatus();
    }

    @Transactional
    public ExpenseResponse retryOcr(User currentUser, UUID expenseId) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getAttachments().isEmpty()) {
            throw BusinessException.badRequest("Expense has no attachment to analyze");
        }

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.SUBMITTED);
        expense.setAiAnalysis("OCR reenfileirado para analise");
        expense.setAiDecisionReason("OCR reenfileirado para analise");
        expense.setManualReviewReason(null);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, from, ExpenseStatus.SUBMITTED, currentUser, "OCR retry requested")
        );

        Expense saved = expenseRepository.save(expense);
        ocrService.processExpense(saved.getId());
        return ExpenseResponse.from(saved);
    }

    @Transactional
    public ExpenseResponse submitEmployeeCorrection(User currentUser, UUID expenseId,
                                                    EmployeeExpenseCorrectionRequest request) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.NEEDS_REVISION) {
            throw BusinessException.badRequest("Only expenses in NEEDS_REVISION can be corrected by the employee");
        }
        if (expense.getDuplicateOfExpense() != null) {
            throw BusinessException.badRequest("Nota duplicada nao pode ser corrigida ou reenviada para reembolso");
        }
        if (expense.getAmount() == null || expense.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw BusinessException.badRequest(
                "Valor da nota nao pode ser preenchido manualmente. Tire uma nova foto para o OCR ler o total."
            );
        }

        expense.setTitle(request.title());
        String category = CategoryUtils.normalize(request.category());
        if (category == null) {
            throw BusinessException.badRequest("Categoria invalida");
        }
        expense.setCategory(category);
        expense.setExpenseDate(request.expenseDate());
        expense.setDescription(request.description());
        expense.setManualReviewReason(null);
        expense.setAiDecision(AiDecision.READY_FOR_MANAGER);
        expense.setAiDecisionReason("Campos nao financeiros preenchidos manualmente pelo funcionario.");
        expense.setAiAnalysis("Aguardando decisao do gestor apos correcao manual de campos nao financeiros.");
        expense.setAutoApprovalEligible(false);

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.PENDING_REVIEW);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(
                expense, from, ExpenseStatus.PENDING_REVIEW, currentUser,
                "Campos nao financeiros preenchidos pelo funcionario e enviados ao gestor"
            )
        );

        Expense saved = expenseRepository.save(expense);

        auditService.log(
            currentUser.getCompany().getId(), currentUser.getId(),
            "EXPENSE_EMPLOYEE_CORRECTED", "Expense", expense.getId(),
            Map.of(
                "title", request.title(),
                "category", category,
                "amount", expense.getAmount().toPlainString(),
                "amountSource", "OCR_LOCKED"
            ), null
        );

        return ExpenseResponse.from(saved);
    }

    @Transactional
    public ExpenseResponse update(User currentUser, UUID expenseId, ExpenseUpdateRequest request) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be edited");
        }

        if (request.title() != null) expense.setTitle(request.title());
        if (request.description() != null) expense.setDescription(request.description());

        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(User currentUser, UUID expenseId) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be deleted");
        }

        expense.setDeleted(true);
        expenseRepository.save(expense);
    }

    @Transactional
    public CommentResponse addComment(User currentUser, UUID expenseId, CommentRequest request) {
        return commentService.addComment(getOwnedExpense(currentUser, expenseId), currentUser, request);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(User currentUser, UUID expenseId) {
        getOwnedExpense(currentUser, expenseId);
        return commentService.listByExpense(expenseId);
    }

    @Transactional(readOnly = true)
    public AttachmentFile getAttachmentFile(User currentUser, UUID attachmentId) {
        ExpenseAttachment attachment = attachmentRepository.findById(attachmentId)
            .orElseThrow(() -> BusinessException.notFound("Attachment not found"));
        Expense expense = attachment.getExpense();

        boolean owner = expense.getUser().getId().equals(currentUser.getId());
        boolean manager = expense.getProject().getCreatedBy() != null
            && expense.getProject().getCreatedBy().getId().equals(currentUser.getId());
        boolean admin = currentUser.getRole().name().equals("ADMIN");
        if (!owner && !manager && !admin) {
            throw BusinessException.notFound("Attachment not found");
        }

        byte[] bytes = storageService.downloadBytes(attachment.getFileUrl());
        String safeName = URLEncoder.encode(attachment.getFileName(), StandardCharsets.UTF_8)
            .replace("+", "%20");
        return new AttachmentFile(bytes, attachment.getMimeType(), attachment.getFileName(), safeName);
    }

    private Expense getOwnedExpense(User user, UUID expenseId) {
        return expenseRepository.findByIdAndUserId(expenseId, user.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));
    }

    private AttachmentType resolveAttachmentType(String mimeType) {
        if (mimeType == null) return AttachmentType.OTHER;
        return switch (mimeType) {
            case "application/pdf" -> AttachmentType.RECEIPT_PDF;
            case "image/jpeg", "image/png", "image/webp" -> AttachmentType.RECEIPT_IMAGE;
            default -> AttachmentType.OTHER;
        };
    }

    private String sha256(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(file.getBytes()));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash attachment", ex);
        }
    }

    public record AttachmentFile(
        byte[] bytes,
        String mimeType,
        String fileName,
        String encodedFileName
    ) {}
}
