package com.reeva.backend.common.audit;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditRepository auditRepository;

    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    @Async
    public void log(UUID companyId, UUID userId, String action,
                    String entityType, UUID entityId,
                    Map<String, Object> metadata, String ipAddress) {
        auditRepository.save(
            AuditLog.builder()
                .companyId(companyId)
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .metadata(metadata)
                .ipAddress(ipAddress)
                .build()
        );
    }

    @Async
    public void log(UUID companyId, UUID userId, String action) {
        log(companyId, userId, action, null, null, null, null);
    }
}
