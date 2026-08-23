package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;

public record AdminQuotationDetailResponse(
    Long quotationId,
    String status,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    String notes,
    Long customerId,
    String customerName,
    String customerEmail,
    Long eventId,
    String eventType,
    LocalDate eventDate,
    Integer guestCount,
    Long venueId,
    String venueName,
    String venueLocation,
    BigDecimal venueHire,
    List<ServiceLine> services,
    BigDecimal serviceSubtotal,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal additionalCharges,
    BigDecimal total,
    Long bookingId,
    String bookingReference,
    String bookingStatus,
    String bookingType,
    String packageName,
    BigDecimal packageSnapshotPrice,
    JsonNode packageInclusions
) {
    public record ServiceLine(
        Long eventServiceId,
        Long serviceId,
        String serviceName,
        BigDecimal estimatedTotal
    ) {
    }
}
