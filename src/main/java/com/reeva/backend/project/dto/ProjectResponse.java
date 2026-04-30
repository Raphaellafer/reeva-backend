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
    BigDecimal revenue,
    boolean active,
    List<MemberItem> members
) {
    public record MemberItem(UUID id, String name, String email) {}

    public static ProjectResponse from(Project project, List<MemberItem> members) {
        return new ProjectResponse(
            project.getId(),
            project.getName(),
            project.getCode(),
            project.getDescription(),
            project.getRevenue(),
            project.isActive(),
            members
        );
    }
}
