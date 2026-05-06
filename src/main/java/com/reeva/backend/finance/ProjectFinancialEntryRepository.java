package com.reeva.backend.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ProjectFinancialEntryRepository extends JpaRepository<ProjectFinancialEntry, UUID> {

    List<ProjectFinancialEntry> findByProjectIdAndCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
        UUID projectId,
        UUID companyId,
        LocalDate from,
        LocalDate to
    );
}
