package com.reeva.backend.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Service
public class TraditionalOcrService {

    private static final Logger log = LoggerFactory.getLogger(TraditionalOcrService.class);

    @Value("${ocr.traditional.enabled:false}")
    private boolean enabled;

    @Value("${ocr.traditional.command:tesseract}")
    private String command;

    @Value("${ocr.traditional.languages:por+eng}")
    private String languages;

    @Value("${ocr.traditional.timeout-seconds:20}")
    private long timeoutSeconds;

    public String extractText(byte[] imageBytes, String mimeType) {
        if (!enabled) {
            return "";
        }

        Path input = null;
        Path outputBase = null;
        Path outputText = null;
        try {
            input = Files.createTempFile("reeva-ocr-", extensionFor(mimeType));
            outputBase = Files.createTempFile("reeva-ocr-output-", "");
            outputText = Path.of(outputBase.toString() + ".txt");
            Files.deleteIfExists(outputBase);
            Files.write(input, imageBytes);

            Process process = new ProcessBuilder(
                command,
                input.toString(),
                outputBase.toString(),
                "-l",
                languages
            ).redirectErrorStream(true).start();

            boolean finished = process.waitFor(Duration.ofSeconds(timeoutSeconds).toMillis(), TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Traditional OCR timed out after {} seconds", timeoutSeconds);
                return "";
            }

            String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (process.exitValue() != 0) {
                log.warn("Traditional OCR failed with exit code {}: {}", process.exitValue(), processOutput);
                return "";
            }

            if (Files.notExists(outputText)) {
                return "";
            }
            return Files.readString(outputText, StandardCharsets.UTF_8).trim();
        } catch (Exception ex) {
            log.warn("Traditional OCR unavailable: {}", ex.getMessage());
            return "";
        } finally {
            deleteQuietly(input);
            deleteQuietly(outputBase);
            deleteQuietly(outputText);
        }
    }

    private String extensionFor(String mimeType) {
        if (mimeType == null) return ".img";
        return switch (mimeType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".img";
        };
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (Exception ignored) {
        }
    }
}
