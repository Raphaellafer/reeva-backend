package com.reeva.backend.expense;

import com.reeva.backend.ai.OcrService;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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
            new BigDecimal("42.50"), LocalDate.now(), PaymentMethod.OTHER);
        setField(expense, "id", UUID.randomUUID());
        expense.transitionTo(ExpenseStatus.NEEDS_REVISION);
        expense.setManualReviewReason("Campos obrigatorios ausentes.");

        when(expenseRepository.findByIdAndUserId(expense.getId(), employee.getId())).thenReturn(Optional.of(expense));
        when(expenseRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeExpenseCorrectionRequest request = new EmployeeExpenseCorrectionRequest(
            "Restaurante XPTO",
            ExpenseCategory.FOOD,
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

    @Test
    void submitEmployeeCorrection_shouldRejectManualCorrectionWhenAmountWasNotReadFromReceipt() throws Exception {
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

        when(expenseRepository.findByIdAndUserId(expense.getId(), employee.getId())).thenReturn(Optional.of(expense));

        EmployeeExpenseCorrectionRequest request = new EmployeeExpenseCorrectionRequest(
            "Restaurante XPTO",
            ExpenseCategory.FOOD,
            LocalDate.of(2026, 5, 5),
            "Correcao manual apos falha do OCR"
        );

        assertThatThrownBy(() -> expenseService.submitEmployeeCorrection(employee, expense.getId(), request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Valor da nota nao pode ser preenchido manualmente");

        verify(expenseRepository, never()).save(any());
    }

    @Test
    void submitEmployeeCorrection_shouldRejectDuplicateReceipt() throws Exception {
        Company company = new Company("Reeva", "00.000.000/0001-00", "demo@reeva.com.br", "PRO");
        setField(company, "id", UUID.randomUUID());

        User employee = new User(company, "Bruno Funcionario", "funcionario@reeva.com.br", "hash", UserRole.EMPLOYEE);
        setField(employee, "id", UUID.randomUUID());

        Project project = new Project(company, "Projeto Demo", employee);
        setField(project, "id", UUID.randomUUID());

        Expense original = new Expense(company, employee, project, "Restaurante XPTO", ExpenseCategory.FOOD,
            new BigDecimal("42.50"), LocalDate.now(), PaymentMethod.OTHER);
        setField(original, "id", UUID.randomUUID());

        Expense duplicate = new Expense(company, employee, project, "Restaurante XPTO", ExpenseCategory.FOOD,
            new BigDecimal("42.50"), LocalDate.now(), PaymentMethod.OTHER);
        setField(duplicate, "id", UUID.randomUUID());
        duplicate.transitionTo(ExpenseStatus.NEEDS_REVISION);
        duplicate.setDuplicateOfExpense(original);

        when(expenseRepository.findByIdAndUserId(duplicate.getId(), employee.getId())).thenReturn(Optional.of(duplicate));

        EmployeeExpenseCorrectionRequest request = new EmployeeExpenseCorrectionRequest(
            "Restaurante XPTO",
            ExpenseCategory.FOOD,
            LocalDate.of(2026, 5, 5),
            "Tentativa de corrigir duplicidade"
        );

        assertThatThrownBy(() -> expenseService.submitEmployeeCorrection(employee, duplicate.getId(), request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Nota duplicada nao pode ser corrigida");

        verify(expenseRepository, never()).save(any());
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
