package com.reeva.backend.project.dto;

import com.reeva.backend.project.Project;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    String name,
    String code,
    String description,
    String policyText,
    BigDecimal revenue,
    BigDecimal estimatedExpense,
    boolean active,
    UUID managerId,
    String managerName,
    String managerEmail,
    List<MemberItem> members
) {
    public record MemberItem(UUID id, String name, String email) {}

    public static ProjectResponse from(Project project, List<MemberItem> members) {
        return new ProjectResponse(
            project.getId(),
            project.getName(),
            project.getCode(),
            project.getDescription(),
            project.getPolicyText(),
            project.getRevenue(),
            project.getEstimatedExpense(),
            project.isActive(),
            project.getCreatedBy() != null ? project.getCreatedBy().getId() : null,
            project.getCreatedBy() != null ? project.getCreatedBy().getName() : null,
            project.getCreatedBy() != null ? project.getCreatedBy().getEmail() : null,
            members
        );
    }
}
