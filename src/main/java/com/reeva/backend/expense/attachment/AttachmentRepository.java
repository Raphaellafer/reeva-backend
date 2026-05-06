package com.reeva.backend.expense.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<ExpenseAttachment, UUID> {

    List<ExpenseAttachment> findByFileSha256IsNull();

    @Query("""
        SELECT a FROM ExpenseAttachment a
        JOIN FETCH a.expense e
        WHERE e.company.id = :companyId
          AND e.id <> :currentExpenseId
          AND e.deleted = false
          AND a.fileSha256 = :fileSha256
        ORDER BY a.createdAt ASC
        """)
    List<ExpenseAttachment> findActiveDuplicatesByFileSha256(
        @Param("companyId") UUID companyId,
        @Param("currentExpenseId") UUID currentExpenseId,
        @Param("fileSha256") String fileSha256
    );
}

