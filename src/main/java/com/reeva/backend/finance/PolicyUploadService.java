package com.reeva.backend.finance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.CategoryUtils;
import com.reeva.backend.manager.ManagerService;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.user.User;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

@Service
public class PolicyUploadService {

    private static final Logger log = LoggerFactory.getLogger(PolicyUploadService.class);
    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    private static final String POLICY_EXTRACTION_PROMPT = """
        Voce e um especialista em analise de politicas corporativas de reembolso.

        Sua tarefa e analisar o documento de politica de reembolso fornecido e extrair as regras por categoria de despesa.

        Categorias padrao sugeridas no sistema:
        - FOOD: alimentacao, refeicoes, restaurantes, lanches, delivery, cafe
        - TRANSPORT: transporte, Uber, taxi, combustivel, estacionamento, pedagio, metro, onibus, locomocao
        - LODGING: hospedagem, hotel, pousada, Airbnb, diaria, pernoite
        - PURCHASE: compras gerais, material de escritorio, papelaria, materiais, eletronicos
        - HARDWARE: equipamentos de TI, computadores, notebooks, monitores, perifericos, mouse, teclado

        Se o documento mencionar uma categoria que nao existe na lista padrao, crie um codigo curto em maiusculo,
        sem acentos e com underscore entre palavras. Exemplos: LAVANDERIA, ESTACIONAMENTO, TREINAMENTO.

        Para cada categoria mencionada no documento, extraia:
        - category: codigo normalizado da categoria
        - maxAmount: valor maximo permitido por despesa em BRL (numero decimal, ex: 50.00)
        - dailyLimit: limite diario total em BRL (numero decimal ou null se nao mencionado)
        - monthlyLimit: limite mensal total em BRL (numero decimal ou null se nao mencionado)
        - requiresReceipt: se e obrigatorio comprovante/nota fiscal (true ou false)
        - autoApprovalMinScore: score minimo de conformidade para aprovacao automatica (inteiro de 0 a 100, use 90 se nao mencionado). O score tecnico de leitura OCR e fixo no sistema e nao deve ser extraido.
        - description: texto completo das regras e observacoes para essa categoria, copiando as informacoes relevantes do documento

        Se uma categoria nao for mencionada no documento, nao a inclua na resposta.
        Retorne apenas JSON valido, sem markdown, sem explicacoes fora do JSON.
        """;

