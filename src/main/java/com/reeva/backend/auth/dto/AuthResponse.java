package com.reeva.backend.auth.dto;

import com.reeva.backend.user.UserRole;

import java.util.UUID;

public record AuthResponse(
    String token,
    UUID userId,
    String name,
    String email,
    UserRole role
) {}
