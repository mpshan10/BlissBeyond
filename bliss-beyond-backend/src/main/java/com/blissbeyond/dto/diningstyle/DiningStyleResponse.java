package com.blissbeyond.dto.diningstyle;

import java.math.BigDecimal;

public record DiningStyleResponse(
    Long id,
    String key,
    String name,
    String description,
    BigDecimal pricePerGuest,
    boolean available
) {
}
