package com.reeva.backend.ai;

import com.reeva.backend.expense.SefazStatus;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DemoSefazValidationService implements SefazValidationService {

    private static final Pattern ACCESS_KEY_PATTERN = Pattern.compile("\\d{44}");
    private static final Set<String> SYNTHETIC_CNPJS = Set.of(
        "12345678000190"
    );
    private static final Set<String> VALID_UF_CODES = Set.of(
        "11", "12", "13", "14", "15", "16", "17",
        "21", "22", "23", "24", "25", "26", "27",
        "28", "29", "31", "32", "33", "35", "41",
        "42", "43", "50", "51", "52", "53"
    );
    private static final Set<String> VALID_FISCAL_MODELS = Set.of("55", "65");

    @Override
    public SefazValidationResult validate(SefazValidationRequest request) {
        String accessKey = extractAccessKey(request.verificationCode());
        String supplierCnpj = extractValidCnpj(request.supplierCnpj());
        if (supplierCnpj == null && accessKey != null) {
            supplierCnpj = extractValidCnpj(accessKey.substring(6, 20));
        }

        if (supplierCnpj == null) {
            String rawDigits = onlyDigits(request.supplierCnpj());
            if (SYNTHETIC_CNPJS.contains(rawDigits)) {
                return new SefazValidationResult(SefazStatus.INVALID,
                    "CNPJ do fornecedor invalido. Documento exige revisao fiscal.");
            }
            return new SefazValidationResult(SefazStatus.UNAVAILABLE,
                "CNPJ do fornecedor nao pode ser confirmado pela validacao estrutural demo. Documento exige revisao fiscal.");
        }

        if (SYNTHETIC_CNPJS.contains(supplierCnpj)) {
            return new SefazValidationResult(SefazStatus.INVALID,
                "CNPJ do fornecedor invalido. Documento exige revisao fiscal.");
        }

        if (request.verificationCode() == null || request.verificationCode().isBlank()) {
            return new SefazValidationResult(SefazStatus.NOT_APPLICABLE, "Codigo SEFAZ nao informado no MVP.");
        }
        if (request.verificationCode().toUpperCase().contains("INVALID")) {
            return new SefazValidationResult(SefazStatus.INVALID, "Documento fiscal marcado como invalido no validador demo.");
        }

        if (accessKey == null) {
            return new SefazValidationResult(SefazStatus.UNAVAILABLE,
                "Codigo fiscal parcial ou nao verificavel. Chave de acesso de 44 digitos nao foi encontrada.");
        }

        String structuralError = validateAccessKey(accessKey, supplierCnpj);
        if (structuralError != null) {
            return new SefazValidationResult(SefazStatus.INVALID, structuralError);
        }

        return new SefazValidationResult(SefazStatus.VALID,
            "Chave fiscal passou na validacao estrutural demo. Integracao SEFAZ real ainda e necessaria para confirmacao oficial.");
    }

    private String validateAccessKey(String accessKey, String supplierCnpj) {
        String ufCode = accessKey.substring(0, 2);
        if (!VALID_UF_CODES.contains(ufCode)) {
            return "Chave fiscal invalida: codigo de UF inexistente.";
        }

        int month = Integer.parseInt(accessKey.substring(4, 6));
        if (month < 1 || month > 12) {
            return "Chave fiscal invalida: mes de emissao inexistente.";
        }

        String keyCnpj = accessKey.substring(6, 20);
        if (!keyCnpj.equals(supplierCnpj)) {
            return "Chave fiscal invalida: CNPJ da chave nao confere com o CNPJ do fornecedor.";
        }

        String model = accessKey.substring(20, 22);
        if (!VALID_FISCAL_MODELS.contains(model)) {
            return "Chave fiscal invalida: modelo fiscal diferente de NF-e/NFC-e.";
        }

        if (!hasValidAccessKeyCheckDigit(accessKey)) {
            return "Chave fiscal invalida: digito verificador nao confere.";
        }

        return null;
    }

    private String extractAccessKey(String verificationCode) {
        String digits = onlyDigits(verificationCode);
        if (digits == null) {
            return null;
        }
        Matcher matcher = ACCESS_KEY_PATTERN.matcher(digits);
        return matcher.find() ? matcher.group() : null;
    }

    private String extractValidCnpj(String value) {
        String digits = onlyDigits(value);
        if (digits == null) {
            return null;
        }
        if (digits.length() == 14) {
            return isValidCnpj(digits) ? digits : null;
        }
        if (digits.length() > 14) {
            for (int i = 0; i <= digits.length() - 14; i++) {
                String candidate = digits.substring(i, i + 14);
                if (isValidCnpj(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private boolean hasValidAccessKeyCheckDigit(String accessKey) {
        int sum = 0;
        int weight = 2;
        for (int i = 42; i >= 0; i--) {
            sum += Character.digit(accessKey.charAt(i), 10) * weight;
            weight = weight == 9 ? 2 : weight + 1;
        }

        int mod = sum % 11;
        int digit = 11 - mod;
        if (digit >= 10) {
            digit = 0;
        }
        return digit == Character.digit(accessKey.charAt(43), 10);
    }

    private boolean isValidCnpj(String cnpj) {
        if (cnpj == null || cnpj.length() != 14 || cnpj.chars().distinct().count() == 1) {
            return false;
        }

        int firstDigit = calculateCnpjDigit(cnpj.substring(0, 12), new int[] {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2});
        int secondDigit = calculateCnpjDigit(cnpj.substring(0, 12) + firstDigit,
            new int[] {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2});
        return firstDigit == Character.digit(cnpj.charAt(12), 10)
            && secondDigit == Character.digit(cnpj.charAt(13), 10);
    }

    private int calculateCnpjDigit(String base, int[] weights) {
        int sum = 0;
        for (int i = 0; i < weights.length; i++) {
            sum += Character.digit(base.charAt(i), 10) * weights[i];
        }
        int mod = sum % 11;
        return mod < 2 ? 0 : 11 - mod;
    }

    private String onlyDigits(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
    }
}

