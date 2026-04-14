package com.reeva.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "storage")
public record StorageProperties(
    String uploadDir,
    List<String> allowedTypes
) {}
