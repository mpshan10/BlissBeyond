package com.blissbeyond.dto.booking;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BookingCreateRequest(
    @NotNull Long eventId,
    Long quotationId,
    String startTime,
    String endTime,
    List<BookingServiceSelectionRequest> services
) {
}
