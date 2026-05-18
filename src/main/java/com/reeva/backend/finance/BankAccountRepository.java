package com.reeva.backend.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {
    List<BankAccount> findByCompanyIdAndActiveTrueOrderByAccountNameAsc(UUID companyId);
    Optional<BankAccount> findByIdAndCompanyIdAndActiveTrue(UUID id, UUID companyId);
}
