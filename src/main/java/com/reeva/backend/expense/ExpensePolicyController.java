package com.reeva.backend.expense;

import com.reeva.backend.manager.dto.PolicyResponse;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/policies")
@Tag(name = "Policies", description = "Read-only reimbursement policies")
public class ExpensePolicyController {

    private final ExpensePolicyRepository policyRepository;

    public ExpensePolicyController(ExpensePolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    @GetMapping
    @Operation(summary = "List active reimbursement policies for the authenticated user's company")
    public List<PolicyResponse> listPolicies(@AuthenticationPrincipal User currentUser) {
        return policyRepository.findByCompanyIdAndActiveTrueOrderByCategoryAsc(currentUser.getCompany().getId())
            .stream()
            .map(PolicyResponse::from)
            .toList();
    }
}
