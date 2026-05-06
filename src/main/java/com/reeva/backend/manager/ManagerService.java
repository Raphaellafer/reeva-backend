package com.reeva.backend.manager;

import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.audit.AuditLog;
import com.reeva.backend.common.audit.AuditRepository;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.*;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.PaymentBatchResponse;
import com.reeva.backend.manager.dto.PolicyAuditLogResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.manager.dto.ReviewRequest;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ManagerService {

    private final ExpenseRepository expenseRepository;
    private final ExpensePolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final AuditRepository auditRepository;

    public ManagerService(ExpenseRepository expenseRepository, ExpensePolicyRepository policyRepository,
                          UserRepository userRepository,
                          AuditService auditService,
                          AuditRepository auditRepository) {
        this.expenseRepository = expenseRepository;
        this.policyRepository = policyRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.auditRepository = auditRepository;
    }

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> listTeamExpenses(User manager, String statusFilter, Pageable pageable) {
        ExpenseStatus status = null;
        if (statusFilter != null && !statusFilter.isBlank()) {
            try { status = ExpenseStatus.valueOf(statusFilter.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        return expenseRepository.findByManagerId(manager.getId(), status, pageable)
            .map(ExpenseResponse::from);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseDetail(User manager, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndManagerId(expenseId, manager.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));
        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse approve(User manager, UUID expenseId) {
        Expense expense = getReviewableExpense(manager, expenseId);
        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.MANAGER_APPROVED);
        expense.setManager(manager);
        expense.setManagerReviewedAt(Instant.now());
        expense.getStatusHistory().add(new ExpenseStatusHistory(
            expense, from, ExpenseStatus.MANAGER_APPROVED, manager, "Aprovado pelo gestor"
        ));
        Expense saved = expenseRepository.save(expense);
        auditService.log(manager.getCompany().getId(), manager.getId(),
            "EXPENSE_APPROVED", "Expense", expenseId,
            Map.of("from", from.name()), null);
        return ExpenseResponse.from(saved);
    }

    @Transactional
    public ExpenseResponse reject(User manager, UUID expenseId, ReviewRequest request) {
        Expense expense = getReviewableExpense(manager, expenseId);
        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.MANAGER_REJECTED);
        expense.setManager(manager);
        expense.setManagerReviewedAt(Instant.now());
        expense.setManagerNotes(request.notes());
        expense.getStatusHistory().add(new ExpenseStatusHistory(
            expense, from, ExpenseStatus.MANAGER_REJECTED, manager, "Rejeitado: " + request.notes()
        ));
        Expense saved = expenseRepository.save(expense);
        auditService.log(manager.getCompany().getId(), manager.getId(),
            "EXPENSE_REJECTED", "Expense", expenseId,
            Map.of("from", from.name(), "reason", request.notes()), null);
        return ExpenseResponse.from(saved);
    }

    @Transactional
    public ExpenseResponse requestRevision(User manager, UUID expenseId, ReviewRequest request) {
        Expense expense = expenseRepository.findByIdAndManagerId(expenseId, manager.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));

        if (!List.of(ExpenseStatus.PENDING_REVIEW, ExpenseStatus.SUBMITTED)
                .contains(expense.getStatus())) {
            throw BusinessException.badRequest("Cannot request revision for expense in status: " + expense.getStatus());
        }

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.NEEDS_REVISION);
        expense.setManager(manager);
        expense.setManagerNotes(request.notes());
        expense.getStatusHistory().add(new ExpenseStatusHistory(
            expense, from, ExpenseStatus.NEEDS_REVISION, manager, "Revisão solicitada: " + request.notes()
        ));
        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(User manager) {
        List<ExpenseStatus> pendingStatuses = List.of(
            ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_REVIEW
        );
        long pending = expenseRepository.countByManagerIdAndStatuses(manager.getId(), pendingStatuses);
        long approved = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.MANAGER_APPROVED, ExpenseStatus.FINANCE_APPROVED, ExpenseStatus.PAID));
        long rejected = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.MANAGER_REJECTED));
        long needsRevision = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.NEEDS_REVISION));
        BigDecimal approvedTotal = expenseRepository.sumAmountByManagerIdAndStatus(
            manager.getId(), ExpenseStatus.MANAGER_APPROVED);
        long teamSize = userRepository.countByManagerId(manager.getId());
        long autoApproved = expenseRepository.countByManagerIdAndAiDecision(
            manager.getId(), AiDecision.AUTO_APPROVED);
        long policyViolations = expenseRepository.countPolicyViolationsByManagerId(manager.getId());
        long manualReview = expenseRepository.countByManagerIdAndAiDecision(
            manager.getId(), AiDecision.READY_FOR_MANAGER)
            + expenseRepository.countByManagerIdAndAiDecision(
                manager.getId(), AiDecision.PENDING_MANUAL_REVIEW);
        long totalRouted = autoApproved + manualReview + policyViolations;
        int automationRate = totalRouted == 0 ? 0 : (int) Math.round((autoApproved * 100.0) / totalRouted);
        BigDecimal estimatedSavings = BigDecimal.valueOf(autoApproved).multiply(new BigDecimal("18.00"));

        return new DashboardResponse(pending, approved, rejected, needsRevision,
            approvedTotal != null ? approvedTotal : BigDecimal.ZERO, teamSize,
            autoApproved, policyViolations, manualReview, estimatedSavings, automationRate);
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> listPolicies(User manager) {
        return policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(manager.getCompany().getId())
            .stream()
            .map(PolicyResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PolicyAuditLogResponse> listPolicyAuditLogs(User manager) {
        List<com.reeva.backend.common.audit.AuditLog> logs = auditRepository.findByCompanyIdAndEntityTypeOrderByCreatedAtDesc(
                manager.getCompany().getId(),
                "ExpensePolicy",
                org.springframework.data.domain.PageRequest.of(0, 100)
            )
            .stream()
            .filter(log -> log.getAction() != null && log.getAction().startsWith("POLICY_"))
            .toList();

        Map<UUID, String> userNamesById = userRepository.findAllById(
                logs.stream()
                    .map(com.reeva.backend.common.audit.AuditLog::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet())
            )
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return logs.stream()
            .map(log -> PolicyAuditLogResponse.from(log, userNamesById.get(log.getUserId())))
            .toList();
    }

    @Transactional
    public PolicyResponse savePolicy(User manager, PolicyUpdateRequest request) {
        var existing = policyRepository.findByCompanyIdAndCategory(manager.getCompany().getId(), request.category());
        boolean created = existing.isEmpty();
        boolean reactivated = existing.map(policy -> !policy.isActive()).orElse(false);
        ExpensePolicy policy = existing
            .orElseGet(() -> new ExpensePolicy(manager.getCompany(), request.category(), request.maxAmount()));
        Map<String, Object> before = created ? Map.of() : policySnapshot(policy);

        policy.setMaxAmount(request.maxAmount());
        policy.setDailyLimit(request.dailyLimit());
        policy.setMonthlyLimit(request.monthlyLimit());
        policy.setRequiresReceipt(request.requiresReceipt());
        policy.setAutoApprovalMinScore(
            request.autoApprovalMinScore() != null ? request.autoApprovalMinScore() : (short) 90
        );
        policy.setDescription(request.description());
        policy.setActive(true);

        ExpensePolicy saved = policyRepository.save(policy);
        String action = created ? "POLICY_CREATED" : reactivated ? "POLICY_REACTIVATED" : "POLICY_UPDATED";
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("category", saved.getCategory().name());
        metadata.put("changedByName", manager.getName());
        metadata.put("changedByEmail", manager.getEmail());
        metadata.put("before", before);
        metadata.put("after", policySnapshot(saved));

        auditRepository.save(
            AuditLog.builder()
                .companyId(manager.getCompany().getId())
                .userId(manager.getId())
                .action(action)
                .entityType("ExpensePolicy")
                .entityId(saved.getId())
                .metadata(metadata)
                .build()
        );
        return PolicyResponse.from(saved);
    }

    private Map<String, Object> policySnapshot(ExpensePolicy policy) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("category", policy.getCategory().name());
        snapshot.put("maxAmount", policy.getMaxAmount());
        snapshot.put("dailyLimit", policy.getDailyLimit());
        snapshot.put("monthlyLimit", policy.getMonthlyLimit());
        snapshot.put("requiresReceipt", policy.isRequiresReceipt());
        snapshot.put("autoApprovalMinScore", policy.getAutoApprovalMinScore());
        snapshot.put("description", policy.getDescription());
        snapshot.put("active", policy.isActive());
        return snapshot;
    }

    @Transactional(readOnly = true)
    public PaymentBatchResponse approvedPayments(User manager, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.of(2000, 1, 1);
        LocalDate effectiveTo = to != null ? to : LocalDate.of(2100, 12, 31);
        List<Expense> expenses = expenseRepository.findApprovedForPayment(
            manager.getId(), ExpenseStatus.MANAGER_APPROVED, effectiveFrom, effectiveTo
        );

        Map<UUID, List<Expense>> byEmployee = new LinkedHashMap<>();
        for (Expense expense : expenses) {
            byEmployee.computeIfAbsent(expense.getUser().getId(), ignored -> new ArrayList<>()).add(expense);
        }

        List<PaymentBatchResponse.EmployeePayment> employees = byEmployee.values().stream()
            .map(rows -> {
                User user = rows.get(0).getUser();
                BigDecimal total = rows.stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new PaymentBatchResponse.EmployeePayment(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getPixKey() != null && !user.getPixKey().isBlank() ? user.getPixKey() : user.getEmail(),
                    total,
                    rows.stream().map(PaymentBatchResponse.PaymentExpense::from).toList()
                );
            })
            .toList();

        BigDecimal total = expenses.stream()
            .map(Expense::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PaymentBatchResponse(from, to, total, employees.size(), expenses.size(), employees);
    }

    private Expense getReviewableExpense(User manager, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndManagerId(expenseId, manager.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));

        if (!List.of(ExpenseStatus.PENDING_REVIEW, ExpenseStatus.SUBMITTED)
                .contains(expense.getStatus())) {
            throw BusinessException.badRequest("Expense is not pending review (status: " + expense.getStatus() + ")");
        }
        return expense;
    }
}
