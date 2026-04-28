package com.reeva.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reeva.backend.expense.*;
import com.reeva.backend.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.UUID;

@Service
public class OcrService {

    private static final Logger log = LoggerFactory.getLogger(OcrService.class);
    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    private static final String PROMPT = """
        Voce e um auditor de comprovantes de despesas corporativas no Brasil.

        Analise a imagem anexada e extraia apenas dados visiveis ou fortemente evidentes.
        Nao invente valores, datas, CNPJ, fornecedor ou categoria. Quando um campo nao estiver
        visivel com confianca, use null. Se o documento nao for comprovante/nota fiscal/recibo
        corporativo ou estiver ilegivel, marque readable=false e explique o motivo em portugues.

        Regras de classificacao:
        - FOOD: restaurante, alimentacao, lanchonete, cafeteria, delivery de comida.
        - TRANSPORT: taxi, aplicativo de transporte, combustivel, estacionamento, pedagio, transporte publico.
        - LODGING: hotel, pousada, hospedagem, Airbnb.
        - PURCHASE: materiais, equipamentos, supermercado, farmacia, papelaria e outras compras.

        Regras de normalizacao:
        - total_amount deve ser numero decimal em reais, sem simbolo de moeda.
        - issue_date deve estar em ISO-8601: YYYY-MM-DD.
        - supplier_cnpj deve preservar apenas quando estiver visivel; pode manter pontuacao.
        - description deve ser curta, neutra e util para aprovacao da despesa.
        - readable=true exige pelo menos fornecedor ou valor reconhecido com confianca.
        - line_items deve listar os produtos/servicos visiveis na nota. Se nao houver itens legiveis, use [].
        - Para cada item, name deve ser curto e fiel ao texto da nota; quantity, unit_price e total_price podem ser null.
        - score deve representar confianca geral na extracao de 0 a 100.
        - confidence_reason deve explicar brevemente o score.
        - sefaz_verification_code deve conter o codigo/chave de verificacao se estiver visivel.
        - suggested_action deve ser AUTO_APPROVE, MANAGER_REVIEW, EMPLOYEE_CORRECTION ou REJECT.
        """;

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final AiExpenseDecisionService aiExpenseDecisionService;
    private final HttpClient httpClient;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o}")
    private String model;

    @Value("${openai.max-output-tokens:900}")
    private int maxOutputTokens;

    public OcrService(ExpenseRepository expenseRepository, StorageService storageService,
                      ObjectMapper objectMapper, AiExpenseDecisionService aiExpenseDecisionService) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.aiExpenseDecisionService = aiExpenseDecisionService;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Async
    @Transactional
    public void processExpense(UUID expenseId) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OpenAI API key not configured; skipping OCR for expense {}", expenseId);
            fallbackToPendingReview(expenseId, "OCR nao configurado");
            return;
        }

        Expense expense = expenseRepository.findById(expenseId).orElse(null);
        if (expense == null) {
            log.warn("Expense {} not found for OCR", expenseId);
            return;
        }

        if (expense.getAttachments().isEmpty()) {
            log.warn("Expense {} has no attachments; setting PENDING_REVIEW", expenseId);
            fallbackToPendingReview(expenseId, "Sem anexo para analise");
            return;
        }

        var attachment = expense.getAttachments().get(0);
        String mimeType = attachment.getMimeType();

        if ("application/pdf".equals(mimeType)) {
            log.info("Expense {} is a PDF; setting PENDING_REVIEW", expenseId);
            fallbackToPendingReview(expenseId, "PDF recebido; revisao manual necessaria");
            return;
        }

        try {
            OcrResult result = analyzeImage(attachment.getFileUrl(), mimeType);
            applyResult(expense, result);
        } catch (Exception ex) {
            log.error("OCR failed for expense {}: {}", expenseId, ex.getMessage(), ex);
            fallbackToPendingReview(expenseId, "Falha na analise automatica");
        }
    }

    private OcrResult analyzeImage(String fileUrl, String mimeType) throws Exception {
        byte[] imageBytes = storageService.downloadBytes(fileUrl);
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + mimeType + ";base64," + base64;

        var imageContent = java.util.Map.of("type", "image_url", "image_url",
            java.util.Map.of("url", dataUrl, "detail", "high"));
        var textContent = java.util.Map.of("type", "text", "text", PROMPT);
        var message = java.util.Map.of("role", "user",
            "content", java.util.List.of(textContent, imageContent));
        var body = new java.util.LinkedHashMap<String, Object>();
        body.put("model", model);
        body.put("max_completion_tokens", maxOutputTokens);
        body.put("response_format", ocrResponseFormat());
        body.put("messages", java.util.List.of(message));
        String requestBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(OPENAI_URL))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("OpenAI API error " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return parseOcrJson(content);
    }

    private java.util.Map<String, Object> ocrResponseFormat() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("readable", java.util.Map.of("type", "boolean"));
        properties.put("reason", nullableString());
        properties.put("supplier_name", nullableString());
        properties.put("supplier_cnpj", nullableString());
        properties.put("total_amount", java.util.Map.of("type", java.util.List.of("number", "null")));
        properties.put("issue_date", nullableString());
        properties.put("category", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("FOOD", "TRANSPORT", "LODGING", "PURCHASE", null)
        ));
        properties.put("description", nullableString());
        properties.put("score", java.util.Map.of("type", java.util.List.of("integer", "null"), "minimum", 0, "maximum", 100));
        properties.put("confidence_reason", nullableString());
        properties.put("policy_compliant", java.util.Map.of("type", java.util.List.of("boolean", "null")));
        properties.put("policy_reason", nullableString());
        properties.put("sefaz_verification_code", nullableString());
        properties.put("sefaz_reason", nullableString());
        properties.put("suggested_action", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("AUTO_APPROVE", "MANAGER_REVIEW", "EMPLOYEE_CORRECTION", "REJECT", null)
        ));
        properties.put("line_items", java.util.Map.of(
            "type", "array",
            "items", lineItemSchema()
        ));

        var schema = new java.util.LinkedHashMap<String, Object>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("properties", properties);
        schema.put("required", java.util.List.of(
            "readable", "reason", "supplier_name", "supplier_cnpj",
            "total_amount", "issue_date", "category", "description",
            "score", "confidence_reason", "policy_compliant", "policy_reason",
            "sefaz_verification_code", "sefaz_reason", "suggested_action",
            "line_items"
        ));

        return java.util.Map.of(
            "type", "json_schema",
            "json_schema", java.util.Map.of(
                "name", "expense_receipt_ocr",
                "strict", true,
                "schema", schema
            )
        );
    }

    private java.util.Map<String, Object> nullableString() {
        return java.util.Map.of("type", java.util.List.of("string", "null"));
    }

    private java.util.Map<String, Object> nullableNumber() {
        return java.util.Map.of("type", java.util.List.of("number", "null"));
    }

    private java.util.Map<String, Object> lineItemSchema() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("name", nullableString());
        properties.put("quantity", nullableNumber());
        properties.put("unit_price", nullableNumber());
        properties.put("total_price", nullableNumber());

        return java.util.Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", properties,
            "required", java.util.List.of("name", "quantity", "unit_price", "total_price")
        );
    }

    private OcrResult parseOcrJson(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            boolean readable = node.path("readable").asBoolean(false);

            BigDecimal amount = null;
            JsonNode amountNode = node.path("total_amount");
            if (!amountNode.isMissingNode() && !amountNode.isNull()) {
                try {
                    amount = new BigDecimal(amountNode.asText());
                } catch (Exception ignored) {}
            }

            LocalDate issueDate = null;
            String dateStr = node.path("issue_date").asText(null);
            if (dateStr != null && !dateStr.isBlank()) {
                try {
                    issueDate = LocalDate.parse(dateStr);
                } catch (Exception ignored) {}
            }

            return new OcrResult(
                readable,
                node.path("reason").asText(readable ? null : "Ilegivel"),
                node.path("supplier_name").asText(null),
                node.path("supplier_cnpj").asText(null),
                amount,
                issueDate,
                node.path("category").asText(null),
                node.path("description").asText(null),
                readScore(node),
                node.path("confidence_reason").asText(null),
                readBoolean(node, "policy_compliant"),
                node.path("policy_reason").asText(null),
                node.path("sefaz_verification_code").asText(null),
                node.path("sefaz_reason").asText(null),
                node.path("suggested_action").asText(null),
                readLineItems(node),
                json
            );
        } catch (Exception e) {
            log.warn("Failed to parse OCR JSON: {}", json, e);
            return new OcrResult(false, "Erro ao interpretar resposta da IA", null, null, null,
                null, null, null, (short) 0, null, null, null, null, null,
                "EMPLOYEE_CORRECTION", java.util.List.of(), json);
        }
    }

    private java.util.List<OcrResult.LineItem> readLineItems(JsonNode node) {
        JsonNode itemsNode = node.path("line_items");
        if (!itemsNode.isArray()) return java.util.List.of();

        java.util.List<OcrResult.LineItem> items = new java.util.ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            String name = itemNode.path("name").asText(null);
            if (name == null || name.isBlank()) continue;
            items.add(new OcrResult.LineItem(
                name,
                readBigDecimal(itemNode, "quantity"),
                readBigDecimal(itemNode, "unit_price"),
                readBigDecimal(itemNode, "total_price")
            ));
        }
        return items;
    }

    private BigDecimal readBigDecimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        try {
            return new BigDecimal(value.asText());
        } catch (Exception ignored) {
            return null;
        }
    }

    private Short readScore(JsonNode node) {
        JsonNode scoreNode = node.path("score");
        if (scoreNode.isMissingNode() || scoreNode.isNull()) return null;
        int score = scoreNode.asInt(0);
        return (short) Math.max(0, Math.min(100, score));
    }

    private Boolean readBoolean(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        return value.asBoolean();
    }

    @Transactional
    protected void applyResult(Expense expense, OcrResult result) {
        expense.setOcrData(result.rawJson());
        expense.setAiCheckedAt(Instant.now());

        if (result.supplierName() != null) expense.setTitle(result.supplierName());
        if (result.description() != null) expense.setDescription(result.description());
        if (result.totalAmount() != null && result.totalAmount().compareTo(BigDecimal.ZERO) > 0) {
            expense.setAmount(result.totalAmount());
        }
        if (result.issueDate() != null) expense.setExpenseDate(result.issueDate());
        if (result.category() != null) {
            try {
                expense.setCategory(ExpenseCategory.valueOf(result.category()));
            } catch (IllegalArgumentException ignored) {}
        }

        AiExpenseDecision decision = aiExpenseDecisionService.decide(expense, result);
        expense.setAiScore(decision.score());
        expense.setAiAlertLevel(decision.alertLevel());
        expense.setAiAnalysis(decision.summary());
        expense.setAiDecision(decision.decision());
        expense.setAiDecisionReason(decision.summary());
        expense.setPolicyCompliant(decision.policyCompliant());
        expense.setPolicyViolationReason(decision.policyViolationReason());
        expense.setSefazStatus(decision.sefazStatus());
        expense.setSefazValidationMessage(decision.sefazValidationMessage());
        expense.setAutoApprovalEligible(decision.autoApprovalEligible());
        expense.setManualReviewReason(decision.manualReviewReason());

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(decision.status());
        var history = new ExpenseStatusHistory(
            expense, from, decision.status(), null, "IA: " + decision.summary()
        );
        history.setAiScore(decision.score());
        expense.getStatusHistory().add(history);

        expenseRepository.save(expense);
        log.info("OCR applied to expense {} status={} score={} decision={}",
            expense.getId(), decision.status(), decision.score(), decision.decision());
    }

    private void fallbackToPendingReview(UUID expenseId, String reason) {
        expenseRepository.findById(expenseId).ifPresent(expense -> {
            ExpenseStatus from = expense.getStatus();
            expense.transitionTo(ExpenseStatus.PENDING_REVIEW);
            expense.setAiAnalysis(reason);
            expense.setAiDecision(AiDecision.PENDING_MANUAL_REVIEW);
            expense.setAiDecisionReason(reason);
            expense.setManualReviewReason(reason);
            expense.setAutoApprovalEligible(false);
            expense.setAiAlertLevel(AiAlertLevel.MEDIUM);
            expense.setSefazStatus(SefazStatus.UNAVAILABLE);
            expense.setSefazValidationMessage("Validacao fiscal indisponivel sem OCR configurado.");
            expense.setAiCheckedAt(Instant.now());
            expense.getStatusHistory().add(new ExpenseStatusHistory(
                expense, from, ExpenseStatus.PENDING_REVIEW, null, reason
            ));
            expenseRepository.save(expense);
        });
    }
}
