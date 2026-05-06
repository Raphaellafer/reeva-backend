package com.reeva.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "storage")
public record StorageProperties(
    String provider,
    String uploadDir,
    List<String> allowedTypes,
    String s3Bucket,
    String s3Region,
    String s3Endpoint,
    String s3PublicBaseUrl,
    String s3AccessKeyId,
    String s3SecretAccessKey,
    String s3SessionToken
) {}
