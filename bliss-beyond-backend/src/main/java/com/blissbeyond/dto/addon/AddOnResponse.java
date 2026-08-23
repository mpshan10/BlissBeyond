package com.blissbeyond.dto.addon;

import com.blissbeyond.entity.AddOnBillingType;

import java.math.BigDecimal;

public record AddOnResponse(
    Long id,
    String name,
    String description,
    AddOnBillingType billingType,
    BigDecimal price,
    boolean available
) {
}
