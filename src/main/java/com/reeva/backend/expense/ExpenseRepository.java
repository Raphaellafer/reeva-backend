package com.reeva.backend.expense;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE e.user.id = :userId AND e.deleted = false ORDER BY e.createdAt DESC")
    Page<Expense> findByUserIdNotDeleted(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT e FROM Expense e WHERE e.id = :id AND e.user.id = :userId AND e.deleted = false")
    Optional<Expense> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    long countByUserIdAndStatus(UUID userId, ExpenseStatus status);
}
