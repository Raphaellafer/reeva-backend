package com.reeva.backend.expense;

import com.reeva.backend.ai.OcrService;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.company.Company;
import com.reeva.backend.expense.attachment.AttachmentRepository;
import com.reeva.backend.expense.comment.CommentService;
import com.reeva.backend.expense.dto.EmployeeExpenseCorrectionRequest;
import com.reeva.backend.project.Project;
import com.reeva.backend.project.ProjectService;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock ExpenseRepository expenseRepository;
    @Mock com.reeva.backend.storage.StorageService storageService;
    @Mock CommentService commentService;
    @Mock AuditService auditService;
    @Mock OcrService ocrService;
    @Mock AttachmentRepository attachmentRepository;
    @Mock ProjectService projectService;

    @InjectMocks ExpenseService expenseService;

    @Test
    void submitEmployeeCorrection_shouldMoveExpenseToPendingReview() throws Exception {
        Company company = new Company("Reeva", "00.000.000/0001-00", "demo@reeva.com.br", "PRO");
        setField(company, "id", UUID.randomUUID());

        User employee = new User(company, "Bruno Funcionario", "funcionario@reeva.com.br", "hash", UserRole.EMPLOYEE);
        setField(employee, "id", UUID.randomUUID());

        Project project = new Project(company, "Projeto Demo", employee);
        setField(project, "id", UUID.randomUUID());

        Expense expense = new Expense(company, employee, project, "arquivo-nota", ExpenseCategory.FOOD,
            null, LocalDate.now(), PaymentMethod.OTHER);
        setField(expense, "id", UUID.randomUUID());
        expense.transitionTo(ExpenseStatus.NEEDS_REVISION);
        expense.setManualReviewReason("Campos obrigatorios ausentes.");

        when(expenseRepository.findByIdAndUserId(expense.getId(), employee.getId())).thenReturn(Optional.of(expense));
        when(expenseRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeExpenseCorrectionRequest request = new EmployeeExpenseCorrectionRequest(
            "Restaurante XPTO",
            ExpenseCategory.FOOD,
            new BigDecimal("42.50"),
            LocalDate.of(2026, 5, 5),
            "Correcao manual apos falha do OCR"
        );

        var response = expenseService.submitEmployeeCorrection(employee, expense.getId(), request);

        assertThat(response.status()).isEqualTo(ExpenseStatus.PENDING_REVIEW);
        assertThat(response.title()).isEqualTo("Restaurante XPTO");
        assertThat(response.amount()).isEqualByComparingTo("42.50");
        assertThat(response.expenseDate()).isEqualTo(LocalDate.of(2026, 5, 5));
        assertThat(response.manualReviewReason()).isNull();
        assertThat(expense.getStatusHistory()).hasSize(1);
        verify(auditService).log(any(), any(), any(), any(), any(), any(), any());
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
