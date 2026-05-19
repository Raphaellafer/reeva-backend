package com.reeva.backend.manager;

import com.reeva.backend.common.audit.AuditLog;
import com.reeva.backend.common.audit.AuditRepository;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.company.Company;
import com.reeva.backend.company.CompanyRepository;
import com.reeva.backend.company.Department;
import com.reeva.backend.company.DepartmentRepository;
import com.reeva.backend.company.PaymentFrequency;
import com.reeva.backend.expense.*;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.finance.BankAccount;
import com.reeva.backend.finance.BankAccountRepository;
import com.reeva.backend.finance.CashTransaction;
import com.reeva.backend.finance.CashTransactionCategory;
import com.reeva.backend.finance.CashTransactionRepository;
import com.reeva.backend.finance.CashTransactionSource;
import com.reeva.backend.finance.CashTransactionType;
import com.reeva.backend.finance.dto.BankAccountResponse;
import com.reeva.backend.manager.dto.CreateEmployeeRequest;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.EmployeeListResponse;
import com.reeva.backend.manager.dto.EmployeeProfileResponse;
import com.reeva.backend.manager.dto.PaymentBatchResponse;
import com.reeva.backend.manager.dto.PaymentScheduleRequest;
import com.reeva.backend.manager.dto.PaymentScheduleResponse;
import com.reeva.backend.manager.dto.PolicyAuditLogResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.manager.dto.ReviewRequest;
import com.reeva.backend.manager.dto.MarkPaymentRequest;
import com.reeva.backend.user.User;
import com.reeva.backend.user.CpfUtils;
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
    private static final BigDecimal DEFAULT_MONTHLY_BUSINESS_DAYS = BigDecimal.valueOf(22);


    private final ExpenseRepository expenseRepository;
    private final ExpensePolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;
    private final AuditRepository auditRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CashTransactionRepository cashTransactionRepository;
    private final CompanyRepository companyRepository;

    public ManagerService(ExpenseRepository expenseRepository,
                          ExpensePolicyRepository policyRepository,
                          UserRepository userRepository,
                          UserService userService,
                          AuditService auditService,
                          AuditRepository auditRepository,
                          PasswordEncoder passwordEncoder,
                          DepartmentRepository departmentRepository,
                          BankAccountRepository bankAccountRepository,
                          CashTransactionRepository cashTransactionRepository,
                          CompanyRepository companyRepository) {
        this.expenseRepository = expenseRepository;
        this.policyRepository = policyRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
        this.auditRepository = auditRepository;
        this.passwordEncoder = passwordEncoder;
        this.departmentRepository = departmentRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.cashTransactionRepository = cashTransactionRepository;
        this.companyRepository = companyRepository;
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
        long teamSize = userRepository.countByManagerId(manager.getId());

        long pending = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_REVIEW));
        long approved = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.MANAGER_APPROVED, ExpenseStatus.FINANCE_APPROVED, ExpenseStatus.PAID));
        long rejected = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.MANAGER_REJECTED));
        long needsRevision = expenseRepository.countByManagerIdAndStatuses(manager.getId(),
            List.of(ExpenseStatus.NEEDS_REVISION));
        BigDecimal approvedTotal = expenseRepository.sumAmountByManagerIdAndStatus(
            manager.getId(), ExpenseStatus.MANAGER_APPROVED);
        if (approvedTotal == null) {
            approvedTotal = BigDecimal.ZERO;
        }
        long autoApproved = expenseRepository.countByManagerIdAndAiDecision(
            manager.getId(), AiDecision.AUTO_APPROVED);
        long policyViolations = expenseRepository.countPolicyViolationsByManagerId(manager.getId());
        long manualReview = expenseRepository.countByManagerIdAndAiDecision(
            manager.getId(), AiDecision.READY_FOR_MANAGER)
            + expenseRepository.countByManagerIdAndAiDecision(manager.getId(), AiDecision.PENDING_MANUAL_REVIEW);

        long totalRouted = autoApproved + manualReview + policyViolations;
        int automationRate = totalRouted == 0 ? 0 : (int) Math.round((autoApproved * 100.0) / totalRouted);
        BigDecimal estimatedSavings = BigDecimal.valueOf(autoApproved).multiply(new BigDecimal("18.00"));

        return new DashboardResponse(pending, approved, rejected, needsRevision,
            approvedTotal, teamSize, autoApproved, policyViolations, manualReview,
            estimatedSavings, automationRate);
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
        String category = CategoryUtils.normalize(request.category());
        if (category == null) {
            throw BusinessException.badRequest("Categoria invalida");
        }
        NormalizedPolicyLimits limits = normalizePolicyLimits(request);
        var existing = policyRepository.findByCompanyIdAndCategory(manager.getCompany().getId(), category);
        boolean created = existing.isEmpty();
        boolean reactivated = existing.map(policy -> !policy.isActive()).orElse(false);
        ExpensePolicy policy = existing
            .orElseGet(() -> new ExpensePolicy(manager.getCompany(), category, limits.maxAmount()));
        Map<String, Object> before = created ? Map.of() : policySnapshot(policy);

        policy.setMaxAmount(limits.maxAmount());
        policy.setDailyLimit(limits.dailyLimit());
        policy.setMonthlyLimit(limits.monthlyLimit());
        policy.setRequiresReceipt(request.requiresReceipt());
        policy.setAutoApprovalMinScore(
            request.autoApprovalMinScore() != null ? request.autoApprovalMinScore() : (short) 90
        );
        policy.setDescription(request.description());
        policy.setActive(true);

        ExpensePolicy saved = policyRepository.save(policy);
        String action = created ? "POLICY_CREATED" : reactivated ? "POLICY_REACTIVATED" : "POLICY_UPDATED";
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("category", saved.getCategory());
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

    @Transactional
    public void deletePolicy(User manager, UUID policyId) {
        ExpensePolicy policy = policyRepository.findById(policyId)
            .filter(item -> item.getCompany().getId().equals(manager.getCompany().getId()))
            .orElseThrow(() -> BusinessException.notFound("Politica nao encontrada"));
        if (!policy.isActive()) {
            return;
        }

        Map<String, Object> before = policySnapshot(policy);
        policy.setActive(false);
        ExpensePolicy saved = policyRepository.save(policy);

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("category", saved.getCategory());
        metadata.put("changedByName", manager.getName());
        metadata.put("changedByEmail", manager.getEmail());
        metadata.put("before", before);
        metadata.put("after", policySnapshot(saved));

        auditRepository.save(
            AuditLog.builder()
                .companyId(manager.getCompany().getId())
                .userId(manager.getId())
                .action("POLICY_DELETED")
                .entityType("ExpensePolicy")
                .entityId(saved.getId())
                .metadata(metadata)
                .build()
        );
    }

    private NormalizedPolicyLimits normalizePolicyLimits(PolicyUpdateRequest request) {
        BigDecimal maxAmount = request.maxAmount();
        BigDecimal dailyLimit = request.dailyLimit() != null ? request.dailyLimit() : maxAmount;
        if (dailyLimit.compareTo(maxAmount) < 0) {
            throw BusinessException.badRequest("Limite diario nao pode ser menor que o limite por nota");
        }

        BigDecimal minimumMonthlyLimit = dailyLimit.multiply(DEFAULT_MONTHLY_BUSINESS_DAYS);
        BigDecimal monthlyLimit = request.monthlyLimit() != null ? request.monthlyLimit() : minimumMonthlyLimit;
        if (monthlyLimit.compareTo(minimumMonthlyLimit) < 0) {
            throw BusinessException.badRequest(
                "Limite mensal nao pode ser menor que o limite diario multiplicado por 22 dias uteis"
            );
        }

        return new NormalizedPolicyLimits(maxAmount, dailyLimit, monthlyLimit);
    }

    private Map<String, Object> policySnapshot(ExpensePolicy policy) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("category", policy.getCategory());
        snapshot.put("maxAmount", policy.getMaxAmount());
        snapshot.put("dailyLimit", policy.getDailyLimit());
        snapshot.put("monthlyLimit", policy.getMonthlyLimit());
        snapshot.put("requiresReceipt", policy.isRequiresReceipt());
        snapshot.put("autoApprovalMinScore", policy.getAutoApprovalMinScore());
        snapshot.put("description", policy.getDescription());
        snapshot.put("active", policy.isActive());
        return snapshot;
    }

    private record NormalizedPolicyLimits(BigDecimal maxAmount, BigDecimal dailyLimit, BigDecimal monthlyLimit) {}

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

    @Transactional(readOnly = true)
    public PaymentScheduleResponse paymentSchedule(User manager) {
        Company company = companyRepository.findById(manager.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Empresa nao encontrada"));
        return PaymentScheduleResponse.from(company);
    }

    @Transactional
    public PaymentScheduleResponse updatePaymentSchedule(User manager, PaymentScheduleRequest request) {
        if (request.frequency() == null) {
            throw BusinessException.badRequest("Informe a frequencia de pagamento");
        }
        if (request.frequency() == PaymentFrequency.WEEKLY && request.weekday() == null) {
            throw BusinessException.badRequest("Informe o dia da semana para pagamento semanal");
        }
        if (request.frequency() == PaymentFrequency.MONTHLY && request.dayOfMonth() == null) {
            throw BusinessException.badRequest("Informe o dia do mes para pagamento mensal");
        }

        Company company = companyRepository.findById(manager.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Empresa nao encontrada"));
        company.setPaymentFrequency(request.frequency());
        company.setPaymentWeekday(request.frequency() == PaymentFrequency.WEEKLY ? request.weekday() : null);
        company.setPaymentDayOfMonth(request.frequency() == PaymentFrequency.MONTHLY ? request.dayOfMonth() : null);
        return PaymentScheduleResponse.from(companyRepository.save(company));
    }

    // ── Employee management ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BankAccountResponse> bankAccounts(User manager) {
        return bankAccountRepository.findByCompanyIdAndActiveTrueOrderByAccountNameAsc(manager.getCompany().getId())
            .stream()
            .map(BankAccountResponse::from)
            .toList();
    }

    @Transactional
    public ExpenseResponse markExpenseAsPaid(User manager, UUID expenseId, MarkPaymentRequest request) {
        Expense expense = expenseRepository.findByIdAndManagerId(expenseId, manager.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));

        if (expense.getStatus() != ExpenseStatus.MANAGER_APPROVED
            && expense.getStatus() != ExpenseStatus.FINANCE_APPROVED) {
            throw BusinessException.badRequest("Somente reembolsos aprovados podem ser marcados como pagos");
        }
        if (expense.getAmount() == null || expense.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw BusinessException.badRequest("Reembolso sem valor valido nao pode ser marcado como pago");
        }
        if (cashTransactionRepository.findByExpenseId(expense.getId()).isPresent()) {
            throw BusinessException.badRequest("Este reembolso ja possui lancamento de caixa");
        }

        BankAccount account = bankAccountRepository
            .findByIdAndCompanyIdAndActiveTrue(request.bankAccountId(), manager.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Conta bancaria nao encontrada"));

        BigDecimal amount = expense.getAmount();
        account.apply(amount.negate());

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.PAID);
        expense.setPaidAt(Instant.now());
        expense.setPaymentReference(request.paymentReference());
        expense.getStatusHistory().add(new ExpenseStatusHistory(
            expense, from, ExpenseStatus.PAID, manager,
            "Pagamento confirmado: " + (request.paymentReference() == null || request.paymentReference().isBlank()
                ? "sem referencia" : request.paymentReference())
        ));

        CashTransaction transaction = new CashTransaction(
            manager.getCompany(), account, expense.getProject(), expense, request.paidDate(),
            "Reembolso pago: " + expense.getTitle(), CashTransactionType.OUTFLOW,
            CashTransactionCategory.REIMBURSEMENT, amount, account.getCurrentBalance(),
            CashTransactionSource.REIMBURSEMENT_PAYMENT, request.paymentReference(), manager
        );

        cashTransactionRepository.save(transaction);
        bankAccountRepository.save(account);
        Expense saved = expenseRepository.save(expense);
        auditService.log(manager.getCompany().getId(), manager.getId(),
            "EXPENSE_PAID", "Expense", expenseId,
            Map.of("from", from.name(), "bankAccountId", account.getId(),
                "amount", amount, "paidDate", request.paidDate()), null);
        return ExpenseResponse.from(saved);
    }

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
        String normalizedCpf = CpfUtils.normalize(request.cpf());
        if (!CpfUtils.isValid(normalizedCpf)) {
            throw BusinessException.badRequest("CPF invalido");
        }
        if (userRepository.existsByCpf(normalizedCpf)) {
            throw BusinessException.conflict("Ja existe um funcionario com este CPF");
        }
        String normalizedPhone = request.phoneNumber().replaceAll("\\D", "");
        if (normalizedPhone.length() < 6) {
            throw BusinessException.badRequest("Numero de telefone invalido");
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
        employee.setCpf(normalizedCpf);
        employee.setPhoneCountryCode(request.phoneCountryCode().trim().toUpperCase());
        employee.setPhoneNumber(normalizedPhone);

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
