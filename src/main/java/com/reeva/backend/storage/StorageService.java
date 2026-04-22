package com.reeva.backend.storage;

import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.config.StorageProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);
    private static final String PROVIDER_LOCAL = "local";
    private static final String PROVIDER_S3 = "s3";

    private final StorageProperties storageProperties;
    private Path uploadRoot;
    private S3Client s3Client;
    private String storageProvider;

    public StorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @PostConstruct
    void init() {
        storageProvider = normalizeProvider(storageProperties.provider());
        if (PROVIDER_S3.equals(storageProvider)) {
            initS3Client();
            log.info("Storage provider: S3 bucket={}", storageProperties.s3Bucket());
            return;
        }

        uploadRoot = Paths.get(storageProperties.uploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadRoot);
            log.info("Storage provider: local directory={}", uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadRoot, e);
        }
    }

    public StoredFile store(MultipartFile file) {
        validateFile(file);
        return PROVIDER_S3.equals(storageProvider) ? storeOnS3(file) : storeLocally(file);
    }

    private StoredFile storeLocally(MultipartFile file) {
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
        if (PROVIDER_S3.equals(storageProvider)) {
            deleteFromS3(storedName);
            return;
        }

        Path target = uploadRoot.resolve(storedName).normalize();
        if (!target.startsWith(uploadRoot)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", storedName, e);
        }
    }

    public Path resolve(String storedName) {
        if (PROVIDER_S3.equals(storageProvider)) {
            throw new UnsupportedOperationException("S3 storage does not support local path resolution");
        }
        return uploadRoot.resolve(storedName).normalize();
    }

    private StoredFile storeOnS3(MultipartFile file) {
        String objectKey = "expenses/" + UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(storageProperties.s3Bucket())
            .key(objectKey)
            .contentType(file.getContentType())
            .build();

        try {
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file for S3 upload: " + file.getOriginalFilename(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to S3: " + file.getOriginalFilename(), e);
        }

        return new StoredFile(
            file.getOriginalFilename(),
            objectKey,
            buildStoredLocation(objectKey),
            file.getContentType(),
            file.getSize()
        );
    }

    private void deleteFromS3(String storedName) {
        String objectKey = extractObjectKey(storedName);
        if (objectKey == null || objectKey.isBlank()) return;

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(storageProperties.s3Bucket())
                .key(objectKey)
                .build());
        } catch (Exception e) {
            log.warn("Could not delete S3 object: {}", storedName, e);
        }
    }

    private void initS3Client() {
        String bucket = storageProperties.s3Bucket();
        String region = storageProperties.s3Region();
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("storage.s3-bucket must be configured when provider is s3");
        }
        if (region == null || region.isBlank()) {
            throw new IllegalStateException("storage.s3-region must be configured when provider is s3");
        }

        var builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create());

        if (storageProperties.s3Endpoint() != null && !storageProperties.s3Endpoint().isBlank()) {
            builder.endpointOverride(URI.create(storageProperties.s3Endpoint()));
            builder.serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build());
        }

        s3Client = builder.build();
    }

    private String buildStoredLocation(String objectKey) {
        String publicBaseUrl = storageProperties.s3PublicBaseUrl();
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return publicBaseUrl.replaceAll("/+$", "") + "/" + objectKey;
        }
        return "s3://" + storageProperties.s3Bucket() + "/" + objectKey;
    }

    private String extractObjectKey(String storedName) {
        if (storedName == null || storedName.isBlank()) return null;
        String s3Prefix = "s3://" + storageProperties.s3Bucket() + "/";
        if (storedName.startsWith(s3Prefix)) {
            return storedName.substring(s3Prefix.length());
        }
        return storedName;
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

    private String normalizeProvider(String provider) {
        String normalized = Objects.requireNonNullElse(provider, PROVIDER_LOCAL)
            .trim()
            .toLowerCase(Locale.ROOT);
        if (!PROVIDER_LOCAL.equals(normalized) && !PROVIDER_S3.equals(normalized)) {
            throw new IllegalStateException("Unsupported storage provider: " + provider);
        }
        return normalized;
    }

    public record StoredFile(
        String originalName,
        String storedName,
        String filePath,
        String mimeType,
        long fileSize
    ) {}
}
