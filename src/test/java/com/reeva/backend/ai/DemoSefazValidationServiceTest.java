package com.reeva.backend.ai;

import com.reeva.backend.expense.SefazStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DemoSefazValidationServiceTest {

    private final DemoSefazValidationService service = new DemoSefazValidationService();

    @Test
    void rejectsSyntheticPlaceholderCnpjEvenWhenReceiptLooksComplete() {
        SefazValidationResult result = service.validate(new SefazValidationRequest(
            "12.345.678/0001-90",
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            "4325 0812 3456 7800 0190 6500 1000 1234 5610 0001 2345"
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.INVALID);
        assertThat(result.message()).contains("CNPJ do fornecedor invalido");
    }

    @Test
    void rejectsAccessKeyWithInvalidCheckDigit() {
        String cnpj = "11.222.333/0001-81";
        String accessKey = buildAccessKey("11222333000181");
        String invalidAccessKey = accessKey.substring(0, 43) + differentDigit(accessKey.charAt(43));

        SefazValidationResult result = service.validate(new SefazValidationRequest(
            cnpj,
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            invalidAccessKey
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.INVALID);
        assertThat(result.message()).contains("digito verificador");
    }

    @Test
    void extractsValidCnpjFromNoisyOcrText() {
        String accessKey = buildAccessKey("11222333000181");

        SefazValidationResult result = service.validate(new SefazValidationRequest(
            "CNPJ 11.222.333/0001-81 IE 123456789 telefone 5555-0101",
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            accessKey
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.VALID);
    }

    @Test
    void usesCnpjEmbeddedInAccessKeyWhenSupplierCnpjOcrIsNoisy() {
        String accessKey = buildAccessKey("11222333000181");

        SefazValidationResult result = service.validate(new SefazValidationRequest(
            "CNPJ parcialmente lido 11.222.333/0001",
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            accessKey
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.VALID);
    }

    @Test
    void inconclusiveCnpjOcrShouldRequireReviewInsteadOfInvalidatingDocument() {
        SefazValidationResult result = service.validate(new SefazValidationRequest(
            "CNPJ parcialmente lido 11.222.333/0001",
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            null
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.UNAVAILABLE);
        assertThat(result.message()).contains("nao pode ser confirmado");
    }

    @Test
    void acceptsStructurallyValidAccessKeyInDemoMode() {
        String accessKey = buildAccessKey("11222333000181");

        SefazValidationResult result = service.validate(new SefazValidationRequest(
            "11.222.333/0001-81",
            LocalDate.of(2025, 8, 15),
            new BigDecimal("60.00"),
            accessKey
        ));

        assertThat(result.status()).isEqualTo(SefazStatus.VALID);
        assertThat(result.message()).contains("validacao estrutural demo");
    }

    private String buildAccessKey(String cnpj) {
        String base = "43"       // RS
            + "2508"             // 2025-08
            + cnpj
            + "65"               // NFC-e
            + "001"              // serie
            + "000123456"        // numero
            + "1"                // tipo emissao
            + "12345678";        // codigo numerico
        return base + calculateAccessKeyDigit(base);
    }

    private int calculateAccessKeyDigit(String base) {
        int sum = 0;
        int weight = 2;
        for (int i = 42; i >= 0; i--) {
            sum += Character.digit(base.charAt(i), 10) * weight;
            weight = weight == 9 ? 2 : weight + 1;
        }
        int mod = sum % 11;
        int digit = 11 - mod;
        return digit >= 10 ? 0 : digit;
    }

    private char differentDigit(char digit) {
        return digit == '9' ? '0' : (char) (digit + 1);
    }
}
