package com.blissbeyond.repository;

import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByOrderByIdDesc();
    List<Payment> findByBookingCustomerId(Long customerId);
    List<Payment> findByBookingIdOrderByIdAsc(Long bookingId);
    java.util.Optional<Payment> findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(
        Long bookingId, PaymentType paymentType, PaymentStatus paymentStatus
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    boolean existsByTransactionReferenceIgnoreCaseAndPaymentStatusIn(
        String transactionReference, Collection<PaymentStatus> paymentStatuses);
}
