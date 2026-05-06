package com.reeva.backend.project;

import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.project.dto.ProjectRequest;
import com.reeva.backend.project.dto.ProjectResponse;
import com.reeva.backend.project.dto.TeamMemberResponse;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, ProjectMemberRepository memberRepository,
                          UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> listManagedProjects(User manager) {
        return projectRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(manager.getCompany().getId())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> listMyProjects(User employee) {
        return memberRepository.findByUserIdAndProjectActiveTrueOrderByProjectNameAsc(employee.getId())
            .stream()
            .map(ProjectMember::getProject)
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listTeamMembers(User manager) {
        return userRepository.findByManagerIdAndActiveTrueOrderByNameAsc(manager.getId())
            .stream()
            .map(TeamMemberResponse::from)
            .toList();
    }

    @Transactional
    public ProjectResponse createProject(User manager, ProjectRequest request) {
        Project project = new Project(manager.getCompany(), request.name(), manager);
        apply(project, request);
        Project saved = projectRepository.save(project);
        syncMembers(saved, manager, request.employeeIds());
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse updateProject(User manager, UUID projectId, ProjectRequest request) {
        Project project = getManagedProject(manager, projectId);
        apply(project, request);
        syncMembers(project, manager, request.employeeIds());
        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public void deactivateProject(User manager, UUID projectId) {
        Project project = getManagedProject(manager, projectId);
        project.setActive(false);
        projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public Project getEmployeeProject(User employee, UUID projectId) {
        Project project = projectRepository.findByIdAndCompanyIdAndActiveTrue(projectId, employee.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Project not found"));
        if (!memberRepository.existsByProjectIdAndUserId(projectId, employee.getId())) {
            throw BusinessException.badRequest("Employee is not assigned to this project");
        }
        return project;
    }

    private Project getManagedProject(User manager, UUID projectId) {
        return projectRepository.findByIdAndCompanyIdAndActiveTrue(projectId, manager.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Project not found"));
    }

    private void apply(Project project, ProjectRequest request) {
        project.setName(request.name());
        project.setCode(request.code());
        project.setDescription(request.description());
        project.setRevenue(request.revenue());
    }

    private void syncMembers(Project project, User manager, List<UUID> rawEmployeeIds) {
        var employeeIds = new LinkedHashSet<>(rawEmployeeIds != null ? rawEmployeeIds : List.<UUID>of());
        for (ProjectMember existing : memberRepository.findByProjectIdOrderByUserNameAsc(project.getId())) {
            if (!employeeIds.contains(existing.getUser().getId())) {
                memberRepository.delete(existing);
            }
        }

        for (UUID employeeId : employeeIds) {
            User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> BusinessException.notFound("Employee not found"));
            if (employee.getManager() == null || !employee.getManager().getId().equals(manager.getId())) {
                throw BusinessException.badRequest("Employee is not managed by this manager");
            }
            memberRepository.findByProjectIdAndUserId(project.getId(), employeeId)
                .orElseGet(() -> memberRepository.save(new ProjectMember(project, employee, manager)));
        }
    }

    private ProjectResponse toResponse(Project project) {
        List<ProjectResponse.MemberItem> members = memberRepository.findByProjectIdOrderByUserNameAsc(project.getId())
            .stream()
            .map(member -> new ProjectResponse.MemberItem(
                member.getUser().getId(),
                member.getUser().getName(),
                member.getUser().getEmail()
            ))
            .toList();
        return ProjectResponse.from(project, members);
    }
}
