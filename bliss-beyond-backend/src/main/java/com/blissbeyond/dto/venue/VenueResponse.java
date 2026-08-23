package com.blissbeyond.dto.venue;

import java.math.BigDecimal;

public record VenueResponse(
    Long id,
    String name,
    String type,
    String location,
    String description,
    Integer capacity,
    BigDecimal price,
    String image,
    boolean available
) {
}
