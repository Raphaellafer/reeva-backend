package com.reeva.backend.expense.dto;

import com.reeva.backend.expense.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeExpenseCorrectionRequest(

    @NotBlank(message = "Titulo e obrigatorio")
    @Size(max = 255)
    String title,

    @NotNull(message = "Categoria e obrigatoria")
    ExpenseCategory category,

    @NotNull(message = "Valor e obrigatorio")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    BigDecimal amount,

    @NotNull(message = "Data da despesa e obrigatoria")
    @PastOrPresent(message = "Data da despesa nao pode estar no futuro")
    LocalDate expenseDate,

    @Size(max = 500)
    String description
) {}
