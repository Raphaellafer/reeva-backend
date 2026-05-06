package com.reeva.backend.manager.dto;

import com.reeva.backend.common.audit.AuditLog;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record PolicyAuditLogResponse(
    UUID id,
    String action,
    UUID policyId,
    UUID changedByUserId,
    String changedByName,
    String category,
    Map<String, Object> before,
    Map<String, Object> after,
    Instant changedAt
) {
    @SuppressWarnings("unchecked")
    public static PolicyAuditLogResponse from(AuditLog log) {
        return from(log, null);
    }

    @SuppressWarnings("unchecked")
    public static PolicyAuditLogResponse from(AuditLog log, String changedByName) {
        Map<String, Object> metadata = log.getMetadata() != null ? log.getMetadata() : Map.of();
        String metadataName = stringValue(metadata.get("changedByName"));
        return new PolicyAuditLogResponse(
            log.getId(),
            log.getAction(),
            log.getEntityId(),
            log.getUserId(),
            changedByName != null && !changedByName.isBlank() ? changedByName : metadataName,
            stringValue(metadata.get("category")),
            metadata.get("before") instanceof Map<?, ?> before ? (Map<String, Object>) before : Map.of(),
            metadata.get("after") instanceof Map<?, ?> after ? (Map<String, Object>) after : Map.of(),
            log.getCreatedAt()
        );
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
