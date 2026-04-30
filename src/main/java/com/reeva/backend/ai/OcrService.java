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
        Voce e um auditor inteligente de comprovantes de despesas corporativas no Brasil,
        especializado em analisar imagens de notas fiscais, cupons, recibos e comprovantes de pagamento.

        Sua tarefa e analisar a imagem anexada e retornar APENAS um JSON valido, sem explicacoes fora do JSON.

        Objetivo:
        Extrair dados reais e visiveis do documento, classificar a despesa, avaliar confiabilidade e sugerir
        acao automatica no fluxo corporativo.

        Principios obrigatorios:
        - Nunca invente informacoes.
        - Nunca estime valores ilegiveis.
        - Nunca complete CNPJ, datas ou nomes parcialmente visiveis.
        - Use null quando nao houver certeza.
        - Baseie-se apenas no que esta visivel ou fortemente evidente.
        - Se a imagem estiver cortada, borrada, escura, inclinada ou ilegivel, reduza score.
        - Se nao for documento de despesa corporativa, marque readable=false.

        Tipos de documento aceitos:
        - Nota fiscal
        - NFC-e
        - SAT
        - Cupom fiscal
        - Recibo simples
        - Fatura com comprovante de pagamento
        - Comprovante de estacionamento
        - Ticket de pedagio
        - Voucher de transporte
        - Recibo de hotel
        - Comprovante de aplicativo de mobilidade

        Tipos invalidos:
        - Selfie
        - Foto aleatoria
        - Conversa de WhatsApp
        - Documento pessoal sem despesa
        - Tela sem comprovante
        - Imagem vazia
        - Documento totalmente ilegivel

        Classificacao de categoria:
        - FOOD: restaurante, cafeteria, padaria, delivery, alimentacao.
        - TRANSPORT: Uber, 99, taxi, combustivel, estacionamento, pedagio, metro, onibus, locomocao.
        - LODGING: hotel, pousada, Airbnb, hospedagem.
        - PURCHASE: farmacia, papelaria, mercado, materiais, eletronicos, compras em geral.
        - OTHER: quando for despesa valida mas nao encaixar acima.

        Regras de extracao:
        - readable=true exige pelo menos fornecedor OU valor total identificavel com confianca.
        - currency sempre "BRL" quando houver contexto brasileiro.
        - total_amount em decimal, sem R$.
        - tax_amount apenas se claramente visivel.
        - issue_date no formato YYYY-MM-DD.
        - issue_time no formato HH:MM:SS quando visivel.
        - supplier_name nome principal do estabelecimento.
        - supplier_cnpj apenas se legivel.
        - supplier_address apenas se claramente visivel.
        - payment_method: CREDIT_CARD, DEBIT_CARD, PIX, CASH, MEAL_VOUCHER, UNKNOWN.
        - document_type: NFE, NFCE, CUPOM, RECIBO, HOTEL, APP_RIDE, PEDAGIO, PARKING, OTHER.
        - description curta, neutra e util para aprovacao.
        - line_items listar itens legiveis.
        - sefaz_verification_code incluir chave de acesso, QR code textual, codigo consulta ou COO quando visivel.
        - policy_compliant deve avaliar a politica atual da empresa enviada abaixo quando houver dados suficientes;
          use null quando nao der para concluir.
        - policy_reason deve explicar brevemente a avaliacao de politica ou ser null.
        - sefaz_reason deve explicar se ha ou nao codigo fiscal verificavel, sem criar impedimento quando o documento
          validamente nao tiver codigo fiscal.

        Regras de line_items:
        Cada item deve conter name, quantity, unit_price e total_price.
        Se nao houver itens legiveis, use [].

        Regras de score, de 0 a 100:
        - 90 a 100: documento claro, campos principais legiveis, alta confianca.
        - 70 a 89: maioria legivel, pequenas duvidas.
        - 50 a 69: leitura parcial, revisao indicada.
        - 1 a 49: baixa qualidade ou poucos dados confiaveis.
        - 0: documento invalido.

        Acoes sugeridas:
        - AUTO_APPROVE: valor claro, fornecedor identificado, documento valido, score alto.
        - MANAGER_REVIEW: documento valido com duvidas, categoria sensivel, score medio.
        - EMPLOYEE_CORRECTION: imagem ruim, faltando dados importantes, corte parcial, valor ilegivel.
        - REJECT: documento invalido, duplicado evidente, fraude aparente, nao relacionado a despesa.

        Sinais de possivel fraude ou risco:
        - valor adulterado
        - multiplas sobreposicoes
        - edicao digital evidente
        - datas incoerentes
        - total diferente da soma dos itens
        - documento repetido
        - baixa consistencia visual

        Campos extras:
        - duplicate_suspected: true/false
        - fraud_signals: lista textual
        - confidence_reason: motivo curto do score

        Formato obrigatorio de saida:
        {
          "readable": true,
          "reason": null,
          "document_type": "NFCE",
          "category": "FOOD",
          "supplier_name": "Restaurante Exemplo",
          "supplier_cnpj": "12.345.678/0001-90",
          "supplier_address": null,
          "issue_date": "2026-04-29",
          "issue_time": "13:45:10",
          "currency": "BRL",
          "total_amount": 58.90,
          "tax_amount": null,
          "payment_method": "CREDIT_CARD",
          "description": "Almoco em restaurante",
          "line_items": [
            {
              "name": "Prato executivo",
              "quantity": 1,
              "unit_price": 45.00,
              "total_price": 45.00
            }
          ],
          "sefaz_verification_code": null,
          "sefaz_reason": null,
          "policy_compliant": true,
          "policy_reason": null,
          "duplicate_suspected": false,
          "fraud_signals": [],
          "score": 92,
          "confidence_reason": "Documento nitido com fornecedor e valor claramente visiveis.",
          "suggested_action": "AUTO_APPROVE"
        }

        Regras finais:
        - Retorne somente JSON.
        - Sem markdown.
        - Sem comentarios.
        - Sem texto antes ou depois.
        - Use null onde houver duvida.
        """;

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final AiExpenseDecisionService aiExpenseDecisionService;
    private final ExpensePolicyRepository policyRepository;
    private final HttpClient httpClient;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o}")
    private String model;

    @Value("${openai.max-output-tokens:900}")
    private int maxOutputTokens;

    public OcrService(ExpenseRepository expenseRepository, StorageService storageService,
                      ObjectMapper objectMapper, AiExpenseDecisionService aiExpenseDecisionService,
                      ExpensePolicyRepository policyRepository) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.aiExpenseDecisionService = aiExpenseDecisionService;
        this.policyRepository = policyRepository;
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
            OcrResult result = analyzeImage(attachment.getFileUrl(), mimeType, expense);
            applyResult(expense, result);
        } catch (OpenAiApiException ex) {
            log.error("OCR failed for expense {}: OpenAI API {} code={} message={}",
                expenseId, ex.statusCode(), ex.code(), ex.apiMessage());
            fallbackToPendingReview(expenseId, friendlyOpenAiError(ex));
        } catch (Exception ex) {
            log.error("OCR failed for expense {}: {}", expenseId, ex.getMessage(), ex);
            fallbackToPendingReview(expenseId, "Falha na analise automatica");
        }
    }

    private OcrResult analyzeImage(String fileUrl, String mimeType, Expense expense) throws Exception {
        byte[] imageBytes = storageService.downloadBytes(fileUrl);
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + mimeType + ";base64," + base64;
        String prompt = PROMPT + "\n\nPolitica atual da empresa:\n" + buildPolicyContext(expense);

        var imageContent = java.util.Map.of("type", "image_url", "image_url",
            java.util.Map.of("url", dataUrl, "detail", "high"));
        var textContent = java.util.Map.of("type", "text", "text", prompt);
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
            throw parseOpenAiError(response.statusCode(), response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return parseOcrJson(content);
    }

    private OpenAiApiException parseOpenAiError(int statusCode, String body) {
        try {
            JsonNode error = objectMapper.readTree(body).path("error");
            String message = error.path("message").asText(body);
            String code = error.path("code").asText("");
            String type = error.path("type").asText("");
            return new OpenAiApiException(statusCode, code, type, message, body);
        } catch (Exception ignored) {
            return new OpenAiApiException(statusCode, "", "", body, body);
        }
    }

    private String friendlyOpenAiError(OpenAiApiException ex) {
        if ("insufficient_quota".equals(ex.code())) {
            return "OpenAI sem quota/creditos no projeto da API. Ative billing ou aumente o limite para gerar o OCR.";
        }
        if (ex.statusCode() == 401 || ex.statusCode() == 403) {
            return "OpenAI recusou a chave da API. Verifique OPENAI_API_KEY e permissoes do projeto.";
        }
        if (ex.statusCode() == 429) {
            return "OpenAI limitou a requisicao. Aguarde alguns instantes ou ajuste os limites do projeto.";
        }
        if (ex.statusCode() == 400) {
            return "OpenAI recusou o formato da requisicao OCR: " + ex.apiMessage();
        }
        return "Falha na OpenAI durante OCR: " + ex.apiMessage();
    }

    private String buildPolicyContext(Expense expense) {
        var policies = policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(expense.getCompany().getId());
        if (policies.isEmpty()) {
            return "- Nenhuma politica cadastrada. Avalie apenas legibilidade e dados fiscais.";
        }

        return policies.stream()
            .map(policy -> "- " + policy.getCategory()
                + ": limite por despesa R$ " + policy.getMaxAmount()
                + (policy.getDailyLimit() != null ? ", limite diario R$ " + policy.getDailyLimit() : "")
                + (policy.getMonthlyLimit() != null ? ", limite mensal R$ " + policy.getMonthlyLimit() : "")
                + (policy.isRequiresReceipt() ? ", comprovante obrigatorio" : ", comprovante opcional")
                + ", autoaprovacao exige score minimo " + policy.getAutoApprovalMinScore()
                + (policy.getDescription() != null && !policy.getDescription().isBlank()
                    ? ". Regras: " + policy.getDescription()
                    : ""))
            .collect(java.util.stream.Collectors.joining("\n"));
    }

    private java.util.Map<String, Object> ocrResponseFormat() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("readable", java.util.Map.of("type", "boolean"));
        properties.put("reason", nullableString());
        properties.put("document_type", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("NFE", "NFCE", "CUPOM", "RECIBO", "HOTEL", "APP_RIDE", "PEDAGIO", "PARKING", "OTHER", null)
        ));
        properties.put("supplier_name", nullableString());
        properties.put("supplier_cnpj", nullableString());
        properties.put("supplier_address", nullableString());
        properties.put("total_amount", java.util.Map.of("type", java.util.List.of("number", "null")));
        properties.put("tax_amount", java.util.Map.of("type", java.util.List.of("number", "null")));
        properties.put("issue_date", nullableString());
        properties.put("issue_time", nullableString());
        properties.put("currency", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("BRL", null)
        ));
        properties.put("payment_method", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("CREDIT_CARD", "DEBIT_CARD", "PIX", "CASH", "MEAL_VOUCHER", "UNKNOWN", null)
        ));
        properties.put("category", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("FOOD", "TRANSPORT", "LODGING", "PURCHASE", "OTHER", null)
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
        properties.put("duplicate_suspected", java.util.Map.of("type", "boolean"));
        properties.put("fraud_signals", java.util.Map.of(
            "type", "array",
            "items", java.util.Map.of("type", "string")
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
            "readable", "reason", "document_type", "supplier_name", "supplier_cnpj",
            "supplier_address", "total_amount", "tax_amount", "issue_date", "issue_time",
            "currency", "payment_method", "category", "description",
            "score", "confidence_reason", "policy_compliant", "policy_reason",
            "sefaz_verification_code", "sefaz_reason", "suggested_action",
            "duplicate_suspected", "fraud_signals",
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

    private static class OpenAiApiException extends RuntimeException {
        private final int statusCode;
        private final String code;
        private final String type;
        private final String apiMessage;
        private final String rawBody;

        private OpenAiApiException(int statusCode, String code, String type, String apiMessage, String rawBody) {
            this.statusCode = statusCode;
            this.code = code;
            this.type = type;
            this.apiMessage = (apiMessage == null || apiMessage.isBlank()) ? rawBody : apiMessage;
            this.rawBody = rawBody;
        }

        int statusCode() { return statusCode; }
        String code() { return code; }
        String type() { return type; }
        String apiMessage() { return apiMessage; }
        String rawBody() { return rawBody; }

        @Override
        public String getMessage() {
            return "OpenAI API error " + statusCode + " code=" + code + ": " + apiMessage;
        }
    }
}
