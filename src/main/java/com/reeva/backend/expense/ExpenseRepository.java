package com.reeva.backend.expense;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE e.user.id = :userId AND e.deleted = false ORDER BY e.createdAt DESC")
    Page<Expense> findByUserIdNotDeleted(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.user.id = :userId AND e.deleted = false")
    Optional<Expense> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    long countByUserIdAndStatus(UUID userId, ExpenseStatus status);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.user.id = :userId
          AND e.status IN :statuses
          AND e.deleted = false
        """)
    long countByUserIdAndStatuses(@Param("userId") UUID userId, @Param("statuses") List<ExpenseStatus> statuses);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
        WHERE e.user.id = :userId
          AND e.status IN :statuses
          AND e.deleted = false
        """)
    BigDecimal sumAmountByUserIdAndStatuses(@Param("userId") UUID userId, @Param("statuses") List<ExpenseStatus> statuses);

    // ── Manager queries ──────────────────────────────────────────────

    @Query(
        value = """
            SELECT e FROM Expense e
            JOIN FETCH e.user u
            JOIN FETCH e.project p
            LEFT JOIN FETCH u.department
            WHERE p.createdBy.id = :managerId
              AND e.deleted = false
              AND (:status IS NULL OR e.status = :status)
            ORDER BY e.createdAt DESC
            """,
        countQuery = """
            SELECT COUNT(e) FROM Expense e
            JOIN e.project p
            WHERE p.createdBy.id = :managerId
              AND e.deleted = false
              AND (:status IS NULL OR e.status = :status)
            """
    )
    Page<Expense> findByManagerId(
        @Param("managerId") UUID managerId,
        @Param("status") ExpenseStatus status,
        Pageable pageable
    );

    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.project.createdBy.id = :managerId AND e.deleted = false")
    Optional<Expense> findByIdAndManagerId(@Param("id") UUID id, @Param("managerId") UUID managerId);

    @Query(
        value = """
            SELECT e FROM Expense e
            JOIN FETCH e.user u
            JOIN FETCH e.project p
            LEFT JOIN FETCH u.department
            WHERE u.id = :userId
              AND p.createdBy.id = :managerId
              AND e.deleted = false
            ORDER BY e.createdAt DESC
            """,
        countQuery = """
            SELECT COUNT(e) FROM Expense e
            WHERE e.user.id = :userId
              AND e.project.createdBy.id = :managerId
              AND e.deleted = false
            """
    )
    Page<Expense> findByUserIdAndManagerId(
        @Param("userId") UUID userId,
        @Param("managerId") UUID managerId,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT e FROM Expense e
            JOIN FETCH e.user u
            JOIN FETCH e.project p
            LEFT JOIN FETCH u.department
            WHERE u.id = :userId
              AND u.company.id = :companyId
              AND e.deleted = false
            ORDER BY e.createdAt DESC
            """,
        countQuery = """
            SELECT COUNT(e) FROM Expense e
            WHERE e.user.id = :userId
              AND e.user.company.id = :companyId
              AND e.deleted = false
            """
    )
    Page<Expense> findByUserIdAndCompanyId(
        @Param("userId") UUID userId,
        @Param("companyId") UUID companyId,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.project.createdBy.id = :managerId
          AND e.status IN :statuses
          AND e.deleted = false
        """)
    long countByManagerIdAndStatuses(@Param("managerId") UUID managerId, @Param("statuses") List<ExpenseStatus> statuses);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
        WHERE e.project.createdBy.id = :managerId
          AND e.status = :status
          AND e.deleted = false
        """)
    BigDecimal sumAmountByManagerIdAndStatus(@Param("managerId") UUID managerId, @Param("status") ExpenseStatus status);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.project.createdBy.id = :managerId
          AND e.aiDecision = :decision
          AND e.deleted = false
        """)
    long countByManagerIdAndAiDecision(@Param("managerId") UUID managerId, @Param("decision") AiDecision decision);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.project.createdBy.id = :managerId
          AND e.policyCompliant = false
          AND (e.aiDecision IS NULL OR e.aiDecision <> com.reeva.backend.expense.AiDecision.REJECTED_BY_FISCAL_VALIDATION)
          AND e.deleted = false
        """)
    long countPolicyViolationsByManagerId(@Param("managerId") UUID managerId);

    @Query("""
        SELECT e FROM Expense e
        JOIN FETCH e.user u
        JOIN e.project p
        WHERE p.createdBy.id = :managerId
          AND e.status = :status
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY u.name ASC, e.expenseDate ASC, e.createdAt ASC
        """)
    List<Expense> findApprovedForPayment(
        @Param("managerId") UUID managerId,
        @Param("status") ExpenseStatus status,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    @Query("""
        SELECT e FROM Expense e
        WHERE e.company.id = :companyId
          AND e.project.id = :projectId
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY e.expenseDate ASC, e.createdAt ASC
        """)
    List<Expense> findByProjectForCfoMetrics(
        @Param("companyId") UUID companyId,
        @Param("projectId") UUID projectId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    @Query("""
        SELECT e FROM Expense e
        JOIN FETCH e.user u
        JOIN FETCH e.project p
        LEFT JOIN FETCH u.department d
        LEFT JOIN FETCH u.manager m
        WHERE e.company.id = :companyId
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY e.expenseDate DESC, e.createdAt DESC
        """)
    List<Expense> findByCompanyForCfoMetrics(
        @Param("companyId") UUID companyId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    @Query("""
        SELECT e FROM Expense e
        JOIN FETCH e.project p
        JOIN FETCH e.user u
        WHERE e.company.id = :companyId
          AND e.status IN :statuses
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY e.expenseDate DESC, e.createdAt DESC
        """)
    List<Expense> findByCompanyAndStatusesBetween(
        @Param("companyId") UUID companyId,
        @Param("statuses") List<ExpenseStatus> statuses,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    @Query(
        value = """
            SELECT e FROM Expense e
            JOIN FETCH e.user u
            JOIN FETCH e.project p
            LEFT JOIN FETCH u.department d
            LEFT JOIN FETCH u.manager m
            WHERE e.company.id = :companyId
              AND e.deleted = false
              AND (:status IS NULL OR e.status = :status)
              AND (:projectId IS NULL OR p.id = :projectId)
              AND (:category IS NULL OR e.category = :category)
              AND (:duplicate IS NULL OR :duplicate = false OR e.duplicateOfExpense IS NOT NULL OR e.aiDecision = com.reeva.backend.expense.AiDecision.DUPLICATE_REJECTED)
              AND (:fiscalInvalid IS NULL OR :fiscalInvalid = false OR e.sefazStatus = com.reeva.backend.expense.SefazStatus.INVALID OR e.aiDecision = com.reeva.backend.expense.AiDecision.REJECTED_BY_FISCAL_VALIDATION)
              AND (:policyViolation IS NULL OR :policyViolation = false OR e.aiDecision = com.reeva.backend.expense.AiDecision.REJECTED_BY_POLICY OR (e.policyCompliant = false AND (e.aiDecision IS NULL OR e.aiDecision <> com.reeva.backend.expense.AiDecision.REJECTED_BY_FISCAL_VALIDATION)))
              AND (:lowOcr IS NULL OR :lowOcr = false OR e.status = com.reeva.backend.expense.ExpenseStatus.OCR_FAILED OR (e.aiScore IS NOT NULL AND e.aiScore < 85))
              AND e.expenseDate >= :from
              AND e.expenseDate <= :to
            ORDER BY e.createdAt DESC
            """,
        countQuery = """
            SELECT COUNT(e) FROM Expense e
            JOIN e.user u
            JOIN e.project p
            WHERE e.company.id = :companyId
              AND e.deleted = false
              AND (:status IS NULL OR e.status = :status)
              AND (:projectId IS NULL OR p.id = :projectId)
              AND (:category IS NULL OR e.category = :category)
              AND (:duplicate IS NULL OR :duplicate = false OR e.duplicateOfExpense IS NOT NULL OR e.aiDecision = com.reeva.backend.expense.AiDecision.DUPLICATE_REJECTED)
              AND (:fiscalInvalid IS NULL OR :fiscalInvalid = false OR e.sefazStatus = com.reeva.backend.expense.SefazStatus.INVALID OR e.aiDecision = com.reeva.backend.expense.AiDecision.REJECTED_BY_FISCAL_VALIDATION)
              AND (:policyViolation IS NULL OR :policyViolation = false OR e.aiDecision = com.reeva.backend.expense.AiDecision.REJECTED_BY_POLICY OR (e.policyCompliant = false AND (e.aiDecision IS NULL OR e.aiDecision <> com.reeva.backend.expense.AiDecision.REJECTED_BY_FISCAL_VALIDATION)))
              AND (:lowOcr IS NULL OR :lowOcr = false OR e.status = com.reeva.backend.expense.ExpenseStatus.OCR_FAILED OR (e.aiScore IS NOT NULL AND e.aiScore < 85))
              AND e.expenseDate >= :from
              AND e.expenseDate <= :to
            """
    )
    Page<Expense> findByCompanyForCfoExpenses(
        @Param("companyId") UUID companyId,
        @Param("status") ExpenseStatus status,
        @Param("projectId") UUID projectId,
        @Param("category") String category,
        @Param("duplicate") Boolean duplicate,
        @Param("fiscalInvalid") Boolean fiscalInvalid,
        @Param("policyViolation") Boolean policyViolation,
        @Param("lowOcr") Boolean lowOcr,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to,
        Pageable pageable
    );

    @Query("""
        SELECT e FROM Expense e
        WHERE e.company.id = :companyId
          AND e.receiptFingerprint = :fingerprint
          AND e.id <> :currentExpenseId
          AND e.deleted = false
        ORDER BY e.createdAt ASC
        """)
    List<Expense> findActiveDuplicatesByFingerprint(
        @Param("companyId") UUID companyId,
        @Param("fingerprint") String fingerprint,
        @Param("currentExpenseId") UUID currentExpenseId
    );

    @Query("""
        SELECT e.user.id,
               SUM(CASE WHEN e.status IN :pendingStatuses THEN 1 ELSE 0 END),
               SUM(CASE WHEN e.status IN :approvedStatuses THEN 1 ELSE 0 END),
               COALESCE(SUM(CASE WHEN e.status IN :approvedStatuses THEN e.amount ELSE 0 END), 0)
        FROM Expense e
        WHERE e.project.createdBy.id = :managerId
          AND e.deleted = false
        GROUP BY e.user.id
        """)
    List<Object[]> aggregateStatsByManagerId(
        @Param("managerId") UUID managerId,
        @Param("pendingStatuses") List<ExpenseStatus> pendingStatuses,
        @Param("approvedStatuses") List<ExpenseStatus> approvedStatuses
    );

    @Query("""
        SELECT e.user.id,
               SUM(CASE WHEN e.status IN :pendingStatuses THEN 1 ELSE 0 END),
               SUM(CASE WHEN e.status IN :approvedStatuses THEN 1 ELSE 0 END),
               COALESCE(SUM(CASE WHEN e.status IN :approvedStatuses THEN e.amount ELSE 0 END), 0)
        FROM Expense e
        WHERE e.user.company.id = :companyId
          AND e.deleted = false
        GROUP BY e.user.id
        """)
    List<Object[]> aggregateStatsByCompanyId(
        @Param("companyId") UUID companyId,
        @Param("pendingStatuses") List<ExpenseStatus> pendingStatuses,
        @Param("approvedStatuses") List<ExpenseStatus> approvedStatuses
    );
}
