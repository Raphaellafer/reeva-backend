package com.reeva.backend.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {
    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);
    List<ProjectMember> findByUserIdAndProjectActiveTrueOrderByProjectNameAsc(UUID userId);
    List<ProjectMember> findByProjectIdOrderByUserNameAsc(UUID projectId);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
}
