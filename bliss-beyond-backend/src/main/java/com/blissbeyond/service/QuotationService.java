package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminQuotationSummaryResponse;
import com.blissbeyond.dto.admin.AdminQuotationDetailResponse;
import com.blissbeyond.dto.admin.AdminQuotationUpdateRequest;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.EventService;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.QuotationStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.EventServiceRepository;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class QuotationService {
    private final QuotationRepository quotationRepository;
    private final EventServiceRepository eventServiceRepository;
    private final CurrentUserService currentUserService;
    private final BookingRepository bookingRepository;
    private final PackageBookingSnapshotRepository packageBookingSnapshotRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    public QuotationService(QuotationRepository quotationRepository,
                            EventServiceRepository eventServiceRepository,
                            CurrentUserService currentUserService,
                            BookingRepository bookingRepository,
                            PackageBookingSnapshotRepository packageBookingSnapshotRepository,
                            ObjectMapper objectMapper,
                            NotificationService notificationService) {
        this.quotationRepository = quotationRepository;
        this.eventServiceRepository = eventServiceRepository;
        this.currentUserService = currentUserService;
        this.bookingRepository = bookingRepository;
        this.packageBookingSnapshotRepository = packageBookingSnapshotRepository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
    }

    public List<Quotation> listMine() {
        User current = currentUserService.requireCurrentUser();
        return quotationRepository.findByEventCustomerId(current.getId());
    }

    @Transactional(readOnly = true)
    public List<AdminQuotationSummaryResponse> listAdminSummaries() {
        return quotationRepository.findAllByOrderByIdDesc().stream()
            .map(this::toAdminSummary)
            .toList();
    }

    @Transactional(readOnly = true)
    public AdminQuotationDetailResponse getAdminDetail(Long id) {
        return toAdminDetail(requireQuotation(id));
    }

    @Transactional
    public AdminQuotationDetailResponse updateAdminDraft(Long id, AdminQuotationUpdateRequest request) {
        Quotation quotation = requireQuotation(id);
        requireDraft(quotation);

        Booking booking = quotation.getEvent() == null ? null : bookingRepository.findByEventId(quotation.getEvent().getId()).orElse(null);
        var snapshot = packageSnapshot(booking);
        BigDecimal subtotal = snapshot != null ? snapshot.getFinalPrice() : quotation.getSubtotal();
        if (subtotal == null || subtotal.signum() < 0) {
            throw new IllegalArgumentException("Quotation subtotal is invalid.");
        }

        BigDecimal discount = request.discount();
        BigDecimal additionalCharges = request.additionalCharges();
        validateNonNegative(discount, "discount");
        validateNonNegative(additionalCharges, "additionalCharges");

        BigDecimal availableBeforeDiscount = subtotal.add(additionalCharges);
        if (discount.compareTo(availableBeforeDiscount) > 0) {
            throw new IllegalArgumentException("Discount cannot exceed subtotal plus additional charges.");
        }

        BigDecimal total = availableBeforeDiscount.subtract(discount);
        if (total.signum() < 0) {
            throw new IllegalArgumentException("Quotation total cannot be negative.");
        }

        quotation.setDiscount(discount);
        quotation.setAdditionalCharges(additionalCharges);
        quotation.setSubtotal(subtotal);
        quotation.setTotal(total);
        quotation.setNotes(normalizeNotes(request.notes()));
        quotation.setExpiresAt(request.expiresAt());
        Quotation saved = quotationRepository.save(quotation);
        notifyQuotation(saved, "Quotation updated", "Your quotation has been updated.",
            "QUOTATION:" + saved.getId() + ":UPDATED:" + saved.getTotal() + ":" + saved.getNotes());
        return toAdminDetail(saved);
    }

    @Transactional
    public AdminQuotationDetailResponse sendAdminQuotation(Long id) {
        Quotation quotation = requireQuotation(id);
        requireDraft(quotation);
        if (quotation.getExpiresAt() == null || !quotation.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Quotation expiry must be in the future before sending.");
        }
        quotation.setStatus(QuotationStatus.SENT);
        Quotation saved = quotationRepository.save(quotation);
        notifyQuotation(saved, "Quotation ready", "Your quotation is ready to review.",
            "QUOTATION:" + saved.getId() + ":SENT:" + saved.getTotal() + ":" + saved.getExpiresAt());
        return toAdminDetail(saved);
    }

    public Quotation requireOwnedQuotation(Long id) {
        Quotation quotation = quotationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));
        User current = currentUserService.requireCurrentUser();
        if (!quotation.getEvent().getCustomer().getId().equals(current.getId())) {
            throw new ForbiddenActionException("You cannot access this quotation");
        }
        return quotation;
    }

    @Transactional
    public Quotation createDraft(Event event,
                                 BigDecimal requestedDiscount,
                                 BigDecimal requestedAdditionalCharges,
                                 String notes) {
        if (quotationRepository.findByEventId(event.getId()).isPresent()) {
            throw new DuplicateResourceException("A quotation already exists for this event");
        }

        if (event.getVenue() == null || event.getVenue().getPrice() == null) {
            throw new IllegalArgumentException("Venue price is not available for quotation.");
        }
        validateNonNegative(requestedDiscount, "discount");
        validateNonNegative(requestedAdditionalCharges, "additionalCharges");

        BigDecimal serviceSubtotal = eventServiceRepository.findByEventId(event.getId()).stream()
            .filter(EventService::isSelected)
            .map(EventService::getEstimatedTotal)
            .filter(value -> value != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subtotal = event.getVenue().getPrice().add(serviceSubtotal);

        // Customer-created drafts cannot set financial adjustments; those belong to a future admin workflow.
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal additionalCharges = BigDecimal.ZERO;
        BigDecimal total = subtotal.add(additionalCharges).subtract(discount);
        if (total.signum() < 0) {
            throw new IllegalArgumentException("Quotation total cannot be negative.");
        }

        Quotation quotation = new Quotation();
        quotation.setEvent(event);
        quotation.setSubtotal(subtotal);
        quotation.setDiscount(discount);
        quotation.setAdditionalCharges(additionalCharges);
        quotation.setTotal(total);
        quotation.setNotes(notes);
        quotation.setStatus(QuotationStatus.DRAFT);
        return quotationRepository.save(quotation);
    }

    @Transactional
    public Quotation accept(Long id) {
        return transitionOwnedQuotation(id, QuotationStatus.ACCEPTED);
    }

    @Transactional
    public Quotation reject(Long id) {
        return transitionOwnedQuotation(id, QuotationStatus.REJECTED);
    }

    private Quotation transitionOwnedQuotation(Long id, QuotationStatus targetStatus) {
        Quotation quotation = requireOwnedQuotation(id);
        if (quotation.getStatus() != QuotationStatus.SENT) {
            throw new IllegalArgumentException("Only SENT quotations can be accepted or rejected.");
        }
        if (quotation.getExpiresAt() != null && quotation.getExpiresAt().isBefore(LocalDateTime.now())) {
            quotation.setStatus(QuotationStatus.EXPIRED);
            quotationRepository.save(quotation);
            throw new IllegalArgumentException("Quotation has expired.");
        }

        quotation.setStatus(targetStatus);
        return quotationRepository.save(quotation);
    }

    private void validateNonNegative(BigDecimal value, String field) {
        if (value != null && value.signum() < 0) {
            throw new IllegalArgumentException(field + " cannot be negative");
        }
    }

    private Quotation requireQuotation(Long id) {
        return quotationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));
    }

    private void requireDraft(Quotation quotation) {
        if (quotation.getStatus() != QuotationStatus.DRAFT) {
            throw new IllegalArgumentException("Only DRAFT quotations can be edited or sent.");
        }
    }

    private void notifyQuotation(Quotation quotation, String title, String message, String fingerprint) {
        User customer = quotation.getEvent() == null ? null : quotation.getEvent().getCustomer();
        notificationService.notifyOnce(
            customer, "QUOTATION", title, message, quotation.getId(),
            "/prototype/customer/quotation.html?id=" + quotation.getId(), fingerprint
        );
    }

    private String normalizeNotes(String notes) {
        if (notes == null || notes.isBlank()) {
            return null;
        }
        return notes.trim();
    }

    private AdminQuotationSummaryResponse toAdminSummary(Quotation quotation) {
        Event event = quotation.getEvent();
        User customer = event != null ? event.getCustomer() : null;
        Venue venue = event != null ? event.getVenue() : null;
        Booking booking = event != null ? bookingRepository.findByEventId(event.getId()).orElse(null) : null;
        var snapshot = packageSnapshot(booking);
        return new AdminQuotationSummaryResponse(
            quotation.getId(),
            quotation.getStatus() != null ? quotation.getStatus().name() : null,
            customer != null ? customer.getId() : null,
            customerName(customer),
            customer != null ? customer.getEmail() : null,
            event != null ? event.getId() : null,
            event != null ? event.getEventType() : null,
            event != null ? event.getEventDate() : null,
            venue != null ? venue.getName() : null,
            quotation.getSubtotal(),
            quotation.getDiscount(),
            quotation.getAdditionalCharges(),
            quotation.getTotal(),
            quotation.getCreatedAt(),
            quotation.getExpiresAt(),
            booking != null ? booking.getId() : null,
            booking != null ? formatBookingReference(booking.getId()) : null,
            booking != null ? booking.getBookingType().name() : null,
            snapshot != null ? snapshot.getPackageName() : null,
            snapshot != null ? snapshot.getFinalPrice() : null
        );
    }

    private AdminQuotationDetailResponse toAdminDetail(Quotation quotation) {
        Event event = quotation.getEvent();
        User customer = event != null ? event.getCustomer() : null;
        Venue venue = event != null ? event.getVenue() : null;
        Booking booking = event != null ? bookingRepository.findByEventId(event.getId()).orElse(null) : null;
        var snapshot = packageSnapshot(booking);
        List<EventService> eventServices = event == null
            ? List.of()
            : eventServiceRepository.findByEventId(event.getId()).stream().filter(EventService::isSelected).toList();
        BigDecimal serviceSubtotal = snapshot == null ? eventServices.stream()
            .map(EventService::getEstimatedTotal)
            .filter(value -> value != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add) : BigDecimal.ZERO;
        List<AdminQuotationDetailResponse.ServiceLine> services = snapshot == null ? eventServices.stream()
            .map(eventService -> new AdminQuotationDetailResponse.ServiceLine(
                eventService.getId(),
                eventService.getService() != null ? eventService.getService().getId() : null,
                eventService.getService() != null ? eventService.getService().getName() : null,
                eventService.getEstimatedTotal()
            ))
            .toList() : List.of();

        return new AdminQuotationDetailResponse(
            quotation.getId(),
            quotation.getStatus() != null ? quotation.getStatus().name() : null,
            quotation.getCreatedAt(),
            quotation.getExpiresAt(),
            quotation.getNotes(),
            customer != null ? customer.getId() : null,
            customerName(customer),
            customer != null ? customer.getEmail() : null,
            event != null ? event.getId() : null,
            event != null ? event.getEventType() : null,
            event != null ? event.getEventDate() : null,
            event != null ? event.getGuestCount() : null,
            venue != null ? venue.getId() : null,
            venue != null ? venue.getName() : null,
            venue != null ? venue.getLocation() : null,
            snapshot == null && venue != null ? venue.getPrice() : null,
            services,
            serviceSubtotal,
            quotation.getSubtotal(),
            quotation.getDiscount(),
            quotation.getAdditionalCharges(),
            quotation.getTotal(),
            booking != null ? booking.getId() : null,
            booking != null ? formatBookingReference(booking.getId()) : null,
            booking != null && booking.getStatus() != null ? booking.getStatus().name() : null,
            booking != null ? booking.getBookingType().name() : null,
            snapshot != null ? snapshot.getPackageName() : null,
            snapshot != null ? snapshot.getFinalPrice() : null,
            parseInclusions(snapshot)
        );
    }

    private com.blissbeyond.entity.PackageBookingSnapshot packageSnapshot(Booking booking) {
        return booking != null && booking.getBookingType() == BookingType.PACKAGE && booking.getId() != null
            ? packageBookingSnapshotRepository.findByBookingId(booking.getId()).orElse(null)
            : null;
    }

    private JsonNode parseInclusions(com.blissbeyond.entity.PackageBookingSnapshot snapshot) {
        if (snapshot == null || snapshot.getInclusionsJson() == null) return null;
        try {
            return objectMapper.readTree(snapshot.getInclusionsJson());
        } catch (Exception ignored) {
            return objectMapper.createArrayNode();
        }
    }

    private String customerName(User customer) {
        return customer == null ? null : (customer.getFirstName() + " " + customer.getLastName()).trim();
    }

    private String formatBookingReference(Long id) {
        return id == null ? null : String.format("BK-%04d", id);
    }
}
