package com.reeva.backend.ai;

import com.reeva.backend.expense.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AiExpenseDecisionService {

    private static final short DEFAULT_AUTO_APPROVAL_SCORE = 90;
    private static final short MIN_READING_SCORE_FOR_AUTO_APPROVAL = 85;
    private static final BigDecimal NEVER_AUTO_APPROVE_AMOUNT = new BigDecimal("5000.00");
    private static final SefazValidationResult SEFAZ_VALIDATION_DISABLED = new SefazValidationResult(
        SefazStatus.NOT_APPLICABLE,
        "Verificacao de autenticidade SEFAZ desativada temporariamente. Nao usada como criterio de aprovacao."
    );
    private static final Pattern MAX_RECEIPT_AGE_PATTERN = Pattern.compile(
        "(?:mais\\s+de|acima\\s+de|superior\\s+a|mais\\s+que)\\s+(\\d{1,3})\\s+dias"
    );

    private final ExpensePolicyRepository policyRepository;

    public AiExpenseDecisionService(ExpensePolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    public AiExpenseDecision decide(Expense expense, OcrResult result) {
        short score = normalizeScore(result.score());
        SefazValidationResult sefaz = sefazValidation();

        String category = resolveCategory(result.category(), expense.getCategory());
        PolicyCheck policy = checkPolicy(expense, result, category);
        boolean categoryMismatch = isCategoryMismatch(result, expense.getCategory());
        boolean trustedAiPolicyViolation = Boolean.FALSE.equals(result.policyCompliant())
            && shouldTrustAiPolicyViolation(expense, result, category);
        short complianceScore = complianceScore(result, policy, categoryMismatch, trustedAiPolicyViolation);

        if (categoryMismatch) {
            String reason = "Categoria enviada nao confere com a nota: enviado como "
                + expense.getCategory() + ", mas a IA identificou " + result.category() + ".";
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, complianceScore, false, reason, sefaz, false,
                "Funcionario deve corrigir a categoria da despesa.",
                "Foto precisa ser reenviada ou corrigida: " + reason);
        }

        if (!result.readable()) {
            String summary = "Foto precisa ser reenviada: " + result.reason();
            if (!policy.compliant()) {
                summary += " " + policyFallbackReason(policy.reason());
            }
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, complianceScore, policy.compliant(), policy.compliant() ? null : policyFallbackReason(policy.reason()),
                sefaz, false, result.reason(), summary);
        }

        if (hasMissingMandatoryFields(result)) {
            String summary = "Dados obrigatorios incompletos. Solicite correcao ao funcionario.";
            if (!policy.compliant()) {
                summary += " " + policyFallbackReason(policy.reason());
            }
            return decision(AiDecision.NEEDS_EMPLOYEE_CORRECTION, ExpenseStatus.NEEDS_REVISION,
                AiAlertLevel.HIGH, score, complianceScore, policy.compliant(), policy.compliant() ? null : policyFallbackReason(policy.reason()),
                sefaz, false, "Funcionario deve corrigir campos ou reenviar a foto.",
                summary);
        }

        if (!policy.compliant()) {
            return decision(AiDecision.PENDING_MANUAL_REVIEW, ExpenseStatus.PENDING_REVIEW,
                AiAlertLevel.HIGH, score, complianceScore, false, policy.reason(), sefaz, false,
                "Fora da politica da empresa. Gestor deve revisar antes de aprovar.",
                "Revisao obrigatoria do gestor: reembolso fora da politica. " + policy.reason());
        }

        if (trustedAiPolicyViolation) {
            String reason = result.policyReason() != null && !result.policyReason().isBlank()
                ? result.policyReason()
                : "IA identificou descumprimento da politica cadastrada.";
            return decision(AiDecision.PENDING_MANUAL_REVIEW, ExpenseStatus.PENDING_REVIEW,
                AiAlertLevel.HIGH, score, complianceScore, false, reason, sefaz, false,
                "Fora da politica da empresa. Gestor deve revisar antes de aprovar.",
                "Revisao obrigatoria do gestor: reembolso fora da politica. " + reason);
        }

        short minComplianceScore = autoApprovalMinScore(expense, category);
        BigDecimal amount = safeAmount(result, expense);
        boolean overNeverAutoApprove = amount.compareTo(NEVER_AUTO_APPROVE_AMOUNT) > 0;
        boolean readingScoreOk = score >= MIN_READING_SCORE_FOR_AUTO_APPROVAL;
        if (readingScoreOk && complianceScore >= minComplianceScore && !overNeverAutoApprove) {
            return decision(AiDecision.AUTO_APPROVED, ExpenseStatus.MANAGER_APPROVED,
                AiAlertLevel.NONE, score, complianceScore, true, null, sefaz, true, null,
                "Aprovado automaticamente pela IA: leitura " + score + "/100 atingiu o minimo fixo "
                    + MIN_READING_SCORE_FOR_AUTO_APPROVAL + ", conformidade " + complianceScore
                    + "/100 atingiu o minimo " + minComplianceScore
                    + " e politica ok. Verificacao SEFAZ temporariamente desativada.");
        }

        String reason = autoApprovalBlockReason(score, minComplianceScore, complianceScore, amount, overNeverAutoApprove);
        return decision(AiDecision.READY_FOR_MANAGER, ExpenseStatus.PENDING_REVIEW,
            AiAlertLevel.MEDIUM, score, complianceScore, true, null, sefaz, false, reason,
            "Revisao do gestor recomendada: " + reason);
    }

    private boolean shouldTrustAiPolicyViolation(Expense expense, OcrResult result, String category) {
        String reason = normalizeText(result.policyReason() == null ? "" : result.policyReason());
        if (reason.isBlank()) {
            return false;
        }
        for (ExpenseCategory otherCategory : ExpenseCategory.values()) {
            if (!otherCategory.name().equals(category) && mentionsCategory(reason, otherCategory)) {
                return false;
            }
        }
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(policy -> policyTextSupportsAiReason(policy, reason))
            .orElse(false);
    }

    private boolean policyTextSupportsAiReason(ExpensePolicy policy, String normalizedAiReason) {
        String description = normalizeText(policy.getDescription() == null ? "" : policy.getDescription());
        if (description.isBlank()) {
            return false;
        }

        if (mentionsReceiptAgeRule(normalizedAiReason)) {
            var aiMatcher = MAX_RECEIPT_AGE_PATTERN.matcher(normalizedAiReason);
            var policyMatcher = MAX_RECEIPT_AGE_PATTERN.matcher(description);
            return aiMatcher.find()
                && policyMatcher.find()
                && aiMatcher.group(1).equals(policyMatcher.group(1))
                && containsReimbursementBlock(description);
        }

        return description.contains(normalizedAiReason)
            || normalizedAiReason.contains(description);
    }

    private boolean mentionsReceiptAgeRule(String normalizedText) {
        return normalizedText.contains("dias")
            && (normalizedText.contains("atras")
                || normalizedText.contains("antig")
                || normalizedText.contains("anterior"));
    }

    private boolean mentionsCategory(String normalizedText, ExpenseCategory category) {
        return switch (category) {
            case FOOD -> normalizedText.contains("food")
                || normalizedText.contains("alimentacao")
                || normalizedText.contains("refeicao")
                || normalizedText.contains("restaurante");
            case TRANSPORT -> normalizedText.contains("transport")
                || normalizedText.contains("transporte")
                || normalizedText.contains("uber")
                || normalizedText.contains("taxi")
                || normalizedText.contains("locomocao");
            case LODGING -> normalizedText.contains("lodging")
                || normalizedText.contains("hospedagem")
                || normalizedText.contains("hotel");
            case PURCHASE -> normalizedText.contains("purchase")
                || normalizedText.contains("compras")
                || normalizedText.contains("compra");
            case HARDWARE -> normalizedText.contains("hardware")
                || normalizedText.contains("equipamento");
        };
    }

    private SefazValidationResult sefazValidation() {
        // Future integration point: call a real SEFAZ provider here when credentials/API key are available.
        return SEFAZ_VALIDATION_DISABLED;
    }

    private PolicyCheck checkPolicy(Expense expense, OcrResult result, String category) {
        BigDecimal amount = safeAmount(result, expense);
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(policy -> {
                if (amount.compareTo(policy.getMaxAmount()) > 0) {
                    return new PolicyCheck(false, "Valor acima do limite de " + policy.getMaxAmount() + " para " + category);
                }

                PolicyCheck textRuleCheck = checkTextPolicyRules(policy, result);
                if (!textRuleCheck.compliant()) {
                    return textRuleCheck;
                }

                return new PolicyCheck(true, null);
            })
            .orElseGet(() -> new PolicyCheck(true, null));
    }

    private PolicyCheck checkTextPolicyRules(ExpensePolicy policy, OcrResult result) {
        String description = policy.getDescription();
        if (description == null || description.isBlank()) {
            return new PolicyCheck(true, null);
        }

        String normalized = normalizeText(description);
        if (containsReimbursementBlock(normalized)) {
            var matcher = MAX_RECEIPT_AGE_PATTERN.matcher(normalized);
            if (matcher.find() && result.issueDate() != null) {
                long maxAgeDays = Long.parseLong(matcher.group(1));
                LocalDate oldestAllowedDate = LocalDate.now().minusDays(maxAgeDays);
                if (result.issueDate().isBefore(oldestAllowedDate)) {
                    return new PolicyCheck(false,
                        "Regra textual da politica violada: nota de " + result.issueDate()
                            + " tem mais de " + maxAgeDays + " dias.");
                }
            }
        }

        return new PolicyCheck(true, null);
    }

    private boolean containsReimbursementBlock(String normalizedText) {
        return normalizedText.contains("nao reembols")
            || normalizedText.contains("nao aceitar")
            || normalizedText.contains("nao aprovar")
            || normalizedText.contains("reembolso nao permitido")
            || normalizedText.contains("despesa nao permitida");
    }

    private String normalizeText(String value) {
        return java.text.Normalizer.normalize(value.toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
    }

    private short autoApprovalMinScore(Expense expense, String category) {
        return policyRepository.findByCompanyIdAndCategoryAndActiveTrue(expense.getCompany().getId(), category)
            .map(ExpensePolicy::getAutoApprovalMinScore)
            .orElse(DEFAULT_AUTO_APPROVAL_SCORE);
    }

    private String autoApprovalBlockReason(short score, short minComplianceScore, short complianceScore, BigDecimal amount,
                                           boolean overNeverAutoApprove) {
        java.util.List<String> reasons = new java.util.ArrayList<>();
        if (score < MIN_READING_SCORE_FOR_AUTO_APPROVAL) {
            reasons.add("leitura OCR " + score + " abaixo do minimo fixo " + MIN_READING_SCORE_FOR_AUTO_APPROVAL);
        }
        if (complianceScore < minComplianceScore) {
            reasons.add("conformidade " + complianceScore + " abaixo do minimo configurado " + minComplianceScore);
        }
        if (overNeverAutoApprove) {
            reasons.add("valor " + amount + " acima do teto automatico de R$ 5.000,00");
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
            || result.issueDate() == null;
    }

    private String resolveCategory(String rawCategory, String fallback) {
        if (rawCategory == null || rawCategory.isBlank()) return fallback;
        String normalized = CategoryUtils.normalize(rawCategory);
        if (normalized == null || "OTHER".equals(normalized)) {
            return fallback;
        }
        return normalized;
    }

    private BigDecimal safeAmount(OcrResult result, Expense expense) {
        return result.totalAmount() != null ? result.totalAmount() : expense.getAmount();
    }

    private boolean isCategoryMismatch(OcrResult result, String submittedCategory) {
        if (result.category() == null || result.category().isBlank()) {
            return false;
        }
        String detectedCategory = CategoryUtils.normalize(result.category());
        if (detectedCategory == null || "OTHER".equals(detectedCategory)) {
            return false;
        }
        return !detectedCategory.equals(submittedCategory);
    }

    private short complianceScore(OcrResult result, PolicyCheck policy, boolean categoryMismatch,
                                  boolean trustedAiPolicyViolation) {
        int score = 100;
        if (!result.readable()) {
            score = Math.min(score, 30);
        }
        if (hasMissingMandatoryFields(result)) {
            score = Math.min(score, 40);
        }
        if (categoryMismatch) {
            score = Math.min(score, 30);
        }
        if (!policy.compliant() || trustedAiPolicyViolation) {
            score = Math.min(score, 20);
        }
        if (normalizeScore(result.score()) < MIN_READING_SCORE_FOR_AUTO_APPROVAL) {
            score = Math.min(score, 60);
        }
        return (short) Math.max(0, Math.min(100, score));
    }

    private short normalizeScore(Short score) {
        if (score == null) return 0;
        if (score < 0) return 0;
        if (score > 100) return 100;
        return score;
    }

    private AiExpenseDecision decision(AiDecision decision, ExpenseStatus status, AiAlertLevel alertLevel,
                                       short score, short complianceScore, boolean policyCompliant, String policyViolationReason,
                                       SefazValidationResult sefaz, boolean autoApprovalEligible,
                                       String manualReviewReason, String summary) {
        return new AiExpenseDecision(decision, status, alertLevel, score, complianceScore, policyCompliant,
            policyViolationReason, sefaz.status(), sefaz.message(), autoApprovalEligible,
            manualReviewReason, summary);
    }

    private record PolicyCheck(boolean compliant, String reason) {}
}

