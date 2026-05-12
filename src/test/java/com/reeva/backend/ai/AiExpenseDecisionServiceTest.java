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
    void invalidFiscalValidationShouldRequireReviewForEveryCategory(ExpenseCategory category) throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        SefazValidationService sefazValidationService = request ->
            new SefazValidationResult(SefazStatus.INVALID, "CNPJ do fornecedor invalido.");
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository, sefazValidationService);

        Expense expense = expense(category, new BigDecimal("40.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category))
            .thenReturn(Optional.empty());

        AiExpenseDecision decision = service.decide(expense, readableResult(category, new BigDecimal("40.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.alertLevel()).isEqualTo(AiAlertLevel.HIGH);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.policyViolationReason()).isNull();
        assertThat(decision.summary()).contains("Revisao fiscal obrigatoria");
        assertThat(decision.manualReviewReason()).contains("Gestor deve revisar");
    }

    @Test
    void invalidFiscalValidationShouldRequireReviewEvenWhenOcrIsUnreadable() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        SefazValidationService sefazValidationService = request ->
            new SefazValidationResult(SefazStatus.INVALID, "CNPJ do fornecedor invalido.");
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository, sefazValidationService);

        Expense expense = expense(ExpenseCategory.PURCHASE, new BigDecimal("80.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.PURCHASE))
            .thenReturn(Optional.empty());

        OcrResult unreadableWithFiscalData = new OcrResult(
            false,
            "Valor total da nota nao foi lido com confianca.",
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

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.summary()).contains("Revisao fiscal obrigatoria");
    }

    @ParameterizedTest
    @EnumSource(ExpenseCategory.class)
    void outOfPolicyAmountShouldRequireManagerReviewForEveryCategory(ExpenseCategory category) throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        SefazValidationService sefazValidationService = request ->
            new SefazValidationResult(SefazStatus.VALID, "Chave fiscal valida.");
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository, sefazValidationService);

        Expense expense = expense(category, new BigDecimal("250.00"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), category, new BigDecimal("100.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category))
            .thenReturn(Optional.of(policy));

        AiExpenseDecision decision = service.decide(expense, readableResult(category, new BigDecimal("250.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.PENDING_MANUAL_REVIEW);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.policyCompliant()).isFalse();
        assertThat(decision.summary()).contains("Revisao obrigatoria do gestor");
    }

    @Test
    void inconclusiveFiscalValidationShouldNotRejectAutomatically() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        SefazValidationService sefazValidationService = request ->
            new SefazValidationResult(SefazStatus.UNAVAILABLE, "Codigo fiscal parcial ou nao verificavel.");
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository, sefazValidationService);

        Expense expense = expense(ExpenseCategory.TRANSPORT, new BigDecimal("40.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.TRANSPORT))
            .thenReturn(Optional.empty());

        AiExpenseDecision decision = service.decide(expense, readableResult(ExpenseCategory.TRANSPORT, new BigDecimal("40.00")));

        assertThat(decision.decision()).isEqualTo(AiDecision.READY_FOR_MANAGER);
        assertThat(decision.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(decision.policyCompliant()).isTrue();
        assertThat(decision.summary()).contains("Revisao do gestor recomendada");
    }

    @Test
    void unreadableOcrShouldStillFlagSubmittedAmountAbovePolicy() throws Exception {
        ExpensePolicyRepository policyRepository = mock(ExpensePolicyRepository.class);
        SefazValidationService sefazValidationService = request ->
            new SefazValidationResult(SefazStatus.UNAVAILABLE, "Codigo fiscal nao verificavel.");
        AiExpenseDecisionService service = new AiExpenseDecisionService(policyRepository, sefazValidationService);

        Expense expense = expense(ExpenseCategory.LODGING, new BigDecimal("6000.00"));
        ExpensePolicy policy = new ExpensePolicy(expense.getCompany(), ExpenseCategory.LODGING, new BigDecimal("800.00"));
        when(policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), ExpenseCategory.LODGING))
            .thenReturn(Optional.of(policy));

        OcrResult unreadable = new OcrResult(
            false,
            "Valor total da nota nao foi lido com confianca.",
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

    private Expense expense(ExpenseCategory category, BigDecimal amount) throws Exception {
        Company company = new Company("Reeva", "11.222.333/0001-81", "demo@reeva.com.br", "PRO");
        setField(company, "id", UUID.randomUUID());
        User employee = new User(company, "Bruno", "bruno@reeva.com.br", "hash", UserRole.EMPLOYEE);
        setField(employee, "id", UUID.randomUUID());
        Project project = new Project(company, "Projeto Demo", employee);
        setField(project, "id", UUID.randomUUID());
        return new Expense(company, employee, project, "Nota", category,
            amount, LocalDate.of(2025, 5, 14), PaymentMethod.OTHER);
    }

    private OcrResult readableResult(ExpenseCategory category, BigDecimal amount) {
        return new OcrResult(
            true,
            null,
            "LESTE SUSHI BAR",
            "12.345.678/0001-90",
            amount,
            LocalDate.of(2025, 5, 14),
            category.name(),
            "Despesa corporativa",
            (short) 95,
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
