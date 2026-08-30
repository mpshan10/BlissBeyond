package com.blissbeyond.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.blissbeyond.dto.auth.AuthResponse;
import com.blissbeyond.dto.auth.LoginRequest;
import com.blissbeyond.dto.auth.RegisterRequest;
import com.blissbeyond.entity.Role;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.TooManyRequestsException;
import com.blissbeyond.repository.RoleRepository;
import com.blissbeyond.repository.UserRepository;
import com.blissbeyond.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.Collections;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthenticationThrottleService authenticationThrottleService;
    private final String googleClientId;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       AuthenticationThrottleService authenticationThrottleService,
                       @Value("${app.google.client-id:}") String googleClientId) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.authenticationThrottleService = authenticationThrottleService;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        PasswordPolicy.validate(request.password());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email is already registered");
        }

        Role customerRole = roleRepository.findByName(RoleName.ROLE_CUSTOMER)
            .orElseThrow(() -> new ForbiddenActionException("Customer role is not configured"));

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(email);
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRoles(new HashSet<>(Set.of(customerRole)));
        User saved = userRepository.save(user);

        return issueToken(saved);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        if (!authenticationThrottleService.loginAllowed(email)) {
            throw new TooManyRequestsException(
                "Too many unsuccessful sign-in attempts. Please try again later."
            );
        }
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
            );
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
            authenticationThrottleService.clearLoginFailures(email);
            return issueToken(user);
        } catch (AuthenticationException ex) {
            authenticationThrottleService.recordLoginFailure(email);
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    @Transactional
    public AuthResponse loginWithGoogle(String credential) {
        if (googleClientId.isBlank()) {
            throw new IllegalStateException("Google sign-in is not configured");
        }

        GoogleIdToken.Payload payload = verifyGoogleCredential(credential);
        String email = payload.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            boolean admin = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_ADMIN);
            if (admin) {
                throw new ForbiddenActionException("Use the administrator login to sign in");
            }
            boolean customer = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_CUSTOMER);
            if (!customer) {
                throw new ForbiddenActionException("Google sign-in is only available for customer accounts");
            }
            return issueToken(user);
        }

        Role customerRole = roleRepository.findByName(RoleName.ROLE_CUSTOMER)
            .orElseThrow(() -> new ForbiddenActionException("Customer role is not configured"));
        User newUser = new User();
        newUser.setFirstName(nonBlank(payload.get("given_name"), "Google"));
        newUser.setLastName(nonBlank(payload.get("family_name"), "Customer"));
        newUser.setEmail(email);
        newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setRoles(new HashSet<>(Set.of(customerRole)));
        return issueToken(userRepository.save(newUser));
    }

    private GoogleIdToken.Payload verifyGoogleCredential(String credential) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
            GoogleIdToken token = verifier.verify(credential);
            if (token == null
                || !Boolean.TRUE.equals(token.getPayload().getEmailVerified())
                || token.getPayload().getSubject() == null
                || token.getPayload().getSubject().isBlank()
                || token.getPayload().getEmail() == null
                || token.getPayload().getEmail().isBlank()) {
                throw new BadCredentialsException("Invalid Google credential");
            }
            return token.getPayload();
        } catch (BadCredentialsException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadCredentialsException("Invalid Google credential");
        }
    }

    private String nonBlank(Object value, String fallback) {
        String text = value == null ? "" : String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private AuthResponse issueToken(User user) {
        List<String> roles = user.getRoles().stream().map(role -> role.getName().name()).toList();
        String token = jwtService.generateToken(
            user.getEmail(),
            roles,
            Map.of(
                "userId", user.getId(),
                "email", user.getEmail(),
                "securityVersion", user.getSecurityVersion()
            )
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

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
