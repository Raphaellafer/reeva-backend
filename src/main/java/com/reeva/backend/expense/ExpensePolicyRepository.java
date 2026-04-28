package com.reeva.backend.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExpensePolicyRepository extends JpaRepository<ExpensePolicy, UUID> {

    Optional<ExpensePolicy> findByCompanyIdAndCategoryAndActiveTrue(UUID companyId, ExpenseCategory category);
}

