package com.reeva.backend.ai;

import com.reeva.backend.company.Company;
import com.reeva.backend.expense.*;
import com.reeva.backend.project.Project;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiExpenseDecisionServiceTest {

    @ParameterizedTest
    @EnumSource(ExpenseCategory.class)
    void sefazValidationShouldNotBlockAutoApprovalForEveryCategory(ExpenseCategory category) throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(category, new BigDecimal("40.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category.name()))
            .thenReturn(Optional.empty());

        AiExpenseDecision decision = service.decide(expense, readableResult(category, new BigDecimal("40.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.AUTO_APPROVED);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.MANAGER_APPROVED);
        assertThat(decision.alertLevel()).isEqualTo(AiAlertLevel.NONE);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.policyViolationReason()).isNull();
        assertThat(decision.sefazStatus()).isEqualTo(SefazStatus.NOT_APPLICABLE);
        assertThat(decision.sefazValidationMessage()).contains("desativada temporariamente");
        assertThat(decision.summary()).contains("Verificacao SEFAZ temporariamente desativada");
        assertThat(decision.manualReviewReason()).isNull();
    }

    @Test
    void disabledSefazValidationShouldNotOverrideUnreadableOcrCorrection() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.PURCHASE, new BigDecimal("80.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.PURCHASE.name()))
            .thenReturn(Optional.empty());

        OcrResult unreadableWithFiscalData = new OcrResult(
            false,
            "Valor total da nota nao foi lido com confianca.",
            true,
            "NFE",
            "Fornecedor Teste",
            "12.345.678/0001-90",
            null,
            LocalDate.of(2025, 5, 14),
            "PURCHASE",
            "Despesa corporativa",
            (short) 20,
            "OCR parcial.",
            null,
            null,
            "352505123456780001906500100000345100034512",
            "Codigo fiscal extraido.",
            null,
            List.of(),
            "{}",
            "hash"
        );

        AiExpenseDecision decision = service.decide(expense, unreadableWithFiscalData);

        assertThat(decision.decision()).isEqualTo(AiDecision.NEEDS_EMPLOYEE_CORRECTION);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.NEEDS_REVISION);
        assertThat(decision.sefazStatus()).isEqualTo(SefazStatus.NOT_APPLICABLE);
        assertThat(decision.summary()).contains("Foto precisa ser reenviada");
    }

    @ParameterizedTest
    @EnumSource(ExpenseCategory.class)
    void outOfPolicyAmountShouldRequireManagerReviewForEveryCategory(ExpenseCategory category) throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(category, new BigDecimal("250.00"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), category.name(), new BigDecimal("100.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category.name()))
            .thenReturn(Optional.of(policy));

        AiExpenseDecision decision = service.decide(expense, readableResult(category, new BigDecimal("250.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.policyCompliant()).isFalse();
        assertThat(decision.summary()).contains("Revisao obrigatoria do gestor");
    }

    @Test
    void disabledSefazValidationShouldAllowAutoApprovalWhenOtherCriteriaPass() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.TRANSPORT, new BigDecimal("40.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.TRANSPORT.name()))
            .thenReturn(Optional.empty());

        AiExpenseDecision decision = service.decide(expense, readableResult(ExpenseCategory.TRANSPORT, new BigDecimal("40.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.AUTO_APPROVED);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.MANAGER_APPROVED);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.summary()).contains("Verificacao SEFAZ temporariamente desativada");
    }

    @Test
    void unreadableOcrShouldStillFlagSubmittedAmountAbovePolicy() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.LODGING, new BigDecimal("6000.00"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.LODGING.name(), new BigDecimal("800.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.LODGING.name()))
            .thenReturn(Optional.of(policy));

        OcrResult unreadable = new OcrResult(
            false,
            "Valor total da nota nao foi lido com confianca.",
            true,
            "NFE",
            null,
            null,
            null,
            null,
            "LODGING",
            null,
            (short) 15,
            "Foto ruim.",
            null,
            null,
            null,
            null,
            null,
            List.of(),
            "{}",
            "hash"
        );

        AiExpenseDecision decision = service.decide(expense, unreadable);

        assertThat(decision.decision()).isEqualTo(AiDecision.NEEDS_EMPLOYEE_CORRECTION);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.NEEDS_REVISION);
        assertThat(decision.policyCompliant()).isFalse();
        assertThat(decision.policyViolationReason()).contains("Valor informado pelo funcionario exige revisao de politica");
        assertThat(decision.summary()).contains("Valor informado pelo funcionario exige revisao de politica");
    }

    @Test
    void textualPolicyAgeRuleShouldPreventAutoApprovalForOldReceipt() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.TRANSPORT.name(), new BigDecimal("300.00"));
        policy.setAutoApprovalMinScore((short) 85);
        policy.setDescription("Nao reembolsar notas de mais de 30 dias atras.");
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.TRANSPORT.name()))
            .thenReturn(Optional.of(policy));

        AiExpenseDecision decision = service.decide(
            expense,
            readableResult(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"), LocalDate.now().minusDays(31))
        );

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.policyCompliant()).isFalse();
        assertThat(decision.policyViolationReason()).contains("mais de 30 dias");
        assertThat(decision.autoApprovalEligible()).isFalse();
    }

    @Test
    void aiPolicyViolationShouldPreventAutoApprovalForFreeTextRules() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.TRANSPORT.name(), new BigDecimal("300.00"));
        policy.setDescription("Regra textual da politica violada.");
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.TRANSPORT.name()))
            .thenReturn(Optional.of(policy));

        OcrResult result = readableResult(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"), LocalDate.now());
        result = new OcrResult(
            result.readable(),
            result.reason(),
            result.documentDetected(),
            result.documentType(),
            result.supplierName(),
            result.supplierCnpj(),
            result.totalAmount(),
            result.issueDate(),
            result.category(),
            result.description(),
            result.score(),
            result.confidenceReason(),
            false,
            "Regra textual da politica violada.",
            result.sefazVerificationCode(),
            result.sefazReason(),
            "Enviar para revisao do gestor.",
            result.lineItems(),
            result.rawJson(),
            result.imageSha256()
        );

        AiExpenseDecision decision = service.decide(expense, result);

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.policyCompliant()).isFalse();
        assertThat(decision.summary()).contains("Regra textual da politica violada");
    }

    @Test
    void aiOldReceiptPolicyViolationShouldBeIgnoredWhenPolicyDoesNotContainAgeRule() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.TRANSPORT.name(), new BigDecimal("300.00"));
        policy.setAutoApprovalMinScore((short) 90);
        policy.setDescription("Reembolsar apenas despesas de transporte corporativo com comprovante legivel.");
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.TRANSPORT.name()))
            .thenReturn(Optional.of(policy));

        OcrResult result = readableResult(ExpenseCategory.TRANSPORT, new BigDecimal("42.88"), LocalDate.now().minusDays(60));
        result = new OcrResult(
            result.readable(),
            result.reason(),
            result.documentDetected(),
            result.documentType(),
            result.supplierName(),
            result.supplierCnpj(),
            result.totalAmount(),
            result.issueDate(),
            result.category(),
            result.description(),
            result.score(),
            result.confidenceReason(),
            false,
            "A data da despesa é anterior a 30 dias da data atual, violando a regra de reembolso para despesas antigas.",
            result.sefazVerificationCode(),
            result.sefazReason(),
            "Enviar para revisao do gestor.",
            result.lineItems(),
            result.rawJson(),
            result.imageSha256()
        );

        AiExpenseDecision decision = service.decide(expense, result);

        assertThat(decision.decision()).isEqualTo(AiDecision.AUTO_APPROVED);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.policyViolationReason()).isNull();
    }

    @Test
    void aiPolicyViolationFromAnotherCategoryShouldBeIgnored() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.FOOD, new BigDecimal("120.00"));
        ExpensePolicy foodPolicy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.FOOD.name(), new BigDecimal("150.00"));
        foodPolicy.setAutoApprovalMinScore((short) 90);
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.FOOD.name()))
            .thenReturn(Optional.of(foodPolicy));

        OcrResult result = readableResult(ExpenseCategory.FOOD, new BigDecimal("120.00"), LocalDate.now().minusDays(60));
        result = new OcrResult(
            result.readable(),
            result.reason(),
            result.documentDetected(),
            result.documentType(),
            result.supplierName(),
            result.supplierCnpj(),
            result.totalAmount(),
            result.issueDate(),
            result.category(),
            result.description(),
            result.score(),
            result.confidenceReason(),
            false,
            "A nota fiscal e de mais de 30 dias atras, violando a regra de reembolso para a categoria TRANSPORT.",
            result.sefazVerificationCode(),
            result.sefazReason(),
            "Enviar para revisao do gestor.",
            result.lineItems(),
            result.rawJson(),
            result.imageSha256()
        );

        AiExpenseDecision decision = service.decide(expense, result);

        assertThat(decision.decision()).isEqualTo(AiDecision.AUTO_APPROVED);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.MANAGER_APPROVED);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.policyViolationReason()).isNull();
    }

    @Test
    void lowReadingScoreShouldBlockAutoApprovalEvenWhenCompliancePasses() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository);

        Expense expense = expense(ExpenseCategory.FOOD, new BigDecimal("40.00"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.FOOD.name(), new BigDecimal("150.00"));
        policy.setAutoApprovalMinScore((short) 90);
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.FOOD.name()))
            .thenReturn(Optional.of(policy));

        OcrResult result = readableResult(ExpenseCategory.FOOD, new BigDecimal("40.00"), LocalDate.now(), (short) 84);

        AiExpenseDecision decision = service.decide(expense, result);

        assertThat(decision.decision()).isEqualTo(AiDecision.READY_FOR_MANAGER);
        assertThat(decision.score()).isEqualTo((short) 84);
        assertThat(decision.complianceScore()).isEqualTo((short) 60);
        assertThat(decision.manualReviewReason()).contains("leitura OCR 84 abaixo do minimo fixo 85");
        assertThat(decision.autoApprovalEligible()).isFalse();
    }

    private Expense expense(ExpenseCategory category, BigDecimal amount) throws Exception {
        Company company = new Company("Reeva", "11.222.333/0001-81", "demo@reeva.com.br", "PRO");
        setField(company, "id", UUID.randomUUID());
        User employee = new User(company, "Bruno", "bruno@reeva.com.br", "hash", UserRole.EMPLOYEE);
        setField(employee, "id", UUID.randomUUID());
        Project project = new Project(company, "Projeto Demo", employee);
        setField(project, "id", UUID.randomUUID());
        return new Expense(company, employee, project, "Nota", category.name(),
            amount, LocalDate.of(2025, 5, 14), PaymentMethod.OTHER);
    }

    private OcrResult readableResult(ExpenseCategory category, BigDecimal amount) {
        return readableResult(category, amount, LocalDate.of(2025, 5, 14));
    }

    private OcrResult readableResult(ExpenseCategory category, BigDecimal amount, LocalDate issueDate) {
        return readableResult(category, amount, issueDate, (short) 95);
    }

    private OcrResult readableResult(ExpenseCategory category, BigDecimal amount, LocalDate issueDate, short score) {
        return new OcrResult(
            true,
            null,
            true,
            "NFE",
            "LESTE SUSHI BAR",
            "12.345.678/0001-90",
            amount,
            issueDate,
            category.name(),
            "Despesa corporativa",
            score,
            "Documento claro.",
            null,
            null,
            "352505123456780001906500100000345100034512",
            "Codigo fiscal extraido.",
            null,
            List.of(),
            "{}",
            "hash"
        );
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
