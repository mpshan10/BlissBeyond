package com.blissbeyond.controller;

import com.blissbeyond.dto.quotation.QuotationCreateRequest;
import com.blissbeyond.dto.quotation.QuotationResponse;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.PackageBookingSnapshot;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.service.QuotationService;
import com.blissbeyond.service.EventService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/quotations")
@PreAuthorize("hasRole('CUSTOMER')")
public class QuotationController {
    private final QuotationService quotationService;
    private final EventService eventService;
    private final BookingRepository bookingRepository;
    private final PackageBookingSnapshotRepository packageBookingSnapshotRepository;
    private final ObjectMapper objectMapper;

    public QuotationController(QuotationService quotationService, EventService eventService, BookingRepository bookingRepository,
                               PackageBookingSnapshotRepository packageBookingSnapshotRepository, ObjectMapper objectMapper) {
        this.quotationService = quotationService;
        this.eventService = eventService;
        this.bookingRepository = bookingRepository;
        this.packageBookingSnapshotRepository = packageBookingSnapshotRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<QuotationResponse> list() {
        return quotationService.listMine().stream().map(this::map).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public QuotationResponse get(@PathVariable Long id) {
        return map(quotationService.requireOwnedQuotation(id));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<QuotationResponse> createDraft(@Valid @RequestBody QuotationCreateRequest request) {
        var event = eventService.requireOwnedEvent(request.eventId());
        Quotation quotation = quotationService.createDraft(
            event,
            request.discount(),
            request.additionalCharges(),
            request.notes()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(map(quotation));
    }

    private QuotationResponse map(Quotation quotation) {
        Booking booking = quotation.getEvent() == null ? null : bookingRepository.findByEventId(quotation.getEvent().getId()).orElse(null);
        PackageBookingSnapshot snapshot = booking != null && booking.getBookingType() == BookingType.PACKAGE
            ? packageBookingSnapshotRepository.findByBookingId(booking.getId()).orElse(null)
            : null;
        return new QuotationResponse(
            quotation.getId(),
            quotation.getEvent() != null ? quotation.getEvent().getId() : null,
            booking != null ? booking.getId() : null,
            quotation.getSubtotal(),
            quotation.getDiscount(),
            quotation.getAdditionalCharges(),
            quotation.getTotal(),
            quotation.getStatus() != null ? quotation.getStatus().name() : null,
            quotation.getNotes(),
            quotation.getCreatedAt(),
            quotation.getExpiresAt(),
            quotation.getEvent() == null ? null : new QuotationResponse.QuotationEvent(
                quotation.getEvent().getId(),
                quotation.getEvent().getEventType(),
                quotation.getEvent().getEventDate(),
                quotation.getEvent().getGuestCount()
            ),
            quotation.getEvent() == null || quotation.getEvent().getVenue() == null ? null : new QuotationResponse.QuotationVenue(
                quotation.getEvent().getVenue().getId(),
                quotation.getEvent().getVenue().getName(),
                quotation.getEvent().getVenue().getLocation(),
                quotation.getEvent().getVenue().getPrice()
            ),
            snapshot == null ? serviceSubtotal(quotation) : BigDecimal.ZERO,
            snapshot == null && quotation.getEvent() != null ? quotation.getEvent().getServices().stream()
                .filter(com.blissbeyond.entity.EventService::isSelected)
                .map(service -> new QuotationResponse.QuotationServiceLine(
                    service.getService() != null ? service.getService().getId() : null,
                    service.getServiceNameSnapshot() != null ? service.getServiceNameSnapshot()
                        : (service.getService() != null ? service.getService().getName() : null),
                    service.getEstimatedTotal()
                ))
                .toList() : List.of(),
            booking != null ? booking.getBookingType().name() : null,
            snapshot != null ? snapshot.getPackageName() : null,
            snapshot != null ? snapshot.getFinalPrice() : null,
            parseInclusions(snapshot)
        );
    }

    private JsonNode parseInclusions(PackageBookingSnapshot snapshot) {
        if (snapshot == null || snapshot.getInclusionsJson() == null) return null;
        try {
            return objectMapper.readTree(snapshot.getInclusionsJson());
        } catch (Exception ignored) {
            return objectMapper.createArrayNode();
        }
    }

    private BigDecimal serviceSubtotal(Quotation quotation) {
        if (quotation.getEvent() == null) return BigDecimal.ZERO;
        return quotation.getEvent().getServices().stream()
            .filter(com.blissbeyond.entity.EventService::isSelected)
            .map(com.blissbeyond.entity.EventService::getEstimatedTotal)
            .filter(value -> value != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
