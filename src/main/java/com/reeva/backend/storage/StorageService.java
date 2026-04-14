package com.reeva.backend.storage;

import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.config.StorageProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final StorageProperties storageProperties;
    private Path uploadRoot;

    public StorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @PostConstruct
    void init() {
        uploadRoot = Paths.get(storageProperties.uploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadRoot);
            log.info("Storage directory: {}", uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadRoot, e);
        }
    }

    public StoredFile store(MultipartFile file) {
        validateFile(file);

        String storedName = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        Path destination = uploadRoot.resolve(storedName).normalize();

        if (!destination.startsWith(uploadRoot)) {
            throw BusinessException.badRequest("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + file.getOriginalFilename(), e);
        }

        return new StoredFile(
            file.getOriginalFilename(),
            storedName,
            destination.toString(),
            file.getContentType(),
            file.getSize()
        );
    }

    public void delete(String storedName) {
        Path target = uploadRoot.resolve(storedName).normalize();
        if (!target.startsWith(uploadRoot)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", storedName, e);
        }
    }

    public Path resolve(String storedName) {
        return uploadRoot.resolve(storedName).normalize();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("File is empty");
        }
        List<String> allowedTypes = storageProperties.allowedTypes();
        if (!allowedTypes.contains(file.getContentType())) {
            throw BusinessException.badRequest(
                "File type not allowed. Accepted: " + String.join(", ", allowedTypes));
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf(".")).toLowerCase();
    }

    public record StoredFile(
        String originalName,
        String storedName,
        String filePath,
        String mimeType,
        long fileSize
    ) {}
}
