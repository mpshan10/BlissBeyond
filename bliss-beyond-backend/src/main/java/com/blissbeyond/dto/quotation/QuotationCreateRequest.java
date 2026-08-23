package com.blissbeyond.dto.quotation;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record QuotationCreateRequest(
    @NotNull Long eventId,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal additionalCharges,
    BigDecimal total,
    String notes
) {
}
