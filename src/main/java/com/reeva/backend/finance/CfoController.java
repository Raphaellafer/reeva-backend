package com.reeva.backend.finance;

import com.reeva.backend.expense.ExpenseStatus;
import com.reeva.backend.finance.dto.CfoComplianceResponse;
import com.reeva.backend.finance.dto.CfoCashFlowResponse;
import com.reeva.backend.finance.dto.CashTransactionRequest;
import com.reeva.backend.finance.dto.CfoExpenseResponse;
import com.reeva.backend.finance.dto.CfoOverviewResponse;
import com.reeva.backend.finance.dto.CreateManagerRequest;
import com.reeva.backend.finance.dto.ManagerListResponse;
import com.reeva.backend.finance.dto.ProjectFinancialEntryRequest;
import com.reeva.backend.finance.dto.ProjectFinancialEntryResponse;
import com.reeva.backend.finance.dto.ProjectPerformanceResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyAuditLogResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.manager.ManagerService;
import com.reeva.backend.project.ProjectService;
import com.reeva.backend.project.dto.ProjectRequest;
import com.reeva.backend.project.dto.ProjectResponse;
import com.reeva.backend.project.dto.TeamMemberResponse;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cfo")
@PreAuthorize("hasRole('MANAGER') or hasRole('FINANCE') or hasRole('ADMIN')")
@Tag(name = "CFO", description = "Project financial performance and Reeva executive metrics")
public class CfoController {

    private final CfoProjectMetricsService metricsService;
    private final CfoExecutiveService executiveService;
    private final CfoManagerService managerService;
    private final ManagerService policyService;
    private final PolicyUploadService policyUploadService;
    private final CfoCashFlowService cashFlowService;
    private final ProjectService projectService;

    public CfoController(CfoProjectMetricsService metricsService,
                         CfoExecutiveService executiveService,
                         CfoManagerService managerService,
                         ManagerService policyService,
                         PolicyUploadService policyUploadService,
                         CfoCashFlowService cashFlowService,
                         ProjectService projectService) {
        this.metricsService = metricsService;
        this.executiveService = executiveService;
        this.managerService = managerService;
        this.policyService = policyService;
        this.policyUploadService = policyUploadService;
        this.cashFlowService = cashFlowService;
        this.projectService = projectService;
    }

    @GetMapping("/overview")
    @Operation(summary = "Get real executive reimbursement overview")
    public CfoOverviewResponse overview(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return executiveService.overview(currentUser, from, to);
    }

    @GetMapping("/policies")
    @Operation(summary = "List active reimbursement policies for CFO")
    public List<PolicyResponse> listPolicies(@AuthenticationPrincipal User currentUser) {
        return executiveService.policies(currentUser);
    }

