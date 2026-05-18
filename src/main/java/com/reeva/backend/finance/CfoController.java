package com.reeva.backend.finance;

import com.reeva.backend.expense.ExpenseStatus;
import com.reeva.backend.finance.dto.CfoComplianceResponse;
import com.reeva.backend.finance.dto.CfoExpenseResponse;
import com.reeva.backend.finance.dto.CfoOverviewResponse;
import com.reeva.backend.finance.dto.CreateManagerRequest;
import com.reeva.backend.finance.dto.ManagerListResponse;
import com.reeva.backend.finance.dto.ProjectFinancialEntryRequest;
import com.reeva.backend.finance.dto.ProjectFinancialEntryResponse;
import com.reeva.backend.finance.dto.ProjectPerformanceResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
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
    private final PolicyUploadService policyUploadService;

    public CfoController(CfoProjectMetricsService metricsService,
                         CfoExecutiveService executiveService,
                         CfoManagerService managerService,
                         PolicyUploadService policyUploadService) {
        this.metricsService = metricsService;
        this.executiveService = executiveService;
        this.managerService = managerService;
        this.policyUploadService = policyUploadService;
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
