package com.reeva.backend.finance;

import com.reeva.backend.expense.ExpenseCategory;
import com.reeva.backend.expense.ExpenseStatus;
import com.reeva.backend.finance.dto.CfoComplianceResponse;
import com.reeva.backend.finance.dto.CfoExpenseResponse;
import com.reeva.backend.finance.dto.CfoOverviewResponse;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    public CfoController(CfoProjectMetricsService metricsService, CfoExecutiveService executiveService) {
        this.metricsService = metricsService;
        this.executiveService = executiveService;
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

    @GetMapping("/expenses")
    @Operation(summary = "List company expenses for CFO")
    public Page<CfoExpenseResponse> listExpenses(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) ExpenseStatus status,
        @RequestParam(required = false) UUID projectId,
        @RequestParam(required = false) ExpenseCategory category,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return executiveService.expenses(currentUser, status, projectId, category, from, to, pageable);
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
