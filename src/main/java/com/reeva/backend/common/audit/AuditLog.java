package com.reeva.backend.common.audit;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AuditLog() {}

    private AuditLog(Builder builder) {
        this.companyId = builder.companyId;
        this.userId = builder.userId;
        this.action = builder.action;
        this.entityType = builder.entityType;
        this.entityId = builder.entityId;
        this.metadata = builder.metadata;
        this.ipAddress = builder.ipAddress;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID companyId;
        private UUID userId;
        private String action;
        private String entityType;
        private UUID entityId;
        private Map<String, Object> metadata;
        private String ipAddress;

        public Builder companyId(UUID v)  { this.companyId = v;  return this; }
        public Builder userId(UUID v)     { this.userId = v;     return this; }
        public Builder action(String v)   { this.action = v;     return this; }
        public Builder entityType(String v){ this.entityType = v; return this; }
        public Builder entityId(UUID v)   { this.entityId = v;   return this; }
        public Builder metadata(Map<String, Object> v) { this.metadata = v; return this; }
        public Builder ipAddress(String v){ this.ipAddress = v;  return this; }
        public AuditLog build()           { return new AuditLog(this); }
    }

    public UUID getId()          { return id; }
    public UUID getCompanyId()   { return companyId; }
    public UUID getUserId()      { return userId; }
    public String getAction()    { return action; }
    public String getEntityType(){ return entityType; }
    public UUID getEntityId()    { return entityId; }
    public Map<String, Object> getMetadata() { return metadata; }
    public String getIpAddress() { return ipAddress; }
    public Instant getCreatedAt(){ return createdAt; }
}
