package com.reeva.backend.expense.dto;

import jakarta.validation.constraints.Size;

public record ExpenseUpdateRequest(

    @Size(max = 255)
    String title,

    @Size(max = 500)
    String description
) {}
