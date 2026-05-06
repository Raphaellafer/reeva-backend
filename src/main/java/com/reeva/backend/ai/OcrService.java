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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class OcrService {

    private static final Logger log = LoggerFactory.getLogger(OcrService.class);
    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final Pattern MONEY_PATTERN = Pattern.compile("(?:R\\$\\s*)?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2})");

    private static final String EXTRACTION_PROMPT = """
        Voce e um especialista em extracao inteligente de dados de documentos fiscais brasileiros.

        Sua tarefa NAO e decidir aprovacao, politica, fraude, categoria corporativa ou reembolso.
        Sua unica tarefa e extrair o maximo possivel de informacoes visiveis do documento.

        IMPORTANTE:
        A extracao deve ser feita CAMPO POR CAMPO.
        Nunca trate o documento como totalmente valido ou invalido.
        Mesmo que partes da imagem estejam ruins, borradas, cortadas ou ilegiveis, continue tentando extrair todos
        os outros campos separadamente.

        Objetivo principal:
        Maximizar recuperacao parcial de dados.

        Principios obrigatorios:
        - Nunca invente informacoes.
        - Nunca complete numeros parcialmente ocultos.
        - Nunca estime valores ilegiveis.
        - Nunca deduza CNPJ incompleto.
        - Cada campo deve possuir sua propria confianca.
        - Campos ilegiveis NAO invalidam os demais campos.
        - Campos ausentes NAO reduzem automaticamente a confianca global.
        - Extraia tudo que for possivel com confianca individual.
        - Um documento parcialmente legivel ainda possui valor.
        - Quando houver ambiguidade, preserve o valor bruto visivel.
        - Nao descarte o documento apenas porque faltam campos obrigatorios.

        Comportamento esperado:
        ERRADO: "Documento ilegivel"
        CORRETO: "Consegui extrair valor total e data, mas nao consegui identificar o CNPJ."

        Voce deve agir como um parser fiscal incremental.

        Tipos aceitos:
        Nota fiscal, NFC-e, SAT, Cupom, Recibo, Comprovante, Ticket, Voucher, comprovante de aplicativo,
        recibo de hotel, estacionamento e pedagio.

        Para CADA campo:
        - tente extrair;
        - atribua confidence individual entre 0.0 e 1.0;
        - informe extraction_status.

        Valores possiveis para extraction_status:
        FOUND, PARTIAL, UNCERTAIN, NOT_FOUND, ILLEGIBLE.

        Mesmo quando extraction_status != FOUND, preserve qualquer informacao parcial util em raw_text.
        Exemplo: supplier_cnpj.raw_text = "12.345.xxx".

        Prioridade visual:
        Campos proximos a TOTAL, VALOR TOTAL, TOTAL R$, TOTAL A PAGAR, VALOR PAGO, CNPJ, DATA, CPF,
        VALOR, QR CODE, CHAVE DE ACESSO e COO devem receber prioridade de atencao.

        Regras por campo:
        - total_amount: normalize value como numero decimal quando legivel; preserve raw_text como apareceu.
        - Em notas brasileiras, virgula costuma ser decimal. Exemplo: 46,50 significa 46.50, nunca 465.00.
        - Em notas brasileiras, quantidade pode aparecer com quatro casas decimais. Exemplo: 1,0000 significa 1 unidade,
          nunca 1000 unidades.
        - Para item de alimentacao/restaurante, se a quantidade lida for 1000, 10000 ou 100000 e o raw_text tiver
          "1,0000", normalize para 1.
        - Quando aparecer uma linha como "1,0000 UN 46,50 46,50", extraia quantity=1, unit_price=46.50,
          total_price=46.50.
        - Nunca transforme "46,50" em 465.00.
        - Nunca transforme "1,0000" em 1000.
        - total_amount deve ser conferido contra a soma dos itens quando os itens estiverem legiveis.
        - Se houver itens legiveis, confira se sum(line_items.total_price) bate com total_amount.
        - Se o total geral e a soma dos itens divergirem, preserve ambos, mas registre a divergencia em extraction_notes.
        - supplier_name: priorize o nome fantasia principal.
        - supplier_cnpj: nunca invente digitos faltantes.
        - issue_date: normalize value em YYYY-MM-DD quando possivel; preserve raw_text original.
        - issue_time: normalize value em HH:MM:SS quando possivel.
        - line_items: extraia parcialmente quando possivel.
        - QR code/chave fiscal: preserve qualquer texto relacionado.
        - Se houver chave de acesso, QR code textual, codigo de consulta, COO, NFC-e ou numero de documento,
          extraia em sefaz_verification_code com raw_text.
        - Primeiro capture raw_text, depois normalize value.

        Regras finais:
        - Retorne apenas JSON valido.
        - Nunca retorne markdown.
        - Nunca explique fora do JSON.
        - Preserve textos brutos quando uteis.
        - Priorize recuperacao maxima de dados.
        - Priorize extracao parcial ao inves de abandono.
        - Cada campo deve ser analisado independentemente.
        """;

    private static final String RAW_OCR_CONTEXT_TEMPLATE = """

        OCR bruto auxiliar:
        O texto abaixo veio de um OCR tradicional e pode conter erros, quebras de linha ruins ou caracteres trocados.
        Use apenas como apoio para a leitura visual da imagem. A imagem continua sendo a fonte principal.
        Preserve raw_text quando o OCR bruto ajudar a recuperar campos parciais.

        %s
        """;

    private static final String ANALYSIS_PROMPT = """
        Voce classifica uma extracao OCR de comprovante corporativo brasileiro.

        Entrada: JSON de extracao campo por campo.
        Sua tarefa NAO e aprovar, reprovar ou aplicar politica da empresa.
        Sua tarefa e somente:
        - dizer se algum documento de despesa foi detectado;
        - classificar a categoria corporativa;
        - gerar uma descricao curta para aprovacao;
        - gerar um score tecnico de confianca da extracao, de 0 a 100.

        Categorias:
        - FOOD: restaurante, cafeteria, padaria, delivery, alimentacao.
        - TRANSPORT: Uber, 99, taxi, combustivel, estacionamento, pedagio, metro, onibus, locomocao.
        - LODGING: hotel, pousada, Airbnb, hospedagem.
        - PURCHASE: farmacia, papelaria, mercado, materiais, eletronicos, compras em geral.
        - OTHER: despesa valida que nao encaixa acima.

        Regras:
        - Nao use politica, fraude ou aprovacao.
        - Nao puna automaticamente campos ausentes quando outros campos foram extraidos com confianca.
        - Se total_amount estiver ausente, incerto ou ilegivel, readable=false.
        - Se a soma dos itens legiveis divergir do total_amount, readable=false.
        - O score deve refletir a confianca tecnica nos campos recuperados e a qualidade da imagem.
        - Se houver valor total validado e fornecedor ou data com boa confianca, o documento pode ser considerado readable.
        - Se nao houver documento de despesa detectado, readable=false.

        Retorne somente JSON valido.
        """;

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final AiExpenseDecisionService aiExpenseDecisionService;
    private final ExpensePolicyRepository policyRepository;
    private final TraditionalOcrService traditionalOcrService;
    private final HttpClient httpClient;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o}")
    private String model;

    @Value("${openai.max-output-tokens:900}")
    private int maxOutputTokens;

    public OcrService(ExpenseRepository expenseRepository, StorageService storageService,
                      ObjectMapper objectMapper, AiExpenseDecisionService aiExpenseDecisionService,
                      ExpensePolicyRepository policyRepository, TraditionalOcrService traditionalOcrService) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.aiExpenseDecisionService = aiExpenseDecisionService;
        this.policyRepository = policyRepository;
        this.traditionalOcrService = traditionalOcrService;
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
        String rawOcrText = traditionalOcrService.extractText(imageBytes, mimeType);
        String extractionPrompt = rawOcrText == null || rawOcrText.isBlank()
            ? EXTRACTION_PROMPT
            : EXTRACTION_PROMPT + RAW_OCR_CONTEXT_TEMPLATE.formatted(rawOcrText);

        var imageContent = java.util.Map.of("type", "image_url", "image_url",
            java.util.Map.of("url", dataUrl, "detail", "high"));
        var textContent = java.util.Map.of("type", "text", "text", extractionPrompt);
        String extractionJson = callOpenAi(java.util.List.of(java.util.Map.of(
            "role", "user",
            "content", java.util.List.of(textContent, imageContent)
        )), extractionResponseFormat());

        String analysisJson = callOpenAi(java.util.List.of(java.util.Map.of(
            "role", "user",
            "content", ANALYSIS_PROMPT + "\n\nExtracao OCR:\n" + extractionJson
        )), analysisResponseFormat());

        return parseOcrJson(extractionJson, analysisJson, rawOcrText);
    }

    private String callOpenAi(java.util.List<java.util.Map<String, Object>> messages,
                              java.util.Map<String, Object> responseFormat) throws Exception {
        var body = new java.util.LinkedHashMap<String, Object>();
        body.put("model", model);
        body.put("max_completion_tokens", maxOutputTokens);
        body.put("temperature", 0.1);
        body.put("response_format", responseFormat);
        body.put("messages", messages);
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
        return root.path("choices").get(0).path("message").path("content").asText();
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

    private java.util.Map<String, Object> extractionResponseFormat() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("document_detected", java.util.Map.of("type", "boolean"));
        properties.put("document_type", fieldSchema(java.util.Arrays.asList(
            "NFE", "NFCE", "SAT", "CUPOM", "RECIBO", "HOTEL", "APP_RIDE", "PEDAGIO", "PARKING", "OTHER", null
        ), false));
        properties.put("supplier_name", fieldSchema(null, true));
        properties.put("supplier_cnpj", fieldSchema(null, true));
        properties.put("supplier_address", fieldSchema(null, true));
        properties.put("issue_date", fieldSchema(null, true));
        properties.put("issue_time", fieldSchema(null, true));
        properties.put("total_amount", fieldSchema(null, true));
        properties.put("tax_amount", fieldSchema(null, true));
        properties.put("payment_method", fieldSchema(java.util.Arrays.asList(
            "CREDIT_CARD", "DEBIT_CARD", "PIX", "CASH", "MEAL_VOUCHER", "UNKNOWN", null
        ), false));
        properties.put("currency", fieldSchema(java.util.Arrays.asList("BRL", null), false));
        properties.put("sefaz_verification_code", fieldSchema(null, true));
        properties.put("line_items", java.util.Map.of(
            "type", "array",
            "items", lineItemSchema()
        ));
        properties.put("image_quality", imageQualitySchema());
        properties.put("overall_confidence", java.util.Map.of("type", "number", "minimum", 0, "maximum", 1));
        properties.put("missing_required_fields", stringArraySchema());
        properties.put("manual_input_required", stringArraySchema());
        properties.put("extraction_notes", stringArraySchema());

        var schema = new java.util.LinkedHashMap<String, Object>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("properties", properties);
        schema.put("required", java.util.List.of(
            "document_detected", "document_type", "supplier_name", "supplier_cnpj",
            "supplier_address", "issue_date", "issue_time", "total_amount", "tax_amount",
            "payment_method", "currency", "sefaz_verification_code", "line_items",
            "image_quality", "overall_confidence", "missing_required_fields",
            "manual_input_required", "extraction_notes"
        ));

        return java.util.Map.of(
            "type", "json_schema",
            "json_schema", java.util.Map.of(
                "name", "expense_receipt_extraction",
                "strict", true,
                "schema", schema
            )
        );
    }

    private java.util.Map<String, Object> analysisResponseFormat() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("readable", java.util.Map.of("type", "boolean"));
        properties.put("reason", nullableString());
        properties.put("category", java.util.Map.of(
            "type", java.util.List.of("string", "null"),
            "enum", java.util.Arrays.asList("FOOD", "TRANSPORT", "LODGING", "PURCHASE", "OTHER", null)
        ));
        properties.put("description", nullableString());
        properties.put("score", java.util.Map.of("type", java.util.List.of("integer", "null"), "minimum", 0, "maximum", 100));
        properties.put("confidence_reason", nullableString());

        var schema = new java.util.LinkedHashMap<String, Object>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("properties", properties);
        schema.put("required", java.util.List.of(
            "readable", "reason", "category", "description", "score", "confidence_reason"
        ));

        return java.util.Map.of(
            "type", "json_schema",
            "json_schema", java.util.Map.of(
                "name", "expense_receipt_analysis",
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

    private java.util.Map<String, Object> fieldSchema(java.util.List<?> valueEnum, boolean includeRawText) {
        var properties = new java.util.LinkedHashMap<String, Object>();
        if (valueEnum == null) {
            properties.put("value", java.util.Map.of("type", java.util.List.of("string", "number", "null")));
        } else {
            properties.put("value", java.util.Map.of(
                "type", java.util.List.of("string", "null"),
                "enum", valueEnum
            ));
        }
        if (includeRawText) {
            properties.put("raw_text", nullableString());
        }
        properties.put("confidence", java.util.Map.of("type", "number", "minimum", 0, "maximum", 1));
        properties.put("extraction_status", java.util.Map.of(
            "type", "string",
            "enum", java.util.List.of("FOUND", "PARTIAL", "UNCERTAIN", "NOT_FOUND", "ILLEGIBLE")
        ));

        var required = new java.util.ArrayList<String>();
        required.add("value");
        if (includeRawText) required.add("raw_text");
        required.add("confidence");
        required.add("extraction_status");

        return java.util.Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", properties,
            "required", required
        );
    }

    private java.util.Map<String, Object> imageQualitySchema() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("blurry", java.util.Map.of("type", "boolean"));
        properties.put("cutoff", java.util.Map.of("type", "boolean"));
        properties.put("dark", java.util.Map.of("type", "boolean"));
        properties.put("tilted", java.util.Map.of("type", "boolean"));
        properties.put("low_resolution", java.util.Map.of("type", "boolean"));

        return java.util.Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", properties,
            "required", java.util.List.of("blurry", "cutoff", "dark", "tilted", "low_resolution")
        );
    }

    private java.util.Map<String, Object> stringArraySchema() {
        return java.util.Map.of(
            "type", "array",
            "items", java.util.Map.of("type", "string")
        );
    }

    private java.util.Map<String, Object> lineItemSchema() {
        var properties = new java.util.LinkedHashMap<String, Object>();
        properties.put("name", fieldSchema(null, true));
        properties.put("quantity", fieldSchema(null, true));
        properties.put("unit_price", fieldSchema(null, true));
        properties.put("total_price", fieldSchema(null, true));

        return java.util.Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", properties,
            "required", java.util.List.of("name", "quantity", "unit_price", "total_price")
        );
    }

    private OcrResult parseOcrJson(String extractionJson, String analysisJson, String rawOcrText) {
        try {
            JsonNode extraction = objectMapper.readTree(extractionJson);
            JsonNode analysis = objectMapper.readTree(analysisJson);
            boolean readable = analysis.path("readable").asBoolean(extraction.path("document_detected").asBoolean(false));

            BigDecimal amount = readMoneyField(extraction, "total_amount");
            LocalDate issueDate = readFieldLocalDate(extraction, "issue_date");
            java.util.List<OcrResult.LineItem> lineItems = readLineItems(extraction);
            String validationReason = validateExtractedAmount(amount, lineItems);
            if (validationReason != null) {
                readable = false;
            }
            String rawJson = objectMapper.writeValueAsString(java.util.Map.of(
                "raw_ocr_text", rawOcrText == null ? "" : rawOcrText,
                "extraction", objectMapper.readTree(extractionJson),
                "analysis", objectMapper.readTree(analysisJson),
                "amount_validation", validationReason == null ? "OK" : validationReason
            ));

            return new OcrResult(
                readable,
                validationReason != null
                    ? validationReason
                    : analysis.path("reason").asText(readable ? null : "Documento nao detectado"),
                readFieldText(extraction, "supplier_name"),
                readFieldText(extraction, "supplier_cnpj"),
                amount,
                issueDate,
                analysis.path("category").asText(null),
                analysis.path("description").asText(null),
                validationReason != null ? capScoreForInvalidAmount(readScore(analysis)) : readScore(analysis),
                validationReason != null
                    ? appendReason(analysis.path("confidence_reason").asText(null), validationReason)
                    : analysis.path("confidence_reason").asText(null),
                null,
                null,
                readFieldText(extraction, "sefaz_verification_code"),
                buildSefazReason(extraction),
                null,
                lineItems,
                rawJson
            );
        } catch (Exception e) {
            log.warn("Failed to parse OCR JSON: extraction={} analysis={}", extractionJson, analysisJson, e);
            return new OcrResult(false, "Erro ao interpretar resposta da IA", null, null, null,
                null, null, null, (short) 0, null, null, null, null, null,
                null, java.util.List.of(), extractionJson);
        }
    }

    private java.util.List<OcrResult.LineItem> readLineItems(JsonNode node) {
        JsonNode itemsNode = node.path("line_items");
        if (!itemsNode.isArray()) return java.util.List.of();

        java.util.List<OcrResult.LineItem> items = new java.util.ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            String name = readFieldText(itemNode, "name");
            if (name == null || name.isBlank()) continue;
            items.add(new OcrResult.LineItem(
                name,
                readQuantityField(itemNode, "quantity"),
                readMoneyField(itemNode, "unit_price"),
                readMoneyField(itemNode, "total_price")
            ));
        }
        return items;
    }

    private String validateExtractedAmount(BigDecimal totalAmount, java.util.List<OcrResult.LineItem> lineItems) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return "Valor total da nota nao foi lido com confianca. Funcionario deve tirar uma nova foto.";
        }

        if (lineItems.isEmpty()) {
            return null;
        }

        BigDecimal sum = BigDecimal.ZERO;
        int completeItems = 0;
        for (OcrResult.LineItem item : lineItems) {
            if (item.quantity() != null && item.quantity().compareTo(new BigDecimal("100")) > 0) {
                return "Quantidade de item lida como " + item.quantity()
                    + ", valor improvavel para nota de reembolso. Funcionario deve tirar uma nova foto.";
            }
            BigDecimal itemTotal = item.totalPrice();
            if (itemTotal == null && item.quantity() != null && item.unitPrice() != null) {
                itemTotal = item.quantity().multiply(item.unitPrice());
            }
            if (item.quantity() != null && item.unitPrice() != null && item.totalPrice() != null) {
                BigDecimal expected = item.quantity().multiply(item.unitPrice());
                if (expected.subtract(item.totalPrice()).abs().compareTo(new BigDecimal("0.05")) > 0) {
                    return "Quantidade, valor unitario e total do item nao batem. Funcionario deve tirar uma nova foto.";
                }
            }
            if (itemTotal == null) {
                continue;
            }
            sum = sum.add(itemTotal);
            completeItems++;
        }

        if (completeItems == 0) {
            return null;
        }

        BigDecimal difference = totalAmount.subtract(sum).abs();
        if (difference.compareTo(new BigDecimal("0.05")) > 0) {
            return "Valor total da nota diverge da soma dos itens lidos. Total: " + totalAmount
                + "; soma dos itens: " + sum + ". Funcionario deve tirar uma nova foto.";
        }
        return null;
    }

    private String appendReason(String current, String addition) {
        if (current == null || current.isBlank()) {
            return addition;
        }
        return current + " " + addition;
    }

    private String readFieldText(JsonNode node, String field) {
        JsonNode value = node.path(field).path("value");
        if (!value.isMissingNode() && !value.isNull() && !value.asText().isBlank()) {
            return value.asText();
        }
        JsonNode rawText = node.path(field).path("raw_text");
        if (!rawText.isMissingNode() && !rawText.isNull() && !rawText.asText().isBlank()) {
            return rawText.asText();
        }
        return null;
    }

    private String readRawFieldText(JsonNode node, String field) {
        JsonNode rawText = node.path(field).path("raw_text");
        if (!rawText.isMissingNode() && !rawText.isNull() && !rawText.asText().isBlank()) {
            return rawText.asText();
        }
        JsonNode value = node.path(field).path("value");
        if (!value.isMissingNode() && !value.isNull() && !value.asText().isBlank()) {
            return value.asText();
        }
        return null;
    }

    private BigDecimal readMoneyField(JsonNode node, String field) {
        String raw = readRawFieldText(node, field);
        BigDecimal fromRaw = parseMoney(raw);
        if (fromRaw != null) return fromRaw;
        return readFieldBigDecimal(node, field);
    }

    private BigDecimal parseMoney(String text) {
        if (text == null || text.isBlank()) return null;
        var matcher = MONEY_PATTERN.matcher(text);
        String lastMatch = null;
        while (matcher.find()) {
            lastMatch = matcher.group(1);
        }
        if (lastMatch == null) return null;
        try {
            String normalized = lastMatch.contains(",")
                ? lastMatch.replace(".", "").replace(",", ".")
                : lastMatch;
            return new BigDecimal(normalized);
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal readQuantityField(JsonNode node, String field) {
        String raw = readRawFieldText(node, field);
        BigDecimal quantity = parseBrazilianDecimal(raw);
        if (quantity == null) {
            quantity = readFieldBigDecimal(node, field);
        }
        if (quantity == null) return null;
        if (quantity.compareTo(new BigDecimal("100")) > 0 && raw != null && raw.contains(",")) {
            BigDecimal repaired = parseBrazilianDecimal(raw);
            if (repaired != null && repaired.compareTo(new BigDecimal("100")) <= 0) {
                return repaired;
            }
        }
        return quantity.stripTrailingZeros();
    }

    private BigDecimal parseBrazilianDecimal(String text) {
        if (text == null || text.isBlank()) return null;
        String compact = text.replace(" ", "");
        var matcher = Pattern.compile("\\d+(?:[,.]\\d+)?").matcher(compact);
        if (!matcher.find()) return null;
        String number = matcher.group();
        try {
            String normalized = number.contains(",")
                ? number.replace(".", "").replace(",", ".")
                : number;
            return new BigDecimal(normalized);
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal readFieldBigDecimal(JsonNode node, String field) {
        String value = readFieldText(node, field);
        if (value == null || value.isBlank()) return null;
        try {
            String normalized = value.replace("R$", "")
                .replace(" ", "")
                .replace(".", "")
                .replace(",", ".");
            return new BigDecimal(normalized);
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate readFieldLocalDate(JsonNode node, String field) {
        String value = readFieldText(node, field);
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (Exception ignored) {
            try {
                return java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy").parse(value, LocalDate::from);
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private String buildSefazReason(JsonNode extraction) {
        JsonNode field = extraction.path("sefaz_verification_code");
        String status = field.path("extraction_status").asText("NOT_FOUND");
        if ("FOUND".equals(status) || "PARTIAL".equals(status)) {
            return "Codigo fiscal extraido com status " + status + ".";
        }
        return "Codigo fiscal nao encontrado ou ilegivel na extracao OCR.";
    }

    private String buildReceiptFingerprint(OcrResult result) {
        if (result.totalAmount() == null || result.issueDate() == null) {
            return null;
        }

        String fiscalCode = normalizeFingerprintPart(result.sefazVerificationCode());
        String supplierCnpj = normalizeDigits(result.supplierCnpj());
        String supplierName = normalizeFingerprintPart(result.supplierName());

        String identity;
        if (fiscalCode != null && fiscalCode.length() >= 8) {
            identity = "code:" + fiscalCode;
        } else if (supplierCnpj != null && supplierCnpj.length() >= 8) {
            identity = "cnpj:" + supplierCnpj;
        } else if (supplierName != null && supplierName.length() >= 4) {
            identity = "supplier:" + supplierName;
        } else {
            return null;
        }

        String source = identity
            + "|date:" + result.issueDate()
            + "|amount:" + result.totalAmount().setScale(2, java.math.RoundingMode.HALF_UP);
        return sha256(source);
    }

    private String normalizeFingerprintPart(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeDigits(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.replaceAll("\\D", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash receipt fingerprint", ex);
        }
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

    private short capScoreForInvalidAmount(Short score) {
        if (score == null) return 0;
        return (short) Math.min(score, 49);
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

        String fingerprint = buildReceiptFingerprint(result);
        if (fingerprint != null) {
            expense.setReceiptFingerprint(fingerprint);
            var duplicates = expenseRepository.findActiveDuplicatesByFingerprint(
                expense.getCompany().getId(), fingerprint, expense.getId()
            );
            if (!duplicates.isEmpty()) {
                markAsDuplicate(expense, duplicates.get(0), result);
                return;
            }
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

    private void markAsDuplicate(Expense expense, Expense original, OcrResult result) {
        expense.setDuplicateOfExpense(original);
        expense.setAiScore(result.score() == null ? 0 : (short) Math.min(result.score(), 20));
        expense.setAiAlertLevel(AiAlertLevel.HIGH);
        expense.setAiAnalysis("Nota duplicada: este documento ja foi enviado anteriormente por outro usuario ou pela mesma conta.");
        expense.setAiDecision(AiDecision.PENDING_MANUAL_REVIEW);
        expense.setAiDecisionReason("Duplicidade detectada contra a despesa " + original.getId() + ".");
        expense.setPolicyCompliant(false);
        expense.setPolicyViolationReason("Nota fiscal duplicada. Reembolso bloqueado.");
        expense.setSefazStatus(SefazStatus.INVALID);
        expense.setSefazValidationMessage("Documento duplicado na base da empresa.");
        expense.setAutoApprovalEligible(false);
        expense.setManualReviewReason("Nota duplicada. Esta nota ja existe no sistema e nao pode ser reenviada.");
        expense.setAiCheckedAt(Instant.now());

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.NEEDS_REVISION);
        var history = new ExpenseStatusHistory(
            expense, from, ExpenseStatus.NEEDS_REVISION, null,
            "IA: nota duplicada da despesa " + original.getId()
        );
        history.setAiScore(expense.getAiScore());
        expense.getStatusHistory().add(history);

        expenseRepository.save(expense);
        log.warn("Duplicate receipt blocked expense={} original={}", expense.getId(), original.getId());
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
