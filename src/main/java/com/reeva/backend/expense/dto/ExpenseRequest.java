package com.reeva.backend.expense.dto;

import com.reeva.backend.expense.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseRequest(

    @NotBlank(message = "Titulo e obrigatorio")
    @Size(max = 255)
    String title,

    @NotBlank(message = "Categoria e obrigatoria")
    @Size(max = 80)
    String category,

    @NotNull(message = "Projeto e obrigatorio")
    UUID projectId,

    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    BigDecimal amount,

    @NotNull(message = "Data da despesa e obrigatoria")
    @PastOrPresent(message = "Data da despesa nao pode estar no futuro")
    LocalDate expenseDate,

    PaymentMethod paymentMethod,

    @Size(max = 500)
    String description
) {}
