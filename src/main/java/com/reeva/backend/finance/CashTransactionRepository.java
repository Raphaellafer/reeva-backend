package com.reeva.backend.finance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashTransactionRepository extends JpaRepository<CashTransaction, UUID> {
    Optional<CashTransaction> findByExpenseId(UUID expenseId);

    @Query("""
        SELECT t FROM CashTransaction t
        JOIN FETCH t.bankAccount b
        LEFT JOIN FETCH t.project p
        LEFT JOIN FETCH t.expense e
        WHERE t.company.id = :companyId
          AND t.transactionDate >= :from
          AND t.transactionDate <= :to
        ORDER BY t.transactionDate DESC, t.createdAt DESC
        """)
    List<CashTransaction> findByCompanyAndDateRange(
        @Param("companyId") UUID companyId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to
    );

    @Query("""
        SELECT t FROM CashTransaction t
        WHERE t.company.id = :companyId
          AND t.transactionDate > :date
        """)
    List<CashTransaction> findByCompanyAfterDate(
        @Param("companyId") UUID companyId,
        @Param("date") LocalDate date
    );
}
