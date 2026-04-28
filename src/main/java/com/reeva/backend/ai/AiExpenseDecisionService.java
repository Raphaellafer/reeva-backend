package com.reeva.backend.ai;

import com.reeva.backend.expense.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class AiExpenseDecisionService {

    private static final short AUTO_APPROVAL_SCORE = 90;
    private static final BigDecimal NEVER_AUTO_APPROVE_AMOUNT = new BigDecimal("5000.00");

    private final ExpensePolicyRepository policyRepository;
    private final SefazValidationService sefazValidationService;

    public AiExpenseDecisionService(ExpensePolicyRepository policyRepository,
                                    SefazValidationService sefazValidationService) {
        this.policyRepository = policyRepository;
        this.sefazValidationService = sefazValidationService;
    }

    public AiExpenseDecision decide(Expense expense, OcrResult result) {
        short score = normalizeScore(result.score());
        SefazValidationResult sefaz = sefazValidationService.validate(new SefazValidationRequest(
            result.supplierCnpj(), result.issueDate(), result.totalAmount(), result.sefazVerificationCode()
        ));

        if (!result.readable()) {
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, false, "Comprovante ilegivel ou invalido.",
                sefaz, false, result.reason(), "Foto precisa ser reenviada: " + result.reason());
        }

        if (hasMissingMandatoryFields(result)) {
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, false, "Campos obrigatorios ausentes ou ilegiveis.",
                sefaz, false, "Funcionario deve corrigir campos ou reenviar a foto.",
                "Dados obrigatorios incompletos. Solicite correcao ao funcionario.");
        }

        PolicyCheck policy = checkPolicy(expense, result);
        if (!policy.compliant()) {
            return decision(AiDecision.REJECTED_BY_POLICY, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, false, policy.reason(), sefaz, false,
                "Fora da politica da empresa.", "Reembolso fora da politica: " + policy.reason());
        }

        if (sefaz.status() == SefazStatus.INVALID) {
            return decision(AiDecision.PENDING_MANUAL_REVIEW, ExpenseStatus.PENDING_REVIEW,
                AiAlertLevel.HIGH, score, true, null, sefaz, false,
                "SEFAZ indicou documento invalido.", "Validacao fiscal falhou. Revisao obrigatoria.");
        }

        boolean overNeverAutoApprove = safeAmount(result, expense).compareTo(NEVER_AUTO_APPROVE_AMOUNT) > 0;
        if (score > AUTO_APPROVAL_SCORE && !overNeverAutoApprove &&
                (sefaz.status() == SefazStatus.VALID || sefaz.status() == SefazStatus.NOT_APPLICABLE)) {
            return decision(AiDecision.AUTO_APPROVED, ExpenseStatus.AI_APPROVED,
                AiAlertLevel.NONE, score, true, null, sefaz, true, null,
                "Autoaprovado pela IA: score alto, politica ok e validacao fiscal aceita.");
        }

        String reason = overNeverAutoApprove
            ? "Valor acima de R$ 5.000,00 exige revisao."
            : "Score ou validacao insuficiente para autoaprovacao.";
        return decision(AiDecision.READY_FOR_MANAGER, ExpenseStatus.PENDING_REVIEW,
            AiAlertLevel.MEDIUM, score, true, null, sefaz, false, reason,
            "Revisao do gestor recomendada: " + reason);
    }

    private PolicyCheck checkPolicy(Expense expense, OcrResult result) {
        ExpenseCategory category = resolveCategory(result.category(), expense.getCategory());
        BigDecimal amount = safeAmount(result, expense);
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(policy -> amount.compareTo(policy.getMaxAmount()) <= 0
                ? new PolicyCheck(true, null)
                : new PolicyCheck(false, "Valor acima do limite de " + policy.getMaxAmount() + " para " + category))
            .orElseGet(() -> new PolicyCheck(true, null));
    }

    private boolean hasMissingMandatoryFields(OcrResult result) {
        return result.supplierName() == null || result.supplierName().isBlank()
            || result.totalAmount() == null
            || result.issueDate() == null
            || result.category() == null || result.category().isBlank();
    }

    private ExpenseCategory resolveCategory(String rawCategory, ExpenseCategory fallback) {
        if (rawCategory == null || rawCategory.isBlank()) return fallback;
        try {
            return ExpenseCategory.valueOf(rawCategory);
        } catch (IllegalArgumentException ignored) {
            return fallback;
        }
    }

    private BigDecimal safeAmount(OcrResult result, Expense expense) {
        return result.totalAmount() != null ? result.totalAmount() : expense.getAmount();
    }

    private short normalizeScore(Short score) {
        if (score == null) return 0;
        if (score < 0) return 0;
        if (score > 100) return 100;
        return score;
    }

    private AiExpenseDecision decision(AiDecision decision, ExpenseStatus status, AiAlertLevel alertLevel,
                                       short score, boolean policyCompliant, String policyViolationReason,
                                       SefazValidationResult sefaz, boolean autoApprovalEligible,
                                       String manualReviewReason, String summary) {
        return new AiExpenseDecision(decision, status, alertLevel, score, policyCompliant,
            policyViolationReason, sefaz.status(), sefaz.message(), autoApprovalEligible,
            manualReviewReason, summary);
    }

    private record PolicyCheck(boolean compliant, String reason) {}
}

