package com.blissbeyond.controller;

import com.blissbeyond.dto.payment.PaymentResponse;
import com.blissbeyond.service.CurrentUserService;
import com.blissbeyond.repository.PaymentRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer/payments")
public class PaymentController {
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;

    public PaymentController(PaymentRepository paymentRepository, CurrentUserService currentUserService) {
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<PaymentResponse> listMine() {
        Long customerId = currentUserService.requireCurrentUser().getId();
        return paymentRepository.findByBookingCustomerId(customerId).stream().map(payment -> new PaymentResponse(
            payment.getId(),
            payment.getBooking() != null ? payment.getBooking().getId() : null,
            payment.getPaymentType() != null ? payment.getPaymentType().name() : null,
            payment.getAmount(),
            payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : null,
            payment.getPaymentMethod(),
            payment.getTransactionReference(),
            payment.getPaidAt()
        )).toList();
    }

}
