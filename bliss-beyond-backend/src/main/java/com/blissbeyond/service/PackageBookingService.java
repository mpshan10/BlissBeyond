package com.blissbeyond.service;

import com.blissbeyond.dto.booking.PackageBookingRequest;
import com.blissbeyond.dto.booking.PackageBookingResponse;
import com.blissbeyond.entity.*;
import com.blissbeyond.entity.Package;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.EventRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;

@Service
public class PackageBookingService {
    private final PackageService packageService;
    private final CurrentUserService currentUserService;
    private final EventRepository eventRepository;
    private final BookingRepository bookingRepository;
    private final QuotationRepository quotationRepository;
    private final PackageBookingSnapshotRepository snapshotRepository;
    private final VenueService venueService;
    private final ObjectMapper objectMapper;

    public PackageBookingService(PackageService packageService,
                                 CurrentUserService currentUserService,
                                 EventRepository eventRepository,
                                 BookingRepository bookingRepository,
                                 QuotationRepository quotationRepository,
                                 PackageBookingSnapshotRepository snapshotRepository,
                                 VenueService venueService,
                                 ObjectMapper objectMapper) {
        this.packageService = packageService;
        this.currentUserService = currentUserService;
        this.eventRepository = eventRepository;
        this.bookingRepository = bookingRepository;
        this.quotationRepository = quotationRepository;
        this.snapshotRepository = snapshotRepository;
        this.venueService = venueService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PackageBookingResponse create(PackageBookingRequest request) {
        User customer = currentUserService.requireCurrentUser();
        Package eventPackage = packageService.requireActiveEntity(request.packageId(), request.packageSlug());
        Venue venue = eventPackage.getVenue();
        validateRequest(request, eventPackage, venue);

        // Availability is checked again inside the write transaction to close the check/confirm gap.
        venueService.ensurePackageBookingSlotAvailable(venue.getId(), request.eventDate(), request.startTime(), request.endTime());

        Event event = new Event();
        event.setCustomer(customer);
        event.setEventType(eventPackage.getCategory().name());
        event.setEventDate(request.eventDate());
        event.setGuestCount(request.guestCount());
        event.setSpecialRequirements(normalize(request.specialRequests()));
        event.setVenue(venue);
        event.setStatus(EventStatus.BOOKED);
        event = eventRepository.save(event);

        BigDecimal price = eventPackage.getFinalPrice();
        Quotation quotation = new Quotation();
        quotation.setEvent(event);
        quotation.setSubtotal(price);
        quotation.setDiscount(BigDecimal.ZERO);
        quotation.setAdditionalCharges(BigDecimal.ZERO);
        quotation.setTotal(price);
        quotation.setStatus(QuotationStatus.DRAFT);
        quotation = quotationRepository.save(quotation);

        Booking booking = new Booking();
        booking.setCustomer(customer);
        booking.setEvent(event);
        booking.setQuotation(quotation);
        booking.setVenueId(venue.getId());
        booking.setEventDate(request.eventDate());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setBookingType(BookingType.PACKAGE);
        booking.setEventPackage(eventPackage);
        booking.setStatus(BookingStatus.PENDING);
        booking = bookingRepository.save(booking);

        PackageBookingSnapshot snapshot = new PackageBookingSnapshot();
        snapshot.setBooking(booking);
        snapshot.setEventPackage(eventPackage);
        snapshot.setPackageSlug(eventPackage.getSlug());
        snapshot.setPackageName(eventPackage.getName());
        snapshot.setCategory(eventPackage.getCategory());
        snapshot.setVenueId(venue.getId());
        snapshot.setVenueName(venue.getName());
        snapshot.setMaxGuests(eventPackage.getMaxGuests());
        snapshot.setFinalPrice(price);
        snapshot.setInclusionsJson(inclusionsJson(eventPackage));
        snapshotRepository.save(snapshot);

        return new PackageBookingResponse(
            booking.getId(), formatReference(booking.getId()), booking.getBookingType().name(),
            booking.getStatus().name(), eventPackage.getId(), eventPackage.getSlug(), eventPackage.getName(),
            event.getId(), venue.getId(), venue.getName(), request.eventDate(), request.startTime(),
            request.endTime(), request.guestCount(), price
        );
    }

    private void validateRequest(PackageBookingRequest request, Package eventPackage, Venue venue) {
        if (request.eventDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Event date cannot be in the past.");
        }
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("Start time must be before end time.");
        }
        if (request.startTime().isBefore(LocalTime.of(8, 0)) || request.endTime().isAfter(LocalTime.of(23, 30))) {
            throw new IllegalArgumentException("Package bookings must be between 08:00 and 23:30.");
        }
        long minutes = Duration.between(request.startTime(), request.endTime()).toMinutes();
        if (minutes < 120 || minutes > 720) {
            throw new IllegalArgumentException("Package booking duration must be between 2 and 12 hours.");
        }
        if (request.guestCount() > eventPackage.getMaxGuests()) {
            throw new IllegalArgumentException("Guest count exceeds the selected package limit.");
        }
        if (venue.getCapacity() != null && request.guestCount() > venue.getCapacity()) {
            throw new IllegalArgumentException("Guest count exceeds the selected venue capacity.");
        }
        if (eventPackage.getFinalPrice() == null || eventPackage.getFinalPrice().signum() < 0) {
            throw new IllegalArgumentException("Package price is not available.");
        }
    }

    private String inclusionsJson(Package eventPackage) {
        ArrayNode groups = objectMapper.createArrayNode();
        eventPackage.getServiceItems().forEach(item -> {
            ObjectNode group = groups.addObject();
            group.put("serviceId", item.getService().getId());
            group.put("serviceName", item.getService().getName());
            try {
                group.set("inclusions", objectMapper.readTree(item.getInclusionJson()));
            } catch (Exception ex) {
                throw new IllegalArgumentException("Package inclusion data is invalid.");
            }
        });
        return groups.toString();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String formatReference(Long id) {
        return id == null ? null : String.format("BK-%04d", id);
    }
}
