package com.reeva.backend.ai;

import com.reeva.backend.expense.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class AiExpenseDecisionService {

    private static final short DEFAULT_AUTO_APPROVAL_SCORE = 90;
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

        ExpenseCategory category = resolveCategory(result.category(), expense.getCategory());
        PolicyCheck policy = checkPolicy(expense, result, category);

        if (sefaz.status() == SefazStatus.INVALID) {
            return decision(AiDecision.REJECTED_BY_FISCAL_VALIDATION, ExpenseStatus.MANAGER_REJECTED,
                AiAlertLevel.HIGH, score, false, null, sefaz, false,
                null, "Reembolso recusado automaticamente por falha fiscal critica. " + sefaz.message());
        }

        if (!result.readable()) {
            String summary = "Foto precisa ser reenviada: " + result.reason();
            if (!policy.compliant()) {
                summary += " " + policyFallbackReason(policy.reason());
            }
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, policy.compliant(), policy.compliant() ? null : policyFallbackReason(policy.reason()),
                sefaz, false, result.reason(), summary);
        }

        if (hasMissingMandatoryFields(result)) {
            String summary = "Dados obrigatorios incompletos. Solicite correcao ao funcionario.";
            if (!policy.compliant()) {
                summary += " " + policyFallbackReason(policy.reason());
            }
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, policy.compliant(), policy.compliant() ? null : policyFallbackReason(policy.reason()),
                sefaz, false, "Funcionario deve corrigir campos ou reenviar a foto.",
                summary);
        }

        if (!policy.compliant()) {
            return decision(AiDecision.PENDING_MANUAL_REVIEW, ExpenseStatus.PENDING_REVIEW,
                AiAlertLevel.HIGH, score, false, policy.reason(), sefaz, false,
                "Fora da politica da empresa. Gestor deve revisar antes de aprovar.",
                "Revisao obrigatoria do gestor: reembolso fora da politica. " + policy.reason());
        }

        if (Boolean.FALSE.equals(result.policyCompliant())) {
            String reason = result.policyReason() != null && !result.policyReason().isBlank()
                ? result.policyReason()
                : "IA identificou descumprimento da politica cadastrada.";
            return decision(AiDecision.PENDING_MANUAL_REVIEW, ExpenseStatus.PENDING_REVIEW,
                AiAlertLevel.HIGH, score, false, reason, sefaz, false,
                "Fora da politica da empresa. Gestor deve revisar antes de aprovar.",
                "Revisao obrigatoria do gestor: reembolso fora da politica. " + reason);
        }

        short minScore = autoApprovalMinScore(expense, category);
        BigDecimal amount = safeAmount(result, expense);
        boolean overNeverAutoApprove = amount.compareTo(NEVER_AUTO_APPROVE_AMOUNT) > 0;
        boolean fiscalOk = sefaz.status() == SefazStatus.VALID || sefaz.status() == SefazStatus.NOT_APPLICABLE;
        if (score >= minScore && !overNeverAutoApprove && fiscalOk) {
            return decision(AiDecision.AUTO_APPROVED, ExpenseStatus.MANAGER_APPROVED,
                AiAlertLevel.NONE, score, true, null, sefaz, true, null,
                "Aprovado automaticamente pela IA: score " + score + " atingiu o minimo " + minScore
                    + ", politica ok e validacao fiscal aceita. Nao precisa de aprovacao do gestor.");
        }

        String reason = autoApprovalBlockReason(score, minScore, amount, overNeverAutoApprove, sefaz, fiscalOk);
        return decision(AiDecision.READY_FOR_MANAGER, ExpenseStatus.PENDING_REVIEW,
            AiAlertLevel.MEDIUM, score, true, null, sefaz, false, reason,
            "Revisao do gestor recomendada: " + reason);
    }

    private PolicyCheck checkPolicy(Expense expense, OcrResult result, ExpenseCategory category) {
        BigDecimal amount = safeAmount(result, expense);
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(policy -> amount.compareTo(policy.getMaxAmount()) <= 0
                ? new PolicyCheck(true, null)
                : new PolicyCheck(false, "Valor acima do limite de " + policy.getMaxAmount() + " para " + category))
            .orElseGet(() -> new PolicyCheck(true, null));
    }

    private short autoApprovalMinScore(Expense expense, ExpenseCategory category) {
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(ExpensePolicy::getAutoApprovalMinScore)
            .orElse(DEFAULT_AUTO_APPROVAL_SCORE);
    }

    private String autoApprovalBlockReason(short score, short minScore, BigDecimal amount,
                                           boolean overNeverAutoApprove, SefazValidationResult sefaz,
                                           boolean fiscalOk) {
        java.util.List<String> reasons = new java.util.ArrayList<>();
        if (score < minScore) {
            reasons.add("score da IA " + score + " abaixo do minimo configurado " + minScore);
        }
        if (overNeverAutoApprove) {
            reasons.add("valor " + amount + " acima do teto automatico de R$ 5.000,00");
        }
        if (!fiscalOk) {
            reasons.add("validacao fiscal " + sefaz.status() + ": " + sefaz.message());
        }
        if (reasons.isEmpty()) {
            return "criterios de autoaprovacao nao atendidos.";
        }
        return "Autoaprovacao bloqueada: " + String.join("; ", reasons) + ".";
    }

    private String policyFallbackReason(String policyReason) {
        if (policyReason == null || policyReason.isBlank()) {
            return "Valor informado pelo funcionario tambem exige revisao de politica.";
        }
        return "Valor informado pelo funcionario exige revisao de politica: " + policyReason + ".";
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

