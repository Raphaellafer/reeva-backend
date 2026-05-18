package com.reeva.backend.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpensePolicyRepository extends JpaRepository<ExpensePolicy, UUID> {

    Optional<ExpensePolicy> findByCompanyIdAndCategoryAndActiveTrue(UUID companyId, String category);

    Optional<ExpensePolicy> findByCompanyIdAndCategory(UUID companyId, String category);

    List<ExpensePolicy> findByCompanyIdAndActiveTrueOrderByCategoryAsc(UUID companyId);
}