    @GetMapping("/policies/audit-logs")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "List company expense policy audit logs for CFO")
    public List<PolicyAuditLogResponse> listPolicyAuditLogs(@AuthenticationPrincipal User currentUser) {
        return policyService.listPolicyAuditLogs(currentUser);
    }

    @PutMapping("/policies")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Create or update a company expense policy for CFO")
    public PolicyResponse savePolicy(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody PolicyUpdateRequest request
    ) {
        return policyService.savePolicy(currentUser, request);
    }

    @DeleteMapping("/policies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Deactivate a company expense policy category for CFO")
    public void deletePolicy(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        policyService.deletePolicy(currentUser, id);
    }

    @PostMapping(value = "/policies/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Upload a reimbursement policy document and auto-fill policies via AI")
    public List<PolicyResponse> uploadPolicyFile(
        @AuthenticationPrincipal User currentUser,
        @RequestParam("file") MultipartFile file
    ) {
        return policyUploadService.processUpload(currentUser, file);
    }

    @GetMapping("/expenses")
    @Operation(summary = "List company expenses for CFO")
    public Page<CfoExpenseResponse> listExpenses(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) ExpenseStatus status,
        @RequestParam(required = false) UUID projectId,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Boolean duplicate,
        @RequestParam(required = false) Boolean fiscalInvalid,
        @RequestParam(required = false) Boolean policyViolation,
        @RequestParam(required = false) Boolean lowOcr,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return executiveService.expenses(
            currentUser, status, projectId, category, duplicate, fiscalInvalid, policyViolation, lowOcr, from, to, pageable
        );
    }

    @GetMapping("/compliance")
    @Operation(summary = "Get real reimbursement compliance metrics")
    public CfoComplianceResponse compliance(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return executiveService.compliance(currentUser, from, to);
    }

    @GetMapping("/cash-flow")
    @Operation(summary = "Get cash flow overview from bank accounts and cash transactions")
    public CfoCashFlowResponse cashFlow(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return cashFlowService.overview(currentUser, from, to);
    }

    @PostMapping("/cash-transactions")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a manual cash transaction")
    public CfoCashFlowResponse.CashTransactionItem createCashTransaction(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody CashTransactionRequest request
    ) {
        return cashFlowService.createManualTransaction(currentUser, request);
    }

    // ── Manager management ───────────────────────────────────────────

    @GetMapping("/managers")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "List all managers in the company")
    public List<ManagerListResponse> listManagers(@AuthenticationPrincipal User currentUser) {
        return managerService.listManagers(currentUser);
    }

    @PostMapping("/managers")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Register a new manager in the company")
    public ManagerListResponse createManager(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody CreateManagerRequest request
    ) {
        return managerService.createManager(currentUser, request);
    }

    // ── Projects ─────────────────────────────────────────────────────

    @GetMapping("/projects/performance")
    @Operation(summary = "List project financial performance")
    public List<ProjectPerformanceResponse> listProjectPerformance(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return metricsService.listPerformance(currentUser, from, to);
    }

    @GetMapping("/projects")
    @Operation(summary = "List projects for CFO administration")
    public List<ProjectResponse> listProjects(@AuthenticationPrincipal User currentUser) {
        return projectService.listManagedProjects(currentUser);
    }

    @PostMapping("/projects")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project for CFO administration")
    public ProjectResponse createProject(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody ProjectRequest request
    ) {
        return projectService.createProject(currentUser, request);
    }

    @PutMapping("/projects/{projectId}")
    @Operation(summary = "Update project policy, manager and employee assignments")
    public ProjectResponse updateProject(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID projectId,
        @Valid @RequestBody ProjectRequest request
    ) {
        return projectService.updateProject(currentUser, projectId, request);
    }

    @GetMapping("/projects/managers")
    @Operation(summary = "List managers available for project ownership")
    public List<TeamMemberResponse> listProjectManagers(@AuthenticationPrincipal User currentUser) {
        return projectService.listProjectManagers(currentUser);
    }

    @GetMapping("/projects/employees")
    @Operation(summary = "List employees available for project assignment")
    public List<TeamMemberResponse> listProjectEmployees(@AuthenticationPrincipal User currentUser) {
        return projectService.listCompanyEmployees(currentUser);
    }

    @GetMapping("/projects/{projectId}/performance")
    @Operation(summary = "Get one project financial performance")
    public ProjectPerformanceResponse getProjectPerformance(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID projectId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return metricsService.getPerformance(currentUser, projectId, from, to);
    }

    @GetMapping("/projects/{projectId}/financial-entries")
    @Operation(summary = "List demo financial entries for a project")
    public List<ProjectFinancialEntryResponse> listFinancialEntries(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID projectId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return metricsService.listEntries(currentUser, projectId, from, to);
    }

    @PostMapping("/projects/{projectId}/financial-entries")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a financial entry for a project")
    public ProjectFinancialEntryResponse createFinancialEntry(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID projectId,
        @Valid @RequestBody ProjectFinancialEntryRequest request
    ) {
        return metricsService.createEntry(currentUser, projectId, request);
    }
}
