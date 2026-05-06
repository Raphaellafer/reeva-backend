package com.reeva.backend.manager.dto;

import com.reeva.backend.common.audit.AuditLog;

import java.util.UUID;

public record PolicyAuditLogResponse(
    UUID id,
    String action,
    UUID policyId,
    UUID changedByUserId,
    String changedByName,
    String changedAt
) {
    public static PolicyAuditLogResponse from(AuditLog log, String userName) {
        return new PolicyAuditLogResponse(
            log.getId(),
            log.getAction(),
            log.getEntityId(),
            log.getUserId(),
            userName,
            log.getCreatedAt() != null ? log.getCreatedAt().toString() : null
        );
    }
}
