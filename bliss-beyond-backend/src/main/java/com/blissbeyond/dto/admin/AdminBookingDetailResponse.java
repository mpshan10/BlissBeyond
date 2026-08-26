package com.blissbeyond.dto.admin;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record AdminBookingDetailResponse(
    Long bookingId,
    String bookingReference,
    String bookingType,
    String bookingStatus,
    LocalDateTime createdAt,
    LocalDateTime confirmedAt,
    Customer customer,
    Event event,
    Venue venue,
    PaymentSummary payments,
    Quotation quotation,
    List<Consultation> consultations,
    PackageDetails packageDetails,
    CustomizeDetails customizeDetails
) {
    public record Customer(Long id, String name, String email, String phone) {}

    public record Event(Long id, String eventType, LocalDate eventDate, LocalTime startTime,
                        LocalTime endTime, Integer guestCount, String specialRequirements) {}

    public record Venue(Long id, String name, String location, Integer capacity, BigDecimal price) {}

    public record PaymentSummary(List<Payment> records, BigDecimal paidAmount,
                                 BigDecimal pendingAmount, String latestStatus) {}

    public record Payment(Long id, String paymentType, BigDecimal amount, String status,
                          String method, String transactionReference, LocalDateTime paidAt) {}

    public record Quotation(Long id, String status, BigDecimal subtotal, BigDecimal discount,
                            BigDecimal additionalCharges, BigDecimal total,
                            LocalDateTime createdAt, LocalDateTime expiresAt, String notes) {}

    public record Consultation(Long id, String status, LocalDate consultationDate,
                               LocalTime startTime, LocalTime endTime, String consultationType,
                               String planner, String notes) {}

    public record PackageDetails(String name, String category, BigDecimal bookedPrice,
                                 String snapshotVenueName, Integer maxGuests,
                                 JsonNode inclusions) {}

    public record CustomizeDetails(List<CustomizeService> services,
                                   List<PriceLine> priceBreakdown, BigDecimal total) {}

    public record CustomizeService(Long id, String name, BigDecimal price,
                                   boolean selected, JsonNode customization) {}

    public record PriceLine(String label, BigDecimal amount) {}
}
