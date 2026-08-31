package com.blissbeyond.repository;

import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.util.Set;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByCustomerId(Long customerId);
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<Booking> findByEventId(Long eventId);
    List<Booking> findAllByEventIdIn(Collection<Long> eventIds);
    List<Booking> findByVenueIdAndEventDate(Long venueId, LocalDate eventDate);

    @Query("select distinct b.venueId from Booking b where b.eventDate = :eventDate "
        + "and b.status in :statuses and b.startTime is not null and b.endTime is not null "
        + "and b.startTime < :endTime and b.endTime > :startTime")
    Set<Long> findBookedVenueIdsForSlot(@Param("eventDate") LocalDate eventDate,
                                        @Param("startTime") java.time.LocalTime startTime,
                                        @Param("endTime") java.time.LocalTime endTime,
                                        @Param("statuses") Collection<BookingStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);
}
