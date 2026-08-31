package com.blissbeyond.dto.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ContactEnquiryRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Email @Size(max = 160) String email,
    @Size(max = 40) String phone,
    @Size(max = 80) String eventType,
    LocalDate preferredDate,
    @Positive Integer guestCount,
    @NotBlank @Size(max = 5000) String message
) {}
