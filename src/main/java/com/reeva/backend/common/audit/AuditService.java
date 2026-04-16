package com.reeva.backend.common.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditRepository auditRepository;

    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    @Async
    public void log(UUID companyId, UUID userId, String action,
                    String entityType, UUID entityId,
                    Map<String, Object> metadata, String ipAddress) {
        try {
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
        } catch (Exception e) {
            log.warn("Failed to persist audit log [action={}]: {}", action, e.getMessage());
        }
    }

    @Async
    public void log(UUID companyId, UUID userId, String action) {
        log(companyId, userId, action, null, null, null, null);
    }
}