    private final ManagerService managerService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o}")
    private String model;

    public PolicyUploadService(ManagerService managerService, ObjectMapper objectMapper) {
        this.managerService = managerService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public List<PolicyResponse> processUpload(User cfo, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("Arquivo de politica nao pode ser vazio");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw BusinessException.badRequest("Arquivo excede o tamanho maximo permitido de 5 MB");
        }

        String contentType = file.getContentType();
        String text = extractText(file, contentType);

        if (text == null || text.isBlank()) {
            throw BusinessException.badRequest("Nao foi possivel extrair texto do arquivo enviado");
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw BusinessException.badRequest("Servico de IA nao configurado. Contate o administrador.");
        }

        List<PolicyUpdateRequest> requests = callAiAndParse(text);
        if (requests.isEmpty()) {
            throw BusinessException.badRequest(
                "Nenhuma politica de reembolso foi identificada no documento. Verifique o conteudo do arquivo.");
        }

        List<PolicyResponse> saved = new ArrayList<>();
        for (PolicyUpdateRequest req : requests) {
            saved.add(managerService.savePolicy(cfo, req));
        }
        log.info("Policy upload processed for company {}: {} policies saved", cfo.getCompany().getId(), saved.size());
        return saved;
    }

    private String extractText(MultipartFile file, String contentType) {
        try {
            if ("application/pdf".equals(contentType)
                    || (file.getOriginalFilename() != null
                        && file.getOriginalFilename().toLowerCase().endsWith(".pdf"))) {
                return extractPdfText(file);
            }
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw BusinessException.badRequest("Erro ao ler o arquivo: " + e.getMessage());
        }
    }

    private String extractPdfText(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private List<PolicyUpdateRequest> callAiAndParse(String documentText) {
        String prompt = POLICY_EXTRACTION_PROMPT + "\n\nDocumento:\n" + documentText;

        var body = new LinkedHashMap<String, Object>();
        body.put("model", model);
        body.put("max_completion_tokens", 2000);
        body.put("temperature", 0.1);
        body.put("response_format", buildResponseFormat());
        body.put("messages", List.of(
            java.util.Map.of("role", "user", "content", prompt)
        ));

        try {
            String requestBody = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(OPENAI_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("OpenAI returned {} for policy upload: {}", response.statusCode(), response.body());
                throw BusinessException.badRequest("Falha ao analisar documento com IA. Tente novamente.");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").get(0).path("message").path("content").asText();
            return parsePolicies(objectMapper.readTree(content));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling OpenAI for policy upload", e);
            throw BusinessException.badRequest("Erro ao processar arquivo com IA: " + e.getMessage());
        }
    }

    private List<PolicyUpdateRequest> parsePolicies(JsonNode root) {
        JsonNode policiesNode = root.path("policies");
        if (!policiesNode.isArray()) return List.of();

        List<PolicyUpdateRequest> result = new ArrayList<>();
        for (JsonNode node : policiesNode) {
            try {
                String categoryStr = node.path("category").asText(null);
                if (categoryStr == null || categoryStr.isBlank()) continue;

                String category = CategoryUtils.normalize(categoryStr);
                if (category == null) continue;
                BigDecimal maxAmount = readDecimal(node, "maxAmount");
                if (maxAmount == null || maxAmount.compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal dailyLimit = readDecimal(node, "dailyLimit");
                BigDecimal monthlyLimit = readDecimal(node, "monthlyLimit");
                boolean requiresReceipt = node.path("requiresReceipt").asBoolean(true);
                short minScore = (short) Math.max(0, Math.min(100, node.path("autoApprovalMinScore").asInt(90)));
                String description = node.path("description").asText(null);

                result.add(new PolicyUpdateRequest(
                    category, maxAmount, dailyLimit, monthlyLimit,
                    requiresReceipt, minScore, description
                ));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid policy upload response for category: {}", node.path("category").asText());
            }
        }
        return result;
    }

    private BigDecimal readDecimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        try {
            return new BigDecimal(value.asText());
        } catch (Exception e) {
            return null;
        }
    }

    private java.util.Map<String, Object> buildResponseFormat() {
        var policyProps = new LinkedHashMap<String, Object>();
        policyProps.put("category", java.util.Map.of("type", "string"));
        policyProps.put("maxAmount", java.util.Map.of("type", "number"));
        policyProps.put("dailyLimit", java.util.Map.of("type", List.of("number", "null")));
        policyProps.put("monthlyLimit", java.util.Map.of("type", List.of("number", "null")));
        policyProps.put("requiresReceipt", java.util.Map.of("type", "boolean"));
        policyProps.put("autoApprovalMinScore", java.util.Map.of("type", "integer", "minimum", 0, "maximum", 100));
        policyProps.put("description", java.util.Map.of("type", List.of("string", "null")));

        var policySchema = new LinkedHashMap<String, Object>();
        policySchema.put("type", "object");
        policySchema.put("additionalProperties", false);
        policySchema.put("properties", policyProps);
        policySchema.put("required", List.of(
            "category", "maxAmount", "dailyLimit", "monthlyLimit",
            "requiresReceipt", "autoApprovalMinScore", "description"
        ));

        var rootProps = new LinkedHashMap<String, Object>();
        rootProps.put("policies", java.util.Map.of(
            "type", "array",
            "items", policySchema
        ));

        var rootSchema = new LinkedHashMap<String, Object>();
        rootSchema.put("type", "object");
        rootSchema.put("additionalProperties", false);
        rootSchema.put("properties", rootProps);
        rootSchema.put("required", List.of("policies"));

        return java.util.Map.of(
            "type", "json_schema",
            "json_schema", java.util.Map.of(
                "name", "reimbursement_policy_extraction",
                "strict", true,
                "schema", rootSchema
            )
        );
    }
}
