package com.reeva.backend.auth;

import com.reeva.backend.auth.dto.AuthResponse;
import com.reeva.backend.auth.dto.LoginRequest;
import com.reeva.backend.auth.dto.RegisterRequest;
import com.reeva.backend.auth.jwt.JwtService;
import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.company.Company;
import com.reeva.backend.company.CompanyRepository;
import com.reeva.backend.user.User;
import com.reeva.backend.user.UserRole;
import com.reeva.backend.user.UserService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final CompanyRepository companyRepository;

    public AuthService(UserService userService, JwtService jwtService,
                       AuthenticationManager authenticationManager, PasswordEncoder passwordEncoder,
                       AuditService auditService, CompanyRepository companyRepository) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userService.existsByEmail(request.email())) {
            throw BusinessException.conflict("Email already in use");
        }

        Company company = companyRepository.findById(request.companyId())
            .orElseThrow(() -> BusinessException.notFound("Company not found"));

        User user = new User(company, request.name(), request.email(),
            passwordEncoder.encode(request.password()), UserRole.EMPLOYEE);

        userService.save(user);
        auditService.log(company.getId(), user.getId(), "USER_REGISTERED");

        return new AuthResponse(jwtService.generateToken(user), user.getId(),
            user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userService.findByEmail(request.email());
        user.setLastLoginAt(Instant.now());
        userService.save(user);

        auditService.log(user.getCompany().getId(), user.getId(), "USER_LOGIN");

        return new AuthResponse(jwtService.generateToken(user), user.getId(),
            user.getName(), user.getEmail(), user.getRole());
    }
}
