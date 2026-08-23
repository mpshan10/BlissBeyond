package com.blissbeyond.repository;

import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByOrderByIdDesc();
    List<Payment> findByBookingCustomerId(Long customerId);
    List<Payment> findByBookingIdOrderByIdAsc(Long bookingId);
    java.util.Optional<Payment> findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(
        Long bookingId, PaymentType paymentType, PaymentStatus paymentStatus
    );
}
