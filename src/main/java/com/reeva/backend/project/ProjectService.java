package com.reeva.backend.project;

import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.project.dto.ProjectRequest;
import com.reeva.backend.project.dto.ProjectResponse;
import com.reeva.backend.project.dto.TeamMemberResponse;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import com.reeva.backend.user.UserRole;
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
    public List<TeamMemberResponse> listProjectManagers(User currentUser) {
        return userRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(currentUser.getCompany().getId())
            .stream()
            .filter(user -> user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN)
            .map(TeamMemberResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listCompanyEmployees(User currentUser) {
        return userRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(currentUser.getCompany().getId())
            .stream()
            .filter(user -> user.getRole() == UserRole.EMPLOYEE)
            .map(TeamMemberResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listTeamMembers(User currentUser, UUID managerId) {
        return userRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(currentUser.getCompany().getId())
            .stream()
            .filter(user -> user.getRole() == UserRole.EMPLOYEE)
            .map(TeamMemberResponse::from)
            .toList();
    }

    @Transactional
    public ProjectResponse createProject(User manager, ProjectRequest request) {
        User responsibleManager = resolveResponsibleManager(manager, request.managerId());
        Project project = new Project(manager.getCompany(), request.name(), responsibleManager);
        apply(project, request);
        Project saved = projectRepository.save(project);
        syncMembers(saved, manager, responsibleManager, request.employeeIds());
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse updateProject(User manager, UUID projectId, ProjectRequest request) {
        Project project = getManagedProject(manager, projectId);
        User responsibleManager = resolveResponsibleManager(manager, request.managerId());
        project.setCreatedBy(responsibleManager);
        apply(project, request);
        syncMembers(project, manager, responsibleManager, request.employeeIds());
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
        project.setPolicyText(request.policyText());
        project.setRevenue(request.revenue());
        project.setEstimatedExpense(request.estimatedExpense());
    }

    private User resolveResponsibleManager(User currentUser, UUID managerId) {
        if (managerId == null || managerId.equals(currentUser.getId())) {
            return currentUser;
        }

        User responsibleManager = userRepository.findById(managerId)
            .orElseThrow(() -> BusinessException.notFound("Manager not found"));
        if (!responsibleManager.isActive()
            || !responsibleManager.getCompany().getId().equals(currentUser.getCompany().getId())
            || (responsibleManager.getRole() != UserRole.MANAGER && responsibleManager.getRole() != UserRole.ADMIN)) {
            throw BusinessException.badRequest("Responsible manager must be an active manager in the same company");
        }
        return responsibleManager;
    }

    private void syncMembers(Project project, User assignedBy, User responsibleManager, List<UUID> rawEmployeeIds) {
        var employeeIds = new LinkedHashSet<>(rawEmployeeIds != null ? rawEmployeeIds : List.<UUID>of());
        for (ProjectMember existing : memberRepository.findByProjectIdOrderByUserNameAsc(project.getId())) {
            if (!employeeIds.contains(existing.getUser().getId())) {
                memberRepository.delete(existing);
            }
        }

        for (UUID employeeId : employeeIds) {
            User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> BusinessException.notFound("Employee not found"));
            if (!employee.isActive()
                || !employee.getCompany().getId().equals(project.getCompany().getId())
                || employee.getRole() != UserRole.EMPLOYEE) {
                throw BusinessException.badRequest("Employee must be an active employee in the same company");
            }
            memberRepository.findByProjectIdAndUserId(project.getId(), employeeId)
                .orElseGet(() -> memberRepository.save(new ProjectMember(project, employee, assignedBy)));
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
