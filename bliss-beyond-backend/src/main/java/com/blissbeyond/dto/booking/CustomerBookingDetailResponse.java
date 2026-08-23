package com.blissbeyond.dto.booking;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record CustomerBookingDetailResponse(
    Long id,
    String ref,
    String status,
    LocalDateTime createdAt,
    LocalDateTime confirmedAt,
    BookingEvent event,
    BookingVenue venue,
    LocalDate eventDate,
    LocalTime startTime,
    LocalTime endTime,
    List<BookingServiceItem> services,
    BookingCateringDetail catering,
    BigDecimal estimatedTotal,
    Long quotationId,
    String bookingType,
    Long packageId,
    String packageSlug,
    String packageName,
    JsonNode packageInclusions,
    BigDecimal packagePriceSnapshot
) {
    public record BookingEvent(
        Long id,
        String eventType,
        Integer guestCount
    ) {
    }

    public record BookingVenue(
        Long id,
        String name,
        String location,
        BigDecimal price
    ) {
    }

    public record BookingServiceItem(
        Long backendServiceId,
        String name,
        BigDecimal estimatedTotal,
        boolean selected,
        JsonNode customization
    ) {
    }

    public record BookingMenuSelection(
        Long foodId,
        String name,
        Integer quantity,
        BigDecimal estimatedTotal
    ) {
    }

    public record BookingCateringDetail(
        Long backendServiceId,
        String name,
        BigDecimal estimatedTotal,
        JsonNode customization,
        List<BookingMenuSelection> menuSelections
    ) {
    }
}
