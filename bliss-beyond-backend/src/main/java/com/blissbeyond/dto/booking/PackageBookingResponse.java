package com.blissbeyond.dto.booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record PackageBookingResponse(
    Long bookingId,
    String bookingReference,
    String bookingType,
    String bookingStatus,
    Long packageId,
    String packageSlug,
    String packageName,
    Long eventId,
    Long venueId,
    String venueName,
    LocalDate eventDate,
    LocalTime startTime,
    LocalTime endTime,
    Integer guestCount,
    BigDecimal packagePriceSnapshot
) {}
