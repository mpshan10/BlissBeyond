package com.blissbeyond.dto.admin;

public record AdminCustomerSummaryResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phone,
    String address,
    boolean enabled,
    long bookingCount,
    long quotationCount,
    long paymentCount
) {
}
