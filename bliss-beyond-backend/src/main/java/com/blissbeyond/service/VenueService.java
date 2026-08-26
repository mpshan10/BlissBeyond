package com.blissbeyond.service;

import com.blissbeyond.dto.venue.VenueResponse;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.VenueRepository;
import com.blissbeyond.validation.EventTimeValidator;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

@Service
public class VenueService {
    private final VenueRepository venueRepository;
    private final BookingRepository bookingRepository;

    public VenueService(VenueRepository venueRepository, BookingRepository bookingRepository) {
        this.venueRepository = venueRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<VenueResponse> listVenues() {
        return venueRepository.findAll().stream()
            .filter(Venue::isAvailable)
            .map(this::map)
            .toList();
    }

    public List<VenueResponse> findAvailableVenues(LocalDate date, LocalTime startTime, LocalTime endTime, Integer guests) {
        validateAvailabilityRequest(date, startTime, endTime, guests);

        return venueRepository.findAll().stream()
            .filter(Venue::isAvailable)
            .filter(venue -> venue.getCapacity() != null && venue.getCapacity() >= guests)
            .filter(venue -> isAvailableForSlot(venue.getId(), date, startTime, endTime, null))
            .map(this::map)
            .toList();
    }

    public void ensureBookingSlotAvailable(Long venueId, LocalDate date, LocalTime startTime,
                                            LocalTime endTime, Long excludedBookingId) {
        Venue venue = findVenueEntityForUpdate(venueId);
        if (!venue.isAvailable()) {
            throw new IllegalArgumentException("The selected venue is currently unavailable.");
        }
        if (date == null) {
            throw new IllegalArgumentException("A valid event date and time range are required.");
        }
        validateAdvanceBookingDate(date);
        EventTimeValidator.validate(startTime, endTime);
        if (!isAvailableForSlot(venueId, date, startTime, endTime, excludedBookingId)) {
            throw new IllegalArgumentException("The selected venue is no longer available for the requested date and time.");
        }
    }

    public void ensurePackageBookingSlotAvailable(Long venueId, LocalDate date, LocalTime startTime,
                                                  LocalTime endTime) {
        Venue venue = findVenueEntityForUpdate(venueId);
        if (!venue.isAvailable()) {
            throw new IllegalArgumentException("The selected venue is currently unavailable.");
        }
        if (date == null) {
            throw new IllegalArgumentException("A valid event date and time range are required.");
        }
        validateAdvanceBookingDate(date);
        EventTimeValidator.validate(startTime, endTime);
        if (!isAvailableForSlot(venueId, date, startTime, endTime, null)) {
            throw new DuplicateResourceException("Venue is no longer available for the selected date and time.");
        }
    }

    public void ensureVenueCapacity(Long venueId, Integer guests) {
        if (guests == null || guests <= 0) {
            throw new IllegalArgumentException("guestCount must be greater than 0");
        }
        Venue venue = findVenueEntity(venueId);
        if (venue.getCapacity() == null) {
            throw new IllegalArgumentException("The selected venue does not have a configured guest capacity.");
        }
        if (venue.getCapacity() < guests) {
            throw new IllegalArgumentException("The selected venue cannot accommodate the requested guest count.");
        }
    }

    public VenueResponse getVenue(Long id) {
        return map(findVenueEntity(id));
    }

    public Venue findVenueEntity(Long id) {
        return venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
    }

    private Venue findVenueEntityForUpdate(Long id) {
        return venueRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
    }

    public VenueResponse map(Venue venue) {
        return new VenueResponse(
            venue.getId(),
            venue.getName(),
            venue.getType(),
            venue.getLocation(),
            venue.getDescription(),
            venue.getCapacity(),
            venue.getPrice(),
            venue.getImage(),
            venue.getWebsiteUrl(),
            venue.isAvailable()
        );
    }

    private boolean isAvailableForSlot(Long venueId, LocalDate date, LocalTime requestedStart,
                                       LocalTime requestedEnd, Long excludedBookingId) {
        return bookingRepository.findByVenueIdAndEventDate(venueId, date).stream()
            .filter(booking -> excludedBookingId == null || !excludedBookingId.equals(booking.getId()))
            .filter(booking -> booking.getStatus() != null && ACTIVE_BOOKING_STATUSES.contains(booking.getStatus()))
            .filter(booking -> booking.getStartTime() != null && booking.getEndTime() != null)
            .noneMatch(booking -> requestedStart.isBefore(booking.getEndTime()) && requestedEnd.isAfter(booking.getStartTime()));
    }

    private void validateAvailabilityRequest(LocalDate date, LocalTime startTime, LocalTime endTime, Integer guests) {
        if (date == null) {
            throw new IllegalArgumentException("date is required");
        }
        validateAdvanceBookingDate(date);
        if (startTime == null) {
            throw new IllegalArgumentException("startTime is required");
        }
        if (endTime == null) {
            throw new IllegalArgumentException("endTime is required");
        }
        if (guests == null) {
            throw new IllegalArgumentException("guests is required");
        }
        if (guests <= 0) {
            throw new IllegalArgumentException("guests must be greater than 0");
        }
        EventTimeValidator.validate(startTime, endTime);
    }

    private void validateAdvanceBookingDate(LocalDate date) {
        LocalDate minimumAllowedDate = LocalDate.now().plusMonths(1);
        if (date.isBefore(minimumAllowedDate)) {
            throw new IllegalArgumentException("Event date must be at least one month in advance.");
        }
    }

    private static final EnumSet<BookingStatus> ACTIVE_BOOKING_STATUSES = EnumSet.of(
        BookingStatus.PENDING,
        BookingStatus.AWAITING_DEPOSIT,
        BookingStatus.CONFIRMED
    );
}
