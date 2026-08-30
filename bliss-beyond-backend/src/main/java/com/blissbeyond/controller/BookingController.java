package com.blissbeyond.controller;

import com.blissbeyond.dto.booking.BookingCreateRequest;
import com.blissbeyond.dto.booking.BookingResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.blissbeyond.service.BookingService;
import com.blissbeyond.service.EventService;
import com.blissbeyond.service.QuotationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookingService;
    private final EventService eventService;
    private final QuotationRepository quotationRepository;
    private final BookingRepository bookingRepository;
    private final QuotationService quotationService;

    public BookingController(BookingService bookingService, EventService eventService, QuotationRepository quotationRepository,
                             BookingRepository bookingRepository, QuotationService quotationService) {
        this.bookingService = bookingService;
        this.eventService = eventService;
        this.quotationRepository = quotationRepository;
        this.bookingRepository = bookingRepository;
        this.quotationService = quotationService;
    }

    @GetMapping
    public List<BookingResponse> list() {
        return bookingService.listMine().stream().map(this::map).toList();
    }

    @GetMapping("/{id}")
    public BookingResponse get(@PathVariable Long id) {
        return map(bookingService.requireOwnedBooking(id));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingCreateRequest request) {
        Event event = eventService.requireOwnedEvent(request.eventId());
        Quotation quotation = resolveQuotation(request.quotationId(), event);
        LocalTime startTime = parseTime(request.startTime());
        LocalTime endTime = parseTime(request.endTime());
        Booking booking = bookingService.create(event, quotation, startTime, endTime, request.services());
        if (booking.getBookingType() == BookingType.CUSTOM && booking.getQuotation() == null) {
            Quotation draft = quotationService.createDraft(event, BigDecimal.ZERO, BigDecimal.ZERO, null);
            booking.setQuotation(draft);
            booking = bookingRepository.save(booking);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(map(booking));
    }

    private Quotation resolveQuotation(Long quotationId, Event event) {
        if (quotationId == null) {
            return null;
        }

        Quotation quotation = quotationRepository.findById(quotationId)
            .orElseThrow(() -> new ResourceNotFoundException("Quotation not found."));

        boolean sameEvent = quotation.getEvent() != null
            && quotation.getEvent().getId().equals(event.getId());
        boolean sameCustomer = quotation.getEvent() != null
            && quotation.getEvent().getCustomer() != null
            && event.getCustomer() != null
            && quotation.getEvent().getCustomer().getId().equals(event.getCustomer().getId());

        if (!sameEvent || !sameCustomer) {
            throw new ForbiddenActionException("Quotation does not belong to this event.");
        }

        return quotation;
    }

    private LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalTime.parse(value.length() == 5 ? value + ":00" : value);
    }

    private BookingResponse map(Booking booking) {
        return new BookingResponse(
            booking.getId(),
            booking.getCustomer() != null ? booking.getCustomer().getId() : null,
            booking.getEvent() != null ? booking.getEvent().getId() : null,
            booking.getQuotation() != null ? booking.getQuotation().getId() : null,
            booking.getVenueId(),
            booking.getEventDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getStatus() != null ? booking.getStatus().name() : null,
            booking.getCreatedAt(),
            booking.getConfirmedAt()
        );
    }
}
