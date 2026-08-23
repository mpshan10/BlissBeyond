package com.blissbeyond.dto.quotation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;

public record QuotationResponse(
    Long id,
    Long eventId,
    Long bookingId,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal additionalCharges,
    BigDecimal total,
    String status,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    QuotationEvent event,
    QuotationVenue venue,
    BigDecimal serviceSubtotal,
    List<QuotationServiceLine> services,
    String bookingType,
    String packageName,
    BigDecimal packageSnapshotPrice,
    JsonNode packageInclusions
) {
    public record QuotationEvent(
        Long id,
        String eventType,
        LocalDate eventDate,
        Integer guestCount
    ) {}

    public record QuotationVenue(
        Long id,
        String name,
        String location,
        BigDecimal price
    ) {}

    public record QuotationServiceLine(
        Long id,
        String name,
        BigDecimal estimatedTotal
    ) {}
}
