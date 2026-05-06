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
import com.reeva.backend.project.Project;
import com.reeva.backend.project.ProjectService;
import com.reeva.backend.storage.StorageService;
import com.reeva.backend.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final CommentService commentService;
    private final AuditService auditService;
    private final OcrService ocrService;
    private final AttachmentRepository attachmentRepository;
    private final ProjectService projectService;

    public ExpenseService(ExpenseRepository expenseRepository, StorageService storageService,
                          CommentService commentService, AuditService auditService,
                          OcrService ocrService, AttachmentRepository attachmentRepository,
                          ProjectService projectService) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.commentService = commentService;
        this.auditService = auditService;
        this.ocrService = ocrService;
        this.attachmentRepository = attachmentRepository;
        this.projectService = projectService;
    }

    @Transactional
    public ExpenseResponse create(User currentUser, MultipartFile file, ExpenseRequest request) {
        StorageService.StoredFile stored = storageService.store(file);
        Project project = projectService.getEmployeeProject(currentUser, request.projectId());

        Expense expense = new Expense(
            currentUser.getCompany(), currentUser, project, request.title(), request.category(),
            request.amount(), request.expenseDate(),
            request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.OTHER
        );
        expense.setDescription(request.description());

        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, null, ExpenseStatus.DRAFT, currentUser, "Expense created")
        );

        AttachmentType attachType = resolveAttachmentType(stored.mimeType());
        int sizeKb = (int) (stored.fileSize() / 1024);
        expense.getAttachments().add(
            new ExpenseAttachment(expense, currentUser, stored.originalName(),
                stored.filePath(), sizeKb, stored.mimeType(), attachType)
        );

        expenseRepository.save(expense);

        Map<String, Object> auditMetadata = new HashMap<>();
        auditMetadata.put("title", request.title());
        auditMetadata.put("amount", request.amount());
        auditMetadata.put("projectId", project.getId());

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

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.SUBMITTED);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, from, ExpenseStatus.SUBMITTED, currentUser, "Submitted by employee")
        );

        Expense saved = expenseRepository.save(expense);
        ocrService.processExpense(saved.getId());
        return ExpenseResponse.from(saved);
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

        expense.setTitle(request.title());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setExpenseDate(request.expenseDate());
        expense.setDescription(request.description());
        expense.setManualReviewReason(null);
        expense.setAiDecision(AiDecision.READY_FOR_MANAGER);
        expense.setAiDecisionReason("Campos obrigatorios preenchidos manualmente pelo funcionario.");
        expense.setAiAnalysis("Aguardando decisao do gestor apos correcao manual dos campos obrigatorios.");
        expense.setAutoApprovalEligible(false);

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.PENDING_REVIEW);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(
                expense, from, ExpenseStatus.PENDING_REVIEW, currentUser,
                "Campos obrigatorios preenchidos pelo funcionario e enviados ao gestor"
            )
        );

        Expense saved = expenseRepository.save(expense);

        auditService.log(
            currentUser.getCompany().getId(), currentUser.getId(),
            "EXPENSE_EMPLOYEE_CORRECTED", "Expense", expense.getId(),
            Map.of(
                "title", request.title(),
                "category", request.category().name(),
                "amount", request.amount().toPlainString()
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
        boolean manager = expense.getUser().getManager() != null
            && expense.getUser().getManager().getId().equals(currentUser.getId());
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

    public record AttachmentFile(
        byte[] bytes,
        String mimeType,
        String fileName,
        String encodedFileName
    ) {}
}
