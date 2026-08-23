package com.blissbeyond.dto.consultation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record ConsultationResponse(
    Long id,
    Long customerId,
    String customerName,
    String customerEmail,
    LocalDate consultationDate,
    LocalTime startTime,
    LocalTime endTime,
    String consultationType,
    String planner,
    String notes,
    String status,
    LocalDateTime createdAt,
    LocalDateTime completedAt
) {
}
