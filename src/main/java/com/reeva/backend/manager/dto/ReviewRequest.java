package com.reeva.backend.manager.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
    @JsonAlias("reason")
    @NotBlank(message = "informe uma justificativa")
    @Size(max = 1000)
    String notes
) {}
