package com.reeva.backend.finance.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CfoRecommendationResponse(
    String type,
    String title,
    String description,
    String action,
    String severity,
    BigDecimal estimatedImpact,
    UUID projectId,
    String projectName
) {}
