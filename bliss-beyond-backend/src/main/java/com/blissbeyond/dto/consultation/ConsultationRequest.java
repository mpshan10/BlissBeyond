package com.blissbeyond.dto.consultation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record ConsultationRequest(
    Long bookingId,
    @NotNull LocalDate consultationDate,
    @NotNull LocalTime startTime,
    LocalTime endTime,
    @NotBlank @Size(max = 80) String consultationType,
    @Size(max = 120) String planner,
    @Size(max = 2000) String notes
) {
}
