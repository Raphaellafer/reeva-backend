package com.reeva.backend.expense;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE e.user.id = :userId AND e.deleted = false ORDER BY e.createdAt DESC")
    Page<Expense> findByUserIdNotDeleted(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.user.id = :userId AND e.deleted = false")
    Optional<Expense> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    long countByUserIdAndStatus(UUID userId, ExpenseStatus status);

    // ── Manager queries ──────────────────────────────────────────────

    @Query("""
        SELECT e FROM Expense e
        WHERE e.user.manager.id = :managerId
          AND e.deleted = false
          AND (:status IS NULL OR e.status = :status)
        ORDER BY e.createdAt DESC
        """)
    Page<Expense> findByManagerId(
        @Param("managerId") UUID managerId,
        @Param("status") ExpenseStatus status,
        Pageable pageable
    );

    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.user.manager.id = :managerId AND e.deleted = false")
    Optional<Expense> findByIdAndManagerId(@Param("id") UUID id, @Param("managerId") UUID managerId);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.user.manager.id = :managerId
          AND e.status IN :statuses
          AND e.deleted = false
        """)
    long countByManagerIdAndStatuses(@Param("managerId") UUID managerId, @Param("statuses") List<ExpenseStatus> statuses);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
        WHERE e.user.manager.id = :managerId
          AND e.status = :status
          AND e.deleted = false
        """)
    BigDecimal sumAmountByManagerIdAndStatus(@Param("managerId") UUID managerId, @Param("status") ExpenseStatus status);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.user.manager.id = :managerId
          AND e.aiDecision = :decision
          AND e.deleted = false
        """)
    long countByManagerIdAndAiDecision(@Param("managerId") UUID managerId, @Param("decision") AiDecision decision);

    @Query("""
        SELECT COUNT(e) FROM Expense e
        WHERE e.user.manager.id = :managerId
          AND e.policyCompliant = false
          AND e.deleted = false
        """)
    long countPolicyViolationsByManagerId(@Param("managerId") UUID managerId);

    @Query("""
        SELECT e FROM Expense e
        JOIN FETCH e.user u
        LEFT JOIN FETCH e.project p
        WHERE u.manager.id = :managerId
          AND e.status = :status
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY u.name ASC, e.expenseDate ASC, e.createdAt ASC
        """)
    List<Expense> findApprovedForPayment(
        @Param("managerId") UUID managerId,
        @Param("status") ExpenseStatus status,
        @Param("from") java.time.LocalDate from,
        @Param("to") java.time.LocalDate to
    );

    @Query("""
        SELECT e FROM Expense e
        WHERE e.project.id = :projectId
          AND e.company.id = :companyId
          AND e.deleted = false
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        ORDER BY e.expenseDate ASC, e.createdAt ASC
        """)
    List<Expense> findByProjectForCfoMetrics(
        @Param("companyId") UUID companyId,
        @Param("projectId") UUID projectId,
        @Param("from") java.time.LocalDate from,
        @Param("to") java.time.LocalDate to
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
}
