package com.reeva.backend.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByCompanyIdAndActiveTrueOrderByNameAsc(UUID companyId);
    Optional<Project> findByIdAndCompanyIdAndActiveTrue(UUID id, UUID companyId);
}
