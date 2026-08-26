package com.blissbeyond.controller;

import com.blissbeyond.dto.auth.AuthResponse;
import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpRequest;
import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpResponse;
import com.blissbeyond.dto.auth.ForgotPasswordResetRequest;
import com.blissbeyond.dto.auth.ForgotPasswordResetResponse;
import com.blissbeyond.dto.auth.ForgotPasswordVerifyOtpRequest;
import com.blissbeyond.dto.auth.ForgotPasswordVerifyOtpResponse;
import com.blissbeyond.dto.auth.GoogleAuthRequest;
import com.blissbeyond.dto.auth.LoginRequest;
import com.blissbeyond.dto.auth.RegisterRequest;
import com.blissbeyond.service.AuthService;
import com.blissbeyond.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.loginWithGoogle(request.credential()));
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<ForgotPasswordRequestOtpResponse> requestOtp(@Valid @RequestBody ForgotPasswordRequestOtpRequest request) {
        return ResponseEntity.ok(passwordResetService.requestOtp(request));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<ForgotPasswordVerifyOtpResponse> verifyOtp(@Valid @RequestBody ForgotPasswordVerifyOtpRequest request) {
        return ResponseEntity.ok(passwordResetService.verifyOtp(request));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<ForgotPasswordResetResponse> reset(@Valid @RequestBody ForgotPasswordResetRequest request) {
        return ResponseEntity.ok(passwordResetService.resetPassword(request));
    }
}
