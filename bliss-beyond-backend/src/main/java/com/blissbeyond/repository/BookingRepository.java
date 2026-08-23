package com.blissbeyond.repository;

import com.blissbeyond.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByCustomerId(Long customerId);
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<Booking> findByEventId(Long eventId);
    List<Booking> findByVenueIdAndEventDate(Long venueId, LocalDate eventDate);
}
