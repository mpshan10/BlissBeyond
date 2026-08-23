package com.blissbeyond.dto.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EventRequest(
    @NotBlank String eventType,
    @NotNull LocalDate eventDate,
    @NotNull Integer guestCount,
    BigDecimal budget,
    String specialRequirements,
    Long venueId
) {
}
