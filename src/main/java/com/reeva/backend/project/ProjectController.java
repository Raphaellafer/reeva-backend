package com.reeva.backend.project;

import com.reeva.backend.project.dto.ProjectRequest;
import com.reeva.backend.project.dto.ProjectResponse;
import com.reeva.backend.project.dto.TeamMemberResponse;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Projects", description = "Project allocation for expenses")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/projects/my")
    @Operation(summary = "List projects assigned to the authenticated employee")
    public List<ProjectResponse> myProjects(@AuthenticationPrincipal User currentUser) {
        return projectService.listMyProjects(currentUser);
    }

    @GetMapping("/manager/projects")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "List projects managed in the company")
    public List<ProjectResponse> managedProjects(@AuthenticationPrincipal User currentUser) {
        return projectService.listManagedProjects(currentUser);
    }

    @PostMapping("/manager/projects")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project and assign employees")
    public ProjectResponse createProject(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody ProjectRequest request
    ) {
        return projectService.createProject(currentUser, request);
    }

    @PutMapping("/manager/projects/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "Update a project and its employee assignments")
    public ProjectResponse updateProject(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody ProjectRequest request
    ) {
        return projectService.updateProject(currentUser, id, request);
    }

    @DeleteMapping("/manager/projects/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate a project")
    public void deleteProject(@AuthenticationPrincipal User currentUser, @PathVariable UUID id) {
        projectService.deactivateProject(currentUser, id);
    }

    @GetMapping("/manager/team-members")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Operation(summary = "List active employees managed by current manager")
    public List<TeamMemberResponse> teamMembers(@AuthenticationPrincipal User currentUser) {
        return projectService.listTeamMembers(currentUser);
    }
}
