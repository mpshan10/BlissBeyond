package com.blissbeyond.repository;

import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.ConsultationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Consultation> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Consultation> findByConsultationDate(LocalDate consultationDate);

    List<Consultation> findAllByConsultationDate(LocalDate consultationDate);

    @Query("""
        select count(c) > 0 from Consultation c
        where c.customer.id = :customerId and c.status in :statuses
          and (c.consultationDate > :today or (c.consultationDate = :today and c.endTime > :now))
        """)
    boolean hasUpcomingConsultation(@Param("customerId") Long customerId,
                                    @Param("statuses") Collection<ConsultationStatus> statuses,
                                    @Param("today") LocalDate today, @Param("now") LocalTime now);
}
