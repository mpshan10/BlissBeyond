package com.blissbeyond.service;

import com.blissbeyond.dto.auth.AuthResponse;
import com.blissbeyond.dto.auth.LoginRequest;
import com.blissbeyond.dto.auth.RegisterRequest;
import com.blissbeyond.entity.Role;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.repository.RoleRepository;
import com.blissbeyond.repository.UserRepository;
import com.blissbeyond.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        Role customerRole = roleRepository.findByName(RoleName.ROLE_CUSTOMER)
            .orElseThrow(() -> new ForbiddenActionException("Customer role is not configured"));

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email().toLowerCase());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoles(new HashSet<>(Set.of(customerRole)));
        User saved = userRepository.save(user);

        return issueToken(saved);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password())
        );
        User user = userRepository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new ForbiddenActionException("Invalid credentials"));
        return issueToken(user);
    }

    private AuthResponse issueToken(User user) {
        List<String> roles = user.getRoles().stream().map(role -> role.getName().name()).toList();
        String token = jwtService.generateToken(
            user.getEmail(),
            roles,
            Map.of("userId", user.getId(), "email", user.getEmail())
        );
        return new AuthResponse(
            token,
            "Bearer",
            user.getId(),
            user.getEmail(),
            user.getFirstName() + " " + user.getLastName(),
            roles
        );
    }
}
