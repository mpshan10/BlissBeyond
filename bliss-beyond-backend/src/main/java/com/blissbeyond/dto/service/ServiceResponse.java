package com.blissbeyond.dto.service;

import java.math.BigDecimal;

public record ServiceResponse(
    Long id,
    String name,
    String description,
    BigDecimal basePrice,
    boolean customizable,
    boolean available
) {
}
