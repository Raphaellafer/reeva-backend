package com.reeva.backend.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProjectRequest(
    @NotBlank
    @Size(max = 255)
    String name,

    @Size(max = 80)
    String code,

    @Size(max = 2000)
    String description,

    @Size(max = 5000)
    String policyText,

    BigDecimal revenue,

    UUID managerId,

    List<UUID> employeeIds
) {}
