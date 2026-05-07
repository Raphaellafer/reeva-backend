package com.reeva.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByManagerId(UUID managerId);

    List<User> findByManagerIdAndActiveTrueOrderByNameAsc(UUID managerId);

    List<User> findByCompanyIdAndActiveTrueOrderByNameAsc(UUID companyId);
}
