package com.reeva.backend.manager;

import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.*;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.ReviewRequest;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ManagerService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ManagerService(ExpenseRepository expenseRepository, UserRepository userRepository,
                          AuditService auditService) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
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

        if (!List.of(ExpenseStatus.AI_APPROVED, ExpenseStatus.PENDING_REVIEW, ExpenseStatus.SUBMITTED)
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
            ExpenseStatus.SUBMITTED, ExpenseStatus.AI_APPROVED, ExpenseStatus.PENDING_REVIEW
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

    private Expense getReviewableExpense(User manager, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndManagerId(expenseId, manager.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));

        if (!List.of(ExpenseStatus.AI_APPROVED, ExpenseStatus.PENDING_REVIEW, ExpenseStatus.SUBMITTED)
                .contains(expense.getStatus())) {
            throw BusinessException.badRequest("Expense is not pending review (status: " + expense.getStatus() + ")");
        }
        return expense;
    }
}
