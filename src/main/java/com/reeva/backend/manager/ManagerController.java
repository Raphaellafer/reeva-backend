package com.reeva.backend.manager;

import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.PaymentBatchResponse;
import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.manager.dto.PolicyUpdateRequest;
import com.reeva.backend.manager.dto.ReviewRequest;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
@Tag(name = "Manager", description = "Manager expense review and approval")
public class ManagerController {

    private final ManagerService managerService;

    public ManagerController(ManagerService managerService) {
        this.managerService = managerService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Manager dashboard KPIs")
    public DashboardResponse dashboard(@AuthenticationPrincipal User currentUser) {
        return managerService.getDashboard(currentUser);
    }

    @GetMapping("/policies")
    @Operation(summary = "List company expense policies")
    public List<PolicyResponse> listPolicies(@AuthenticationPrincipal User currentUser) {
        return managerService.listPolicies(currentUser);
    }

    @PutMapping("/policies")
    @Operation(summary = "Create or update a company expense policy")
    public PolicyResponse savePolicy(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody PolicyUpdateRequest request
    ) {
        return managerService.savePolicy(currentUser, request);
    }

    @GetMapping("/expenses")
    @Operation(summary = "List team expenses, optionally filtered by status")
    public Page<ExpenseResponse> listExpenses(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) String status,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return managerService.listTeamExpenses(currentUser, status, pageable);
    }

    @GetMapping("/expenses/{id}")
    @Operation(summary = "Get team expense detail")
    public ExpenseResponse getExpense(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return managerService.getExpenseDetail(currentUser, id);
    }

    @PostMapping("/expenses/{id}/approve")
    @Operation(summary = "Approve a team expense")
    public ExpenseResponse approve(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return managerService.approve(currentUser, id);
    }

    @PostMapping("/expenses/{id}/reject")
    @Operation(summary = "Reject a team expense")
    public ExpenseResponse reject(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody ReviewRequest request
    ) {
        return managerService.reject(currentUser, id, request);
    }

    @PostMapping("/expenses/{id}/request-revision")
    @Operation(summary = "Request revision from employee")
    public ExpenseResponse requestRevision(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody ReviewRequest request
    ) {
        return managerService.requestRevision(currentUser, id, request);
    }

    @GetMapping("/payments/approved")
    @Operation(summary = "List approved reimbursements ready to send to finance")
    public PaymentBatchResponse approvedPayments(
        @AuthenticationPrincipal User currentUser,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return managerService.approvedPayments(currentUser, from, to);
    }
}
