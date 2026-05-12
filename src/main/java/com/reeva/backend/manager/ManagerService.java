package com.reeva.backend.manager;

import com.reeva.backend.common.audit.AuditLog;
import com.reeva.backend.common.audit.AuditRepository;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.company.Department;
import com.reeva.backend.company.DepartmentRepository;
import com.reeva.backend.expense.*;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.manager.dto.CreateEmployeeRequest;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.EmployeeListResponse;
import com.reeva.backend.manager.dto.EmployeeProfileResponse;
import com.reeva.backend.manager.dto.PaymentBatchResponse;
import com.reeva.backend.manager.dto.PolicyAuditLogResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.manager.dto.ReviewRequest;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import com.reeva.backend.user.UserRole;
import com.reeva.backend.user.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserService userService;
    private final AuditService auditService;
    private final AuditRepository auditRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;

    public ManagerService(ExpenseRepository expenseRepository,
                          ExpensePolicyRepository policyRepository,
                          UserRepository userRepository,
                          UserService userService,
                          AuditService auditService,
                          AuditRepository auditRepository,
                          PasswordEncoder passwordEncoder,
                          DepartmentRepository departmentRepository) {
        this.expenseRepository = expenseRepository;
        this.policyRepository = policyRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
        this.auditRepository = auditRepository;
        this.passwordEncoder = passwordEncoder;
        this.departmentRepository = departmentRepository;
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
        Object[] stats = expenseRepository.aggregateDashboardByManagerId(manager.getId());
        long teamSize = userRepository.countByManagerId(manager.getId());

        long pending       = toLong(stats[0]);
        long approved      = toLong(stats[1]);
        long rejected      = toLong(stats[2]);
        long needsRevision = toLong(stats[3]);
        BigDecimal approvedTotal = stats[4] != null ? new BigDecimal(stats[4].toString()) : BigDecimal.ZERO;
        long autoApproved      = toLong(stats[5]);
        long policyViolations  = toLong(stats[6]);
        long manualReview      = toLong(stats[7]);

        long totalRouted = autoApproved + manualReview + policyViolations;
        int automationRate = totalRouted == 0 ? 0 : (int) Math.round((autoApproved * 100.0) / totalRouted);
        BigDecimal estimatedSavings = BigDecimal.valueOf(autoApproved).multiply(new BigDecimal("18.00"));

        return new DashboardResponse(pending, approved, rejected, needsRevision,
            approvedTotal, teamSize, autoApproved, policyViolations, manualReview,
            estimatedSavings, automationRate);
    }

    private static long toLong(Object value) {
        return value != null ? ((Number) value).longValue() : 0L;
    }

    // ── Policies ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PolicyResponse> listPolicies(User manager) {
        return policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(manager.getCompany().getId())
            .stream()
            .map(PolicyResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PolicyAuditLogResponse> listPolicyAuditLogs(User manager) {
        List<AuditLog> logs = auditRepository.findByCompanyIdAndEntityTypeOrderByCreatedAtDesc(
                manager.getCompany().getId(),
                "ExpensePolicy",
                PageRequest.of(0, 100)
            )
            .stream()
            .filter(log -> log.getAction() != null && log.getAction().startsWith("POLICY_"))
            .toList();

        Map<UUID, String> userNamesById = userRepository.findAllById(
                logs.stream()
                    .map(AuditLog::getUserId)
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

    // ── Payments ──────────────────────────────────────────────────────

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
                    user.getPixKey(),
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

    // ── Employee management ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EmployeeListResponse> listEmployees(User manager) {
        List<ExpenseStatus> pendingStatuses = List.of(
            ExpenseStatus.SUBMITTED, ExpenseStatus.AI_APPROVED, ExpenseStatus.PENDING_REVIEW
        );
        List<ExpenseStatus> approvedStatuses = List.of(
            ExpenseStatus.MANAGER_APPROVED, ExpenseStatus.FINANCE_APPROVED, ExpenseStatus.PAID
        );

        List<Object[]> aggregates = expenseRepository.aggregateStatsByManagerId(
            manager.getId(), pendingStatuses, approvedStatuses
        );

        Map<UUID, Object[]> statsByUserId = new java.util.HashMap<>();
        for (Object[] row : aggregates) {
            statsByUserId.put((UUID) row[0], row);
        }

        return userRepository.findByManagerIdAndActiveTrueOrderByNameAsc(manager.getId())
            .stream()
            .map(emp -> {
                Object[] stats = statsByUserId.get(emp.getId());
                long pending = stats != null ? ((Number) stats[1]).longValue() : 0L;
                long approved = stats != null ? ((Number) stats[2]).longValue() : 0L;
                BigDecimal total = stats != null ? new BigDecimal(stats[3].toString()) : BigDecimal.ZERO;
                return EmployeeListResponse.of(emp, pending, approved, total);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeProfileResponse getEmployee(User manager, UUID employeeId) {
        User employee = userRepository.findById(employeeId)
            .filter(u -> u.getManager() != null && u.getManager().getId().equals(manager.getId()))
            .orElseThrow(() -> BusinessException.notFound("Employee not found"));

        List<ExpenseStatus> pendingStatuses = List.of(
            ExpenseStatus.SUBMITTED, ExpenseStatus.AI_APPROVED, ExpenseStatus.PENDING_REVIEW
        );
        List<ExpenseStatus> approvedStatuses = List.of(
            ExpenseStatus.MANAGER_APPROVED, ExpenseStatus.FINANCE_APPROVED, ExpenseStatus.PAID
        );

        Pageable recent = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<ExpenseResponse> expenses = expenseRepository
            .findByUserIdAndManagerId(employeeId, manager.getId(), recent)
            .map(ExpenseResponse::from)
            .toList();

        return EmployeeProfileResponse.of(
            employee,
            expenseRepository.countByUserIdAndStatuses(employeeId, pendingStatuses),
            expenseRepository.countByUserIdAndStatuses(employeeId, approvedStatuses),
            expenseRepository.sumAmountByUserIdAndStatuses(employeeId, approvedStatuses),
            expenses
        );
    }

    @Transactional
    public EmployeeListResponse createEmployee(User manager, CreateEmployeeRequest request) {
        if (userService.existsByEmail(request.email())) {
            throw BusinessException.conflict("Email already in use");
        }

        User employee = new User(
            manager.getCompany(),
            request.name(),
            request.email(),
            passwordEncoder.encode(request.password()),
            UserRole.EMPLOYEE
        );
        employee.setManager(manager);
        employee.setPixKey(request.pixKey().trim());

        if (request.departmentId() != null) {
            Department dept = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> BusinessException.notFound("Department not found"));
            employee.setDepartment(dept);
        }

        User saved = userService.save(employee);
        auditService.log(manager.getCompany().getId(), manager.getId(),
            "EMPLOYEE_CREATED", "User", saved.getId(),
            Map.of("employeeName", saved.getName(), "employeeEmail", saved.getEmail()), null);

        return EmployeeListResponse.of(saved, 0L, 0L, BigDecimal.ZERO);
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
