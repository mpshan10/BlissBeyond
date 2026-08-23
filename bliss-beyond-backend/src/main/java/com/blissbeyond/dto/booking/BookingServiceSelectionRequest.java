package com.blissbeyond.dto.booking;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;

public record BookingServiceSelectionRequest(
    Long backendServiceId,
    String serviceKey,
    BigDecimal estimatedTotal,
    JsonNode customization
) {
}
