package com.reeva.backend.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EmployeeExpenseCorrectionRequest(

    @NotBlank(message = "Titulo e obrigatorio")
    @Size(max = 255)
    String title,

    @NotBlank(message = "Categoria e obrigatoria")
    @Size(max = 80)
    String category,

    @NotNull(message = "Data da despesa e obrigatoria")
    @PastOrPresent(message = "Data da despesa nao pode estar no futuro")
    LocalDate expenseDate,

    @Size(max = 500)
    String description
) {}
