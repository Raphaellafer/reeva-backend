package com.reeva.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app.cors")
public record AppCorsProperties(
    List<String> allowedOrigins
) {}
