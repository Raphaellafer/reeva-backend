package com.reeva.backend.finance;

import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.company.DepartmentRepository;
import com.reeva.backend.finance.dto.CreateManagerRequest;
import com.reeva.backend.finance.dto.ManagerListResponse;
import com.reeva.backend.user.CpfUtils;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRepository;
import com.reeva.backend.user.UserRole;
import com.reeva.backend.user.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CfoManagerService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;

    public CfoManagerService(UserRepository userRepository,
                             UserService userService,
                             AuditService auditService,
                             PasswordEncoder passwordEncoder,
                             DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerListResponse> listManagers(User cfo) {
        return userRepository.findByCompanyIdAndActiveTrueOrderByNameAsc(cfo.getCompany().getId())
            .stream()
            .filter(u -> u.getRole() == UserRole.MANAGER)
            .map(manager -> ManagerListResponse.of(manager,
                userRepository.countByManagerId(manager.getId())))
            .toList();
    }

    @Transactional
    public ManagerListResponse createManager(User cfo, CreateManagerRequest request) {
        if (userService.existsByEmail(request.email())) {
            throw BusinessException.conflict("Email already in use");
        }
        String normalizedCpf = CpfUtils.normalize(request.cpf());
        if (!CpfUtils.isValid(normalizedCpf)) {
            throw BusinessException.badRequest("CPF invalido");
        }
        if (userRepository.existsByCpf(normalizedCpf)) {
            throw BusinessException.conflict("Ja existe um usuario com este CPF");
        }
        String normalizedPhone = request.phoneNumber().replaceAll("\\D", "");
        if (normalizedPhone.length() < 6) {
            throw BusinessException.badRequest("Numero de telefone invalido");
        }

        User manager = new User(
            cfo.getCompany(),
            request.name(),
            request.email(),
            passwordEncoder.encode(request.password()),
            UserRole.MANAGER
        );
        manager.setPixKey(request.pixKey().trim());
        manager.setCpf(normalizedCpf);
        manager.setPhoneCountryCode(request.phoneCountryCode().trim().toUpperCase());
        manager.setPhoneNumber(normalizedPhone);

        if (request.departmentId() != null) {
            var dept = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> BusinessException.notFound("Department not found"));
            manager.setDepartment(dept);
        }

        User saved = userService.save(manager);
        auditService.log(cfo.getCompany().getId(), cfo.getId(),
            "MANAGER_CREATED", "User", saved.getId(),
            Map.of("managerName", saved.getName(), "managerEmail", saved.getEmail()), null);

        return ManagerListResponse.of(saved, 0L);
    }
}
