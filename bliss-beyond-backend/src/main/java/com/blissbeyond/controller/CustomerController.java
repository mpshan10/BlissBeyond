package com.blissbeyond.controller;

import com.blissbeyond.dto.booking.CustomerBookingDetailResponse;
import com.blissbeyond.dto.booking.CustomerBookingSummaryResponse;
import com.blissbeyond.dto.customer.CustomerResponse;
import com.blissbeyond.dto.customer.CustomerProfileUpdateRequest;
import com.blissbeyond.dto.customer.CustomerPasswordChangeRequest;
import com.blissbeyond.dto.event.EventResponse;
import com.blissbeyond.dto.quotation.QuotationResponse;
import com.blissbeyond.dto.payment.PaymentResponse;
import com.blissbeyond.dto.payment.PaymentSummaryResponse;
import com.blissbeyond.dto.payment.CustomerPaymentSubmissionRequest;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.PackageBookingSnapshot;
import com.blissbeyond.service.BookingService;
import com.blissbeyond.service.CurrentUserService;
import com.blissbeyond.service.EventService;
import com.blissbeyond.service.QuotationService;
import com.blissbeyond.service.PaymentService;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {
    private final CurrentUserService currentUserService;
    private final EventService eventService;
    private final BookingService bookingService;
    private final QuotationService quotationService;
    private final PaymentService paymentService;
    private final BookingRepository bookingRepository;
    private final PackageBookingSnapshotRepository packageBookingSnapshotRepository;
    private final ObjectMapper objectMapper;

    public CustomerController(CurrentUserService currentUserService, EventService eventService, BookingService bookingService, QuotationService quotationService, PaymentService paymentService, BookingRepository bookingRepository, PackageBookingSnapshotRepository packageBookingSnapshotRepository, ObjectMapper objectMapper) {
        this.currentUserService = currentUserService;
        this.eventService = eventService;
        this.bookingService = bookingService;
        this.quotationService = quotationService;
        this.paymentService = paymentService;
        this.bookingRepository = bookingRepository;
        this.packageBookingSnapshotRepository = packageBookingSnapshotRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/me")
    public CustomerResponse me() {
        return toCustomerResponse(currentUserService.requireCurrentUser());
    }

    @PutMapping("/profile")
    public CustomerResponse updateProfile(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody CustomerProfileUpdateRequest request) {
        return toCustomerResponse(currentUserService.updateProfile(request));
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody CustomerPasswordChangeRequest request) {
        currentUserService.changePassword(request);
        return Map.of("message", "Password changed successfully.");
    }

    private CustomerResponse toCustomerResponse(User user) {
        List<String> roles = user.getRoles().stream().map(role -> role.getName().name()).toList();
        return new CustomerResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail(), user.getPhone(), user.getAddress(), roles);
    }

    @GetMapping("/events")
    public List<EventResponse> events() {
        return eventService.listMine();
    }

    @GetMapping("/bookings")
    public List<CustomerBookingSummaryResponse> bookings() {
        return bookingService.listMineSummaries();
    }

    @GetMapping("/bookings/{id}")
    public CustomerBookingDetailResponse booking(@PathVariable Long id) {
        return bookingService.requireOwnedBookingDetail(id);
    }

    @org.springframework.web.bind.annotation.PostMapping("/bookings/{bookingId}/payments")
    public org.springframework.http.ResponseEntity<PaymentResponse> createPayment(
        @PathVariable Long bookingId,
        @Valid @RequestBody(required = false) CustomerPaymentSubmissionRequest request
    ) {
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
            .body(paymentService.toResponse(paymentService.createNextPayment(bookingId, request)));
    }

    @GetMapping("/bookings/{bookingId}/payment-summary")
    public PaymentSummaryResponse paymentSummary(@PathVariable Long bookingId) {
        return paymentService.getSummary(bookingId);
    }

    @PutMapping("/quotations/{id}/accept")
    @Transactional
    public QuotationResponse acceptQuotation(@PathVariable Long id) {
        return toQuotationResponse(quotationService.accept(id));
    }

    @PutMapping("/quotations/{id}/reject")
    @Transactional
    public QuotationResponse rejectQuotation(@PathVariable Long id) {
        return toQuotationResponse(quotationService.reject(id));
    }

    @GetMapping("/quotations")
    @Transactional(readOnly = true)
    public List<QuotationResponse> quotations() {
        return quotationService.listMine().stream().map(this::toQuotationResponse).toList();
    }

    private QuotationResponse toQuotationResponse(com.blissbeyond.entity.Quotation quotation) {
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
            snapshot == null && quotation.getEvent() != null ? quotation.getEvent().getServices().stream()
                .filter(com.blissbeyond.entity.EventService::isSelected)
                .map(com.blissbeyond.entity.EventService::getEstimatedTotal)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add) : BigDecimal.ZERO,
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
}
