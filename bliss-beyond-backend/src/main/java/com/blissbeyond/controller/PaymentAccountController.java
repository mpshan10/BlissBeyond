package com.blissbeyond.controller;

import com.blissbeyond.dto.payment.PaymentAccountResponse;
import com.blissbeyond.service.PaymentAccountService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer/payment-accounts")
@PreAuthorize("hasRole('CUSTOMER')")
public class PaymentAccountController {
    private final PaymentAccountService service;

    public PaymentAccountController(PaymentAccountService service) {
        this.service = service;
    }

    @GetMapping
    public List<PaymentAccountResponse> listAvailable() {
        return service.listAvailable();
    }
}
