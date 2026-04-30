package com.reeva.backend.project.dto;

import com.reeva.backend.user.User;

import java.util.UUID;

public record TeamMemberResponse(UUID id, String name, String email) {
    public static TeamMemberResponse from(User user) {
        return new TeamMemberResponse(user.getId(), user.getName(), user.getEmail());
    }
}
