package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminBookingDetailResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.EventService;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.PackageBookingSnapshot;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.ConsultationRepository;
import com.blissbeyond.repository.EventServiceRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.PaymentRepository;
import com.blissbeyond.repository.ServiceCustomizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class AdminBookingDetailService {
    private final BookingRepository bookingRepository;
    private final PackageBookingSnapshotRepository snapshotRepository;
    private final EventServiceRepository eventServiceRepository;
    private final ServiceCustomizationRepository customizationRepository;
    private final PaymentRepository paymentRepository;
    private final ConsultationRepository consultationRepository;
    private final ObjectMapper objectMapper;

    public AdminBookingDetailService(BookingRepository bookingRepository,
                                     PackageBookingSnapshotRepository snapshotRepository,
                                     EventServiceRepository eventServiceRepository,
                                     ServiceCustomizationRepository customizationRepository,
                                     PaymentRepository paymentRepository,
                                     ConsultationRepository consultationRepository,
                                     ObjectMapper objectMapper) {
        this.bookingRepository = bookingRepository;
        this.snapshotRepository = snapshotRepository;
        this.eventServiceRepository = eventServiceRepository;
        this.customizationRepository = customizationRepository;
        this.paymentRepository = paymentRepository;
        this.consultationRepository = consultationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public AdminBookingDetailResponse get(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found."));
        User customer = booking.getCustomer();
        var event = booking.getEvent();
        Venue venue = event == null ? null : event.getVenue();
        List<Payment> payments = paymentRepository.findByBookingIdOrderByIdAsc(id);
        Quotation quotation = booking.getQuotation();

        BookingType bookingType = booking.getBookingType() == null ? BookingType.CUSTOM : booking.getBookingType();
        return new AdminBookingDetailResponse(
            booking.getId(), reference(booking.getId()), bookingType.name(),
            booking.getStatus() == null ? null : booking.getStatus().name(), booking.getCreatedAt(), booking.getConfirmedAt(),
            new AdminBookingDetailResponse.Customer(
                customer == null ? null : customer.getId(), customerName(customer),
                customer == null ? null : customer.getEmail(), customer == null ? null : customer.getPhone()),
            new AdminBookingDetailResponse.Event(
                event == null ? null : event.getId(), event == null ? null : event.getEventType(),
                booking.getEventDate(), booking.getStartTime(), booking.getEndTime(),
                event == null ? null : event.getGuestCount(), event == null ? null : event.getSpecialRequirements()),
            new AdminBookingDetailResponse.Venue(
                venue == null ? booking.getVenueId() : venue.getId(), venue == null ? null : venue.getName(),
                venue == null ? null : venue.getLocation(), venue == null ? null : venue.getCapacity(),
                venue == null ? null : venue.getPrice()),
            paymentSummary(payments), quotation(quotation), consultations(customer),
            bookingType == BookingType.PACKAGE ? packageDetails(booking) : null,
            bookingType == BookingType.CUSTOM ? customizeDetails(booking, quotation) : null
        );
    }

    private AdminBookingDetailResponse.PaymentSummary paymentSummary(List<Payment> payments) {
        BigDecimal paid = payments.stream().filter(item -> item.getPaymentStatus() == PaymentStatus.PAID)
            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pending = payments.stream().filter(item -> item.getPaymentStatus() == PaymentStatus.PENDING)
            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        Payment latest = payments.isEmpty() ? null : payments.get(payments.size() - 1);
        return new AdminBookingDetailResponse.PaymentSummary(
            payments.stream().map(item -> new AdminBookingDetailResponse.Payment(
                item.getId(), item.getPaymentType() == null ? null : item.getPaymentType().name(), item.getAmount(),
                item.getPaymentStatus() == null ? null : item.getPaymentStatus().name(), item.getPaymentMethod(),
                item.getTransactionReference(), item.getPaidAt())).toList(),
            paid, pending, latest == null || latest.getPaymentStatus() == null ? null : latest.getPaymentStatus().name());
    }

    private AdminBookingDetailResponse.Quotation quotation(Quotation item) {
        if (item == null) return null;
        return new AdminBookingDetailResponse.Quotation(item.getId(), item.getStatus() == null ? null : item.getStatus().name(),
            item.getSubtotal(), item.getDiscount(), item.getAdditionalCharges(), item.getTotal(),
            item.getCreatedAt(), item.getExpiresAt(), item.getNotes());
    }

    private List<AdminBookingDetailResponse.Consultation> consultations(User customer) {
        if (customer == null) return List.of();
        return consultationRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream()
            .map(item -> new AdminBookingDetailResponse.Consultation(item.getId(), item.getStatus() == null ? null : item.getStatus().name(),
                item.getConsultationDate(), item.getStartTime(), item.getEndTime(), item.getConsultationType(), item.getPlanner(), item.getNotes()))
            .toList();
    }

    private AdminBookingDetailResponse.PackageDetails packageDetails(Booking booking) {
        PackageBookingSnapshot snapshot = snapshotRepository.findByBookingId(booking.getId()).orElse(null);
        if (snapshot == null) return null;
        return new AdminBookingDetailResponse.PackageDetails(snapshot.getPackageName(),
            snapshot.getCategory() == null ? null : snapshot.getCategory().name(), snapshot.getFinalPrice(),
            snapshot.getVenueName(), snapshot.getMaxGuests(), parse(snapshot.getInclusionsJson()));
    }

    private AdminBookingDetailResponse.CustomizeDetails customizeDetails(Booking booking, Quotation quotation) {
        List<AdminBookingDetailResponse.CustomizeService> services = new ArrayList<>();
        List<AdminBookingDetailResponse.PriceLine> breakdown = new ArrayList<>();
        for (EventService eventService : eventServiceRepository.findByEventId(booking.getEvent().getId())) {
            if (!eventService.isSelected()) continue;
            var service = eventService.getService();
            JsonNode customization = customizationRepository.findByEventServiceId(eventService.getId()).stream()
                .findFirst().map(item -> parse(item.getPayloadJson())).orElse(parse(eventService.getCustomizationJson()));
            BigDecimal price = eventService.getEstimatedTotal();
            services.add(new AdminBookingDetailResponse.CustomizeService(
                eventService.getId(), service == null ? null : service.getName(), price, true, customization));
            if (service != null && price != null) breakdown.add(new AdminBookingDetailResponse.PriceLine(service.getName(), price));
        }
        BigDecimal total = quotation != null && quotation.getTotal() != null
            ? quotation.getTotal()
            : breakdown.stream().map(AdminBookingDetailResponse.PriceLine::amount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new AdminBookingDetailResponse.CustomizeDetails(services, breakdown, total);
    }

    private JsonNode parse(String value) {
        if (value == null || value.isBlank()) return null;
        try { return objectMapper.readTree(value); } catch (Exception ignored) { return null; }
    }

    private String customerName(User customer) {
        return customer == null ? null : (customer.getFirstName() + " " + customer.getLastName()).trim();
    }

    private String reference(Long id) { return id == null ? null : String.format("BK-%04d", id); }
}
