package com.reeva.backend.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpensePolicyRepository extends JpaRepository<ExpensePolicy, UUID> {

    Optional<ExpensePolicy> findByCompanyIdAndCategoryAndActiveTrue(UUID companyId, ExpenseCategory category);

    Optional<ExpensePolicy> findByCompanyIdAndCategory(UUID companyId, ExpenseCategory category);

    List<ExpensePolicy> findByCompanyIdAndActiveTrueOrderByCategoryAsc(UUID companyId);
}
