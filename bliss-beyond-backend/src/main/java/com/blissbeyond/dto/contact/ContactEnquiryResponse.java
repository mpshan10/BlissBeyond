package com.blissbeyond.dto.contact;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContactEnquiryResponse(
    Long id, String name, String email, String phone, String eventType,
    LocalDate preferredDate, Integer guestCount, String message,
    String status, LocalDateTime createdAt
) {}
