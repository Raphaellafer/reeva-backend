package com.reeva.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {
    // AuditService usa @Async — esta config ativa o executor de threads do Spring
}
