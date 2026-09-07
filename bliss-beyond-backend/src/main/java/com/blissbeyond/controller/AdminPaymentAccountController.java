package com.blissbeyond.controller;

import com.blissbeyond.dto.admin.AdminPaymentAccountRequest;
import com.blissbeyond.dto.admin.AdminPaymentAccountResponse;
import com.blissbeyond.service.PaymentAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/payment-accounts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentAccountController {
    private final PaymentAccountService service;

    public AdminPaymentAccountController(PaymentAccountService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminPaymentAccountResponse> list() {
        return service.listAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPaymentAccountResponse create(@Valid @RequestBody AdminPaymentAccountRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public AdminPaymentAccountResponse update(
        @PathVariable Long id,
        @Valid @RequestBody AdminPaymentAccountRequest request
    ) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/enable")
    public AdminPaymentAccountResponse enable(@PathVariable Long id) {
        return service.setAvailable(id, true);
    }

    @PatchMapping("/{id}/disable")
    public AdminPaymentAccountResponse disable(@PathVariable Long id) {
        return service.setAvailable(id, false);
    }
}
