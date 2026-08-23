package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AdminCustomerDetailResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phone,
    String address,
    boolean enabled,
    long totalBookings,
    long pendingBookings,
    long awaitingDepositBookings,
    long confirmedBookings,
    long cancelledBookings,
    long completedBookings,
    long quotations,
    long payments,
    BigDecimal paidAmount,
    List<RecentBooking> recentBookings
) {
    public record RecentBooking(
        Long bookingId,
        String bookingReference,
        String eventType,
        String venueName,
        LocalDate eventDate,
        String status
    ) {
    }
}
