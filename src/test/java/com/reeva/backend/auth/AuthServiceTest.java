package com.reeva.backend.auth;

import com.reeva.backend.auth.dto.RegisterRequest;
import com.reeva.backend.auth.jwt.JwtService;
import com.reeva.backend.company.Company;
import com.reeva.backend.company.CompanyRepository;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
<<<<<<< HEAD
import com.reeva.backend.company.Company;
import com.reeva.backend.company.CompanyRepository;
import com.reeva.backend.user.User;
=======
>>>>>>> 3557c5cabb99f186cfa41cf07d59920ab1dff57f
import com.reeva.backend.user.UserRole;
import com.reeva.backend.user.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserService userService;
    @Mock JwtService jwtService;
    @Mock AuthenticationManager authenticationManager;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditService auditService;
    @Mock CompanyRepository companyRepository;

    @InjectMocks AuthService authService;

    static final UUID COMPANY_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    void register_shouldCreateUserAndReturnToken() {
<<<<<<< HEAD
        var request = new RegisterRequest(COMPANY_ID, "João Silva", "joao@empresa.com", "senha123");
        var company = new Company("Reeva Demo", "00.000.000/0001-00", "demo@reeva.com.br", "PRO");

        when(userService.existsByEmail("joao@empresa.com")).thenReturn(false);
        when(companyRepository.findById(COMPANY_ID)).thenReturn(Optional.of(company));
=======
        var companyId = UUID.randomUUID();
        var company = mock(Company.class);
        var request = new RegisterRequest(companyId, "João Silva", "joao@empresa.com", "senha123");

        when(userService.existsByEmail("joao@empresa.com")).thenReturn(false);
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(company.getId()).thenReturn(companyId);
>>>>>>> 3557c5cabb99f186cfa41cf07d59920ab1dff57f
        when(passwordEncoder.encode("senha123")).thenReturn("hashed");
        when(userService.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        var response = authService.register(request);

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.email()).isEqualTo("joao@empresa.com");
        assertThat(response.role()).isEqualTo(UserRole.EMPLOYEE);
<<<<<<< HEAD
=======
        verify(auditService).log(eq(companyId), isNull(), eq("USER_REGISTERED"));
>>>>>>> 3557c5cabb99f186cfa41cf07d59920ab1dff57f
    }

    @Test
    void register_shouldThrowConflict_whenEmailAlreadyExists() {
<<<<<<< HEAD
        var request = new RegisterRequest(COMPANY_ID, "João", "existente@empresa.com", "senha123");
=======
        var request = new RegisterRequest(UUID.randomUUID(), "João", "existente@empresa.com", "senha123");
>>>>>>> 3557c5cabb99f186cfa41cf07d59920ab1dff57f
        when(userService.existsByEmail("existente@empresa.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Email already in use");
    }
}
