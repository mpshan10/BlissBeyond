package com.blissbeyond.repository;

import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.ConsultationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Consultation> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Consultation> findByConsultationDate(LocalDate consultationDate);

    List<Consultation> findAllByConsultationDate(LocalDate consultationDate);

    boolean existsByCustomerIdAndStatusIn(Long customerId, Collection<ConsultationStatus> statuses);
}
