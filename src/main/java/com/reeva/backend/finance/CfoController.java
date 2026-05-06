package com.reeva.backend.finance;

import com.reeva.backend.finance.dto.ProjectFinancialEntryRequest;
import com.reeva.backend.finance.dto.ProjectFinancialEntryResponse;
import com.reeva.backend.finance.dto.ProjectPerformanceResponse;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

    public CfoController(CfoProjectMetricsService metricsService) {
        this.metricsService = metricsService;
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
