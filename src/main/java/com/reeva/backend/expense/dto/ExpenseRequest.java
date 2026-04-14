package com.reeva.backend.expense.dto;

import com.reeva.backend.expense.ExpenseCategory;
import com.reeva.backend.expense.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(

    @NotBlank(message = "Title is required")
    @Size(max = 255)
    String title,

    @NotNull(message = "Category is required")
    ExpenseCategory category,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal amount,

    @NotNull(message = "Expense date is required")
    @PastOrPresent(message = "Expense date cannot be in the future")
    LocalDate expenseDate,

    PaymentMethod paymentMethod,

    @Size(max = 500)
    String description
) {}
