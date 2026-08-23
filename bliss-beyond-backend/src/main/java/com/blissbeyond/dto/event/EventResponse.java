package com.blissbeyond.dto.event;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EventResponse(
    Long id,
    String eventType,
    LocalDate eventDate,
    Integer guestCount,
    BigDecimal budget,
    String specialRequirements,
    String status,
    Long customerId,
    Long venueId,
    String venueName
) {
}
