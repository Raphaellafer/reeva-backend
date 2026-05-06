package com.reeva.backend.finance;

import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.*;
import com.reeva.backend.finance.dto.ProjectFinancialEntryRequest;
import com.reeva.backend.finance.dto.ProjectFinancialEntryResponse;
import com.reeva.backend.finance.dto.ProjectMonthlyTrendResponse;
import com.reeva.backend.finance.dto.ProjectPerformanceResponse;
import com.reeva.backend.project.Project;
import com.reeva.backend.project.ProjectRepository;
import com.reeva.backend.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class CfoProjectMetricsService {

    private static final BigDecimal MANUAL_REVIEW_SAVINGS = new BigDecimal("18.00");
    private static final List<ExpenseStatus> REIMBURSED_STATUSES = List.of(
        ExpenseStatus.MANAGER_APPROVED,
        ExpenseStatus.FINANCE_APPROVED,
        ExpenseStatus.PAID
    );

    private final ProjectRepository projectRepository;
    private final ProjectFinancialEntryRepository financialEntryRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpensePolicyRepository policyRepository;

    public CfoProjectMetricsService(ProjectRepository projectRepository,
                                    ProjectFinancialEntryRepository financialEntryRepository,
                                    ExpenseRepository expenseRepository,
                                    ExpensePolicyRepository policyRepository) {
        this.projectRepository = projectRepository;
        this.financialEntryRepository = financialEntryRepository;
        this.expenseRepository = expenseRepository;
        this.policyRepository = policyRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectPerformanceResponse> listPerformance(User currentUser, LocalDate from, LocalDate to) {
        DateRange range = normalize(from, to);
        return projectRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(currentUser.getCompany().getId())
            .stream()
            .map(project -> performanceFor(currentUser, project, range))
            .toList();
    }

    @Transactional(readOnly = true)
    public ProjectPerformanceResponse getPerformance(User currentUser, UUID projectId, LocalDate from, LocalDate to) {
        DateRange range = normalize(from, to);
        Project project = getCompanyProject(currentUser, projectId);
        return performanceFor(currentUser, project, range);
    }

    @Transactional(readOnly = true)
    public List<ProjectFinancialEntryResponse> listEntries(User currentUser, UUID projectId, LocalDate from, LocalDate to) {
        DateRange range = normalize(from, to);
        Project project = getCompanyProject(currentUser, projectId);
        return financialEntryRepository
            .findByProjectIdAndCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
                project.getId(), currentUser.getCompany().getId(), range.from(), range.to())
            .stream()
            .map(ProjectFinancialEntryResponse::from)
            .toList();
    }

    @Transactional
    public ProjectFinancialEntryResponse createEntry(User currentUser, UUID projectId, ProjectFinancialEntryRequest request) {
        Project project = getCompanyProject(currentUser, projectId);
        FinancialEntrySource source = request.source() != null ? request.source() : FinancialEntrySource.MANUAL;
        ProjectFinancialEntry entry = new ProjectFinancialEntry(
            currentUser.getCompany(),
            project,
            request.type(),
            request.category(),
            request.description(),
            request.amount(),
            request.entryDate(),
            source,
            currentUser
        );
        return ProjectFinancialEntryResponse.from(financialEntryRepository.save(entry));
    }

    private ProjectPerformanceResponse performanceFor(User currentUser, Project project, DateRange range) {
        UUID companyId = currentUser.getCompany().getId();
        List<ProjectFinancialEntry> entries = financialEntryRepository
            .findByProjectIdAndCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
                project.getId(), companyId, range.from(), range.to());
        List<Expense> expenses = expenseRepository.findByProjectForCfoMetrics(
            companyId, project.getId(), range.from(), range.to());
        Map<ExpenseCategory, ExpensePolicy> policies = policiesByCategory(companyId);

        BigDecimal revenue = sumEntries(entries, FinancialEntryType.REVENUE);
        BigDecimal generalExpenses = sumEntries(entries, FinancialEntryType.GENERAL_EXPENSE);
        BigDecimal reimbursableExpenses = expenses.stream()
            .filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus()))
            .map(Expense::getAmount)
            .map(CfoMetricCalculator::money)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = CfoMetricCalculator.totalCost(generalExpenses, reimbursableExpenses);
        BigDecimal profit = CfoMetricCalculator.profit(revenue, totalCost);
        BigDecimal avoidableLosses = avoidableLosses(expenses, policies);
        long autoApprovedCount = expenses.stream()
            .filter(expense -> expense.getAiDecision() == AiDecision.AUTO_APPROVED
                || expense.getStatus() == ExpenseStatus.AI_APPROVED)
            .count();
        BigDecimal aiSavings = avoidableLosses.add(MANUAL_REVIEW_SAVINGS.multiply(BigDecimal.valueOf(autoApprovedCount)));
        long reimbursedCount = expenses.stream()
            .filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus()))
            .count();
        int complianceRate = percentage(
            expenses.stream().filter(expense -> !Boolean.FALSE.equals(expense.getPolicyCompliant())).count(),
            expenses.size()
        );
        int autoApprovalRate = percentage(autoApprovedCount, expenses.size());

        return new ProjectPerformanceResponse(
            project.getId(),
            project.getName(),
            project.getCode(),
            revenue,
            generalExpenses,
            reimbursableExpenses,
            totalCost,
            profit,
            CfoMetricCalculator.margin(revenue, profit),
            CfoMetricCalculator.roi(totalCost, profit),
            avoidableLosses,
            aiSavings,
            reimbursedCount,
            expenses.size(),
            autoApprovedCount,
            complianceRate,
            autoApprovalRate,
            monthlyTrend(range, entries, expenses)
        );
    }

    private Project getCompanyProject(User currentUser, UUID projectId) {
        return projectRepository.findByIdAndCompanyIdAndActiveTrue(projectId, currentUser.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Project not found"));
    }

    private Map<ExpenseCategory, ExpensePolicy> policiesByCategory(UUID companyId) {
        Map<ExpenseCategory, ExpensePolicy> policies = new EnumMap<>(ExpenseCategory.class);
        for (ExpensePolicy policy : policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(companyId)) {
            policies.put(policy.getCategory(), policy);
        }
        return policies;
    }

    private BigDecimal avoidableLosses(List<Expense> expenses, Map<ExpenseCategory, ExpensePolicy> policies) {
        BigDecimal total = BigDecimal.ZERO;
        for (Expense expense : expenses) {
            if (isRejected(expense) || isPolicyRejected(expense)) {
                total = total.add(CfoMetricCalculator.money(expense.getAmount()));
                continue;
            }
            ExpensePolicy policy = policies.get(expense.getCategory());
            if (policy != null && policy.getMaxAmount() != null
                && CfoMetricCalculator.money(expense.getAmount()).compareTo(policy.getMaxAmount()) > 0) {
                total = total.add(expense.getAmount().subtract(policy.getMaxAmount()));
            } else if (Boolean.FALSE.equals(expense.getPolicyCompliant())) {
                total = total.add(CfoMetricCalculator.money(expense.getAmount()));
            }
        }
        return total;
    }

    private boolean isRejected(Expense expense) {
        return expense.getStatus() == ExpenseStatus.MANAGER_REJECTED
            || expense.getStatus() == ExpenseStatus.FINANCE_REJECTED;
    }

    private boolean isPolicyRejected(Expense expense) {
        return expense.getAiDecision() == AiDecision.REJECTED_BY_POLICY
            || (Boolean.FALSE.equals(expense.getPolicyCompliant())
                && (expense.getStatus() == ExpenseStatus.MANAGER_REJECTED
                    || expense.getStatus() == ExpenseStatus.FINANCE_REJECTED));
    }

    private List<ProjectMonthlyTrendResponse> monthlyTrend(DateRange range, List<ProjectFinancialEntry> entries,
                                                           List<Expense> expenses) {
        YearMonth first = YearMonth.from(range.from());
        YearMonth last = YearMonth.from(range.to());
        return Stream.iterate(first, month -> !month.isAfter(last), month -> month.plusMonths(1))
            .map(month -> {
                LocalDate monthStart = month.atDay(1);
                LocalDate monthEnd = month.atEndOfMonth();
                BigDecimal revenue = sumEntriesBetween(entries, FinancialEntryType.REVENUE, monthStart, monthEnd);
                BigDecimal generalExpenses = sumEntriesBetween(entries, FinancialEntryType.GENERAL_EXPENSE, monthStart, monthEnd);
                BigDecimal reimbursements = expenses.stream()
                    .filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus()))
                    .filter(expense -> !expense.getExpenseDate().isBefore(monthStart)
                        && !expense.getExpenseDate().isAfter(monthEnd))
                    .map(Expense::getAmount)
                    .map(CfoMetricCalculator::money)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalCost = CfoMetricCalculator.totalCost(generalExpenses, reimbursements);
                BigDecimal profit = CfoMetricCalculator.profit(revenue, totalCost);
                return new ProjectMonthlyTrendResponse(
                    month.toString(), revenue, generalExpenses, reimbursements, totalCost, profit);
            })
            .toList();
    }

    private BigDecimal sumEntries(List<ProjectFinancialEntry> entries, FinancialEntryType type) {
        return entries.stream()
            .filter(entry -> entry.getType() == type)
            .map(ProjectFinancialEntry::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumEntriesBetween(List<ProjectFinancialEntry> entries, FinancialEntryType type,
                                         LocalDate from, LocalDate to) {
        return entries.stream()
            .filter(entry -> entry.getType() == type)
            .filter(entry -> !entry.getEntryDate().isBefore(from) && !entry.getEntryDate().isAfter(to))
            .map(ProjectFinancialEntry::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private int percentage(long part, long total) {
        if (total == 0) return 0;
        return (int) Math.round((part * 100.0) / total);
    }

    private DateRange normalize(LocalDate from, LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusMonths(5).withDayOfMonth(1);
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw BusinessException.badRequest("from must be before or equal to to");
        }
        return new DateRange(effectiveFrom, effectiveTo);
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
