package com.blissbeyond.dto.booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record PackageBookingRequest(
    Long packageId,
    String packageSlug,
    @NotNull LocalDate eventDate,
    @NotNull LocalTime startTime,
    @NotNull LocalTime endTime,
    @NotNull @Min(1) Integer guestCount,
    String specialRequests
) {}
