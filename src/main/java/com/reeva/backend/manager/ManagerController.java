package com.reeva.backend.manager;

import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.finance.PolicyUploadService;
import com.reeva.backend.finance.dto.BankAccountResponse;
import com.reeva.backend.manager.dto.CreateEmployeeRequest;
import com.reeva.backend.manager.dto.DashboardResponse;
import com.reeva.backend.manager.dto.EmployeeListResponse;
import com.reeva.backend.manager.dto.EmployeeProfileResponse;
import com.reeva.backend.manager.dto.MarkPaymentRequest;
import com.reeva.backend.manager.dto.PaymentBatchResponse;
import com.reeva.backend.manager.dto.PaymentScheduleRequest;
import com.reeva.backend.manager.dto.PaymentScheduleResponse;
import com.reeva.backend.manager.dto.PolicyAuditLogResponse;
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
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
@Tag(name = "Manager", description = "Manager expense review and approval")
public class ManagerController {

    private final ManagerService managerService;
    private final PolicyUploadService policyUploadService;

    public ManagerController(ManagerService managerService, PolicyUploadService policyUploadService) {
        this.managerService = managerService;
        this.policyUploadService = policyUploadService;
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

    @GetMapping("/policies/audit-logs")
    @Operation(summary = "List company expense policy audit logs")
    public List<PolicyAuditLogResponse> listPolicyAuditLogs(@AuthenticationPrincipal User currentUser) {
        return managerService.listPolicyAuditLogs(currentUser);
    }

    @PostMapping(value = "/policies/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Upload a reimbursement policy document and auto-fill policies via AI")
    public List<PolicyResponse> uploadPolicyFile(
        @AuthenticationPrincipal User currentUser,
        @RequestParam("file") MultipartFile file
    ) {
        return policyUploadService.processUpload(currentUser, file);
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

    @GetMapping("/payment-schedule")
    @Operation(summary = "Get company reimbursement payment schedule")
    public PaymentScheduleResponse paymentSchedule(@AuthenticationPrincipal User currentUser) {
        return managerService.paymentSchedule(currentUser);
    }

    @PutMapping("/payment-schedule")
    @Operation(summary = "Update company reimbursement payment schedule")
    public PaymentScheduleResponse updatePaymentSchedule(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody PaymentScheduleRequest request
    ) {
        return managerService.updatePaymentSchedule(currentUser, request);
    }

    // ── Employee management ──────────────────────────────────────────

    @GetMapping("/bank-accounts")
    @Operation(summary = "List active bank accounts available for reimbursement payments")
    public List<BankAccountResponse> bankAccounts(@AuthenticationPrincipal User currentUser) {
        return managerService.bankAccounts(currentUser);
    }

    @PostMapping("/expenses/{id}/mark-paid")
    @Operation(summary = "Mark an approved reimbursement as paid and create cash outflow")
    public ExpenseResponse markPaid(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody MarkPaymentRequest request
    ) {
        return managerService.markExpenseAsPaid(currentUser, id, request);
    }

    @GetMapping("/employees")
    @Operation(summary = "List team employees with expense metrics")
    public List<EmployeeListResponse> listEmployees(@AuthenticationPrincipal User currentUser) {
        return managerService.listEmployees(currentUser);
    }

    @GetMapping("/employees/{id}")
    @Operation(summary = "Get employee profile with recent expenses")
    public EmployeeProfileResponse getEmployee(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return managerService.getEmployee(currentUser, id);
    }

    @PostMapping("/employees")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new employee under this manager")
    public EmployeeListResponse createEmployee(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody CreateEmployeeRequest request
    ) {
        return managerService.createEmployee(currentUser, request);
    }
}
