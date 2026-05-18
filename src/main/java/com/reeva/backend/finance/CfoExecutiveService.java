package com.reeva.backend.finance;

import com.reeva.backend.expense.*;
import com.reeva.backend.finance.dto.CfoComplianceResponse;
import com.reeva.backend.finance.dto.CfoExpenseResponse;
import com.reeva.backend.finance.dto.CfoOverviewResponse;
import com.reeva.backend.finance.dto.CfoRecommendationResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CfoExecutiveService {

    private static final BigDecimal MANUAL_REVIEW_SAVINGS = new BigDecimal("18.00");
    private static final short LOW_OCR_SCORE = 85;
    private static final List<ExpenseStatus> REIMBURSED_STATUSES = List.of(
        ExpenseStatus.PAID
    );

    private final ExpenseRepository expenseRepository;
    private final ExpensePolicyRepository policyRepository;

    public CfoExecutiveService(ExpenseRepository expenseRepository, ExpensePolicyRepository policyRepository) {
        this.expenseRepository = expenseRepository;
        this.policyRepository = policyRepository;
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> policies(User currentUser) {
        return policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(currentUser.getCompany().getId())
            .stream()
            .map(PolicyResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public CfoOverviewResponse overview(User currentUser, LocalDate from, LocalDate to) {
        DateRange range = normalize(from, to);
        UUID companyId = currentUser.getCompany().getId();
        List<Expense> expenses = expenseRepository.findByCompanyForCfoMetrics(companyId, range.from(), range.to());
        Map<String, ExpensePolicy> policies = policiesByCategory(companyId);

        BigDecimal totalReimbursed = sum(expenses.stream()
            .filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus()))
            .toList());
        BigDecimal totalSubmitted = sum(expenses.stream()
            .filter(expense -> expense.getStatus() != ExpenseStatus.DRAFT
                && expense.getStatus() != ExpenseStatus.CANCELLED)
            .toList());
        BigDecimal avoidableLosses = expenses.stream()
            .map(expense -> avoidableLoss(expense, policies))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long autoApproved = expenses.stream().filter(this::isAutoApproved).count();
        BigDecimal aiSavings = avoidableLosses.add(MANUAL_REVIEW_SAVINGS.multiply(BigDecimal.valueOf(autoApproved)));

        long policyViolations = expenses.stream().filter(this::hasPolicyViolation).count();
        long duplicates = expenses.stream().filter(this::isDuplicateRejected).count();
        long lowOcr = expenses.stream().filter(this::hasLowOcrConfidence).count();

        return new CfoOverviewResponse(
            totalReimbursed,
            totalSubmitted,
            avoidableLosses,
            aiSavings,
            percentage(expenses.stream().filter(expense -> !hasPolicyViolation(expense)).count(), expenses.size()),
            percentage(autoApproved, expenses.size()),
            expenses.size(),
            duplicates,
            policyViolations,
            lowOcr,
            projectRiskRanking(expenses, policies),
            categorySpend(expenses, policies),
            statusDistribution(expenses),
            monthlyTrend(range, expenses, policies),
            recommendations(expenses, policies)
        );
    }

    @Transactional(readOnly = true)
    public Page<CfoExpenseResponse> expenses(User currentUser, ExpenseStatus status, UUID projectId,
                                             String category, Boolean duplicate, Boolean fiscalInvalid,
                                             Boolean policyViolation, Boolean lowOcr, LocalDate from, LocalDate to,
                                             Pageable pageable) {
        DateRange range = normalize(from, to);
        return expenseRepository.findByCompanyForCfoExpenses(
            currentUser.getCompany().getId(), status, projectId, category, duplicate, fiscalInvalid,
            policyViolation, lowOcr, range.from(), range.to(), pageable
        ).map(CfoExpenseResponse::from);
    }

    @Transactional(readOnly = true)
    public CfoComplianceResponse compliance(User currentUser, LocalDate from, LocalDate to) {
        DateRange range = normalize(from, to);
        UUID companyId = currentUser.getCompany().getId();
        List<Expense> expenses = expenseRepository.findByCompanyForCfoMetrics(companyId, range.from(), range.to());
        Map<String, ExpensePolicy> policies = policiesByCategory(companyId);

        BigDecimal totalAvoided = expenses.stream()
            .map(expense -> avoidableLoss(expense, policies))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CfoComplianceResponse(
            expenses.size(),
            expenses.stream().filter(this::hasPolicyViolation).count(),
            expenses.stream().filter(this::isDuplicateRejected).count(),
            expenses.stream().filter(this::hasLowOcrConfidence).count(),
            totalAvoided,
            percentage(expenses.stream().filter(expense -> !hasPolicyViolation(expense)).count(), expenses.size()),
            riskyEmployees(expenses, policies),
            riskyProjects(expenses, policies),
            riskyCategories(expenses, policies)
        );
    }

    private List<CfoOverviewResponse.ProjectRiskItem> projectRiskRanking(
        List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        return expenses.stream()
            .collect(Collectors.groupingBy(expense -> new ProjectKey(
                expense.getProject().getId(), expense.getProject().getName(), expense.getProject().getCode()
            )))
            .entrySet()
            .stream()
            .map(entry -> {
                List<Expense> rows = entry.getValue();
                BigDecimal losses = rows.stream()
                    .map(expense -> avoidableLoss(expense, policies))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                int compliance = percentage(rows.stream().filter(expense -> !hasPolicyViolation(expense)).count(), rows.size());
                return new CfoOverviewResponse.ProjectRiskItem(
                    entry.getKey().id(),
                    entry.getKey().name(),
                    entry.getKey().code(),
                    sum(rows.stream().filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus())).toList()),
                    losses,
                    compliance,
                    riskScore(rows, losses)
                );
            })
            .sorted(Comparator.comparing(CfoOverviewResponse.ProjectRiskItem::riskScore).reversed())
            .limit(6)
            .toList();
    }

    private List<CfoOverviewResponse.CategorySpendItem> categorySpend(
        List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        return expenses.stream()
            .collect(Collectors.groupingBy(Expense::getCategory))
            .entrySet()
            .stream()
            .map(entry -> new CfoOverviewResponse.CategorySpendItem(
                entry.getKey(),
                sum(entry.getValue()),
                entry.getValue().size(),
                entry.getValue().stream()
                    .map(expense -> avoidableLoss(expense, policies))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
            ))
            .sorted(Comparator.comparing(CfoOverviewResponse.CategorySpendItem::amount).reversed())
            .toList();
    }

    private List<CfoOverviewResponse.StatusDistributionItem> statusDistribution(List<Expense> expenses) {
        return expenses.stream()
            .collect(Collectors.groupingBy(Expense::getStatus))
            .entrySet()
            .stream()
            .map(entry -> new CfoOverviewResponse.StatusDistributionItem(entry.getKey(), entry.getValue().size(), sum(entry.getValue())))
            .sorted(Comparator.comparing(item -> item.status().name()))
            .toList();
    }

    private List<CfoOverviewResponse.MonthlyReimbursementTrendItem> monthlyTrend(
        DateRange range, List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        YearMonth first = YearMonth.from(range.from());
        YearMonth last = YearMonth.from(range.to());
        return java.util.stream.Stream.iterate(first, month -> !month.isAfter(last), month -> month.plusMonths(1))
            .map(month -> {
                LocalDate start = month.atDay(1);
                LocalDate end = month.atEndOfMonth();
                List<Expense> rows = expenses.stream()
                    .filter(expense -> !expense.getExpenseDate().isBefore(start) && !expense.getExpenseDate().isAfter(end))
                    .toList();
                return new CfoOverviewResponse.MonthlyReimbursementTrendItem(
                    month.toString(),
                    sum(rows.stream().filter(expense -> REIMBURSED_STATUSES.contains(expense.getStatus())).toList()),
                    sum(rows),
                    rows.stream().map(expense -> avoidableLoss(expense, policies)).reduce(BigDecimal.ZERO, BigDecimal::add)
                );
            })
            .toList();
    }

    private List<CfoRecommendationResponse> recommendations(List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        List<CfoRecommendationResponse> items = new ArrayList<>();
        projectRiskRanking(expenses, policies).stream().findFirst().ifPresent(project -> {
            if (project.avoidableLosses().compareTo(BigDecimal.ZERO) > 0) {
                items.add(new CfoRecommendationResponse(
                    "CONTROL",
                    "Investigar perdas evitaveis no projeto " + project.projectName(),
                    "Este projeto concentra perdas evitaveis em reembolsos reais no periodo analisado.",
                    "Revisar limites, categorias e excecoes antes do proximo fechamento.",
                    project.riskScore() >= 70 ? "HIGH" : "MEDIUM",
                    project.avoidableLosses(),
                    project.projectId(),
                    project.projectName()
                ));
            }
        });

        categorySpend(expenses, policies).stream()
            .filter(category -> category.avoidableLosses().compareTo(BigDecimal.ZERO) > 0)
            .findFirst()
            .ifPresent(category -> items.add(new CfoRecommendationResponse(
                "POLICY",
                "Revisar politica de " + category.category(),
                "A categoria aparece com perdas evitaveis ou violacoes recorrentes.",
                "Ajustar limite, regra de comprovante ou roteamento para revisao.",
                "MEDIUM",
                category.avoidableLosses(),
                null,
                null
            )));

        long lowOcr = expenses.stream().filter(this::hasLowOcrConfidence).count();
        if (lowOcr > 0) {
            items.add(new CfoRecommendationResponse(
                "OCR",
                "Melhorar qualidade das notas enviadas",
                lowOcr + " nota(s) tiveram OCR baixo ou falha de leitura.",
                "Orientar nova foto quando valor, fornecedor ou data nao forem lidos com confianca.",
                "MEDIUM",
                BigDecimal.ZERO,
                null,
                null
            ));
        }

        long autoApproved = expenses.stream().filter(this::isAutoApproved).count();
        if (autoApproved > 0) {
            items.add(new CfoRecommendationResponse(
                "AUTOMATION",
                "Manter automacao onde ha baixo risco",
                "A IA ja reduziu trabalho manual em despesas elegiveis e bem documentadas.",
                "Preservar autoaprovacao para categorias/projetos com alto compliance.",
                "LOW",
                MANUAL_REVIEW_SAVINGS.multiply(BigDecimal.valueOf(autoApproved)),
                null,
                null
            ));
        }

        return items.stream().limit(5).toList();
    }

    private List<CfoComplianceResponse.RiskyEmployeeItem> riskyEmployees(
        List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        return expenses.stream()
            .collect(Collectors.groupingBy(expense -> new EmployeeKey(
                expense.getUser().getId(),
                expense.getUser().getName(),
                expense.getUser().getDepartment() != null ? expense.getUser().getDepartment().getName() : null,
                expense.getUser().getManager() != null ? expense.getUser().getManager().getName() : null
            )))
            .entrySet()
            .stream()
            .map(entry -> {
                List<Expense> rows = entry.getValue();
                BigDecimal avoided = rows.stream().map(expense -> avoidableLoss(expense, policies)).reduce(BigDecimal.ZERO, BigDecimal::add);
                int score = riskScore(rows, avoided);
                return new CfoComplianceResponse.RiskyEmployeeItem(
                    entry.getKey().id(), entry.getKey().name(), entry.getKey().departmentName(), entry.getKey().managerName(),
                    rows.size(), sum(rows), rows.stream().filter(this::hasPolicyViolation).count(),
                    rows.stream().filter(this::isDuplicateRejected).count(), rows.stream().filter(this::hasLowOcrConfidence).count(),
                    avoided, score, riskLevel(score)
                );
            })
            .sorted(Comparator.comparing(CfoComplianceResponse.RiskyEmployeeItem::riskScore).reversed())
            .limit(10)
            .toList();
    }

    private List<CfoComplianceResponse.RiskyProjectItem> riskyProjects(
        List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        return expenses.stream()
            .collect(Collectors.groupingBy(expense -> new ProjectKey(
                expense.getProject().getId(), expense.getProject().getName(), expense.getProject().getCode()
            )))
            .entrySet()
            .stream()
            .map(entry -> {
                List<Expense> rows = entry.getValue();
                BigDecimal avoided = rows.stream().map(expense -> avoidableLoss(expense, policies)).reduce(BigDecimal.ZERO, BigDecimal::add);
                int score = riskScore(rows, avoided);
                return new CfoComplianceResponse.RiskyProjectItem(
                    entry.getKey().id(), entry.getKey().name(), entry.getKey().code(), rows.size(), sum(rows),
                    rows.stream().filter(this::hasPolicyViolation).count(),
                    rows.stream().filter(this::isDuplicateRejected).count(), avoided, score, riskLevel(score)
                );
            })
            .sorted(Comparator.comparing(CfoComplianceResponse.RiskyProjectItem::riskScore).reversed())
            .limit(10)
            .toList();
    }

    private List<CfoComplianceResponse.RiskyCategoryItem> riskyCategories(
        List<Expense> expenses, Map<String, ExpensePolicy> policies) {
        return expenses.stream()
            .collect(Collectors.groupingBy(Expense::getCategory))
            .entrySet()
            .stream()
            .map(entry -> {
                List<Expense> rows = entry.getValue();
                BigDecimal avoided = rows.stream().map(expense -> avoidableLoss(expense, policies)).reduce(BigDecimal.ZERO, BigDecimal::add);
                int score = riskScore(rows, avoided);
                return new CfoComplianceResponse.RiskyCategoryItem(
                    entry.getKey(), rows.size(), sum(rows), rows.stream().filter(this::hasPolicyViolation).count(),
                    avoided, score, riskLevel(score)
                );
            })
            .sorted(Comparator.comparing(CfoComplianceResponse.RiskyCategoryItem::riskScore).reversed())
            .toList();
    }

    private Map<String, ExpensePolicy> policiesByCategory(UUID companyId) {
        Map<String, ExpensePolicy> policies = new java.util.HashMap<>();
        for (ExpensePolicy policy : policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(companyId)) {
            policies.put(policy.getCategory(), policy);
        }
        return policies;
    }

    private BigDecimal avoidableLoss(Expense expense, Map<String, ExpensePolicy> policies) {
        BigDecimal amount = CfoMetricCalculator.money(expense.getAmount());
        if (isDuplicateRejected(expense) || isPolicyRejected(expense)) {
            return amount;
        }

        ExpensePolicy policy = policies.get(expense.getCategory());
        if (policy != null && policy.getMaxAmount() != null && amount.compareTo(policy.getMaxAmount()) > 0) {
            return amount.subtract(policy.getMaxAmount());
        }

        if (Boolean.FALSE.equals(expense.getPolicyCompliant())
            && expense.getAiDecision() != AiDecision.REJECTED_BY_FISCAL_VALIDATION) {
            return amount;
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal sum(List<Expense> expenses) {
        return expenses.stream()
            .map(Expense::getAmount)
            .map(CfoMetricCalculator::money)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean isAutoApproved(Expense expense) {
        return expense.getAiDecision() == AiDecision.AUTO_APPROVED || expense.getStatus() == ExpenseStatus.AI_APPROVED;
    }

    private boolean hasPolicyViolation(Expense expense) {
        return (Boolean.FALSE.equals(expense.getPolicyCompliant())
                && expense.getAiDecision() != AiDecision.REJECTED_BY_FISCAL_VALIDATION)
            || expense.getAiDecision() == AiDecision.REJECTED_BY_POLICY;
    }

    private boolean isPolicyRejected(Expense expense) {
        return expense.getAiDecision() == AiDecision.REJECTED_BY_POLICY
            || (Boolean.FALSE.equals(expense.getPolicyCompliant())
                && expense.getAiDecision() != AiDecision.REJECTED_BY_FISCAL_VALIDATION
                && (expense.getStatus() == ExpenseStatus.MANAGER_REJECTED
                    || expense.getStatus() == ExpenseStatus.FINANCE_REJECTED));
    }

    private boolean isDuplicateRejected(Expense expense) {
        return expense.getAiDecision() == AiDecision.DUPLICATE_REJECTED || expense.getDuplicateOfExpense() != null;
    }

    private boolean hasLowOcrConfidence(Expense expense) {
        return expense.getStatus() == ExpenseStatus.OCR_FAILED
            || (expense.getAiScore() != null && expense.getAiScore() < LOW_OCR_SCORE);
    }

    private int riskScore(List<Expense> expenses, BigDecimal avoidableLoss) {
        int score = 0;
        score += expenses.stream().filter(this::isDuplicateRejected).count() * 35;
        score += expenses.stream().filter(this::hasPolicyViolation).count() * 18;
        score += expenses.stream().filter(this::hasLowOcrConfidence).count() * 10;
        if (avoidableLoss.compareTo(new BigDecimal("1000")) > 0) score += 25;
        else if (avoidableLoss.compareTo(BigDecimal.ZERO) > 0) score += 10;
        return Math.min(100, score);
    }

    private String riskLevel(int score) {
        if (score >= 70) return "Alto";
        if (score >= 35) return "Medio";
        return "Baixo";
    }

    private int percentage(long part, long total) {
        if (total == 0) return 0;
        return (int) Math.round((part * 100.0) / total);
    }

    private DateRange normalize(LocalDate from, LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusMonths(5).withDayOfMonth(1);
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw com.reeva.backend.common.exception.BusinessException.badRequest("from must be before or equal to to");
        }
        return new DateRange(effectiveFrom, effectiveTo);
    }

    private record DateRange(LocalDate from, LocalDate to) {}
    private record ProjectKey(UUID id, String name, String code) {}
    private record EmployeeKey(UUID id, String name, String departmentName, String managerName) {}
}
