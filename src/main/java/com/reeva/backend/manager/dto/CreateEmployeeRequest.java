package com.reeva.backend.manager.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateEmployeeRequest(

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 150)
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password,

    @NotBlank(message = "Pix key is required")
    @Size(max = 255)
    String pixKey,

    @NotBlank(message = "CPF is required")
    @Size(min = 11, max = 14)
    String cpf,

    @NotBlank(message = "Phone country is required")
    @Size(max = 5)
    String phoneCountryCode,

    @NotBlank(message = "Phone number is required")
    @Size(min = 6, max = 30)
    String phoneNumber,

    UUID departmentId
) {}
