package com.blissbeyond.dto.contact;

import com.blissbeyond.entity.ContactEnquiryStatus;
import jakarta.validation.constraints.NotNull;

public record ContactEnquiryStatusRequest(@NotNull ContactEnquiryStatus status) {}
