package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public record AdminReportSummaryResponse(
    BookingCounts bookings,
    ResourceCounts resources,
    ConsultationCounts consultations,
    QuotationCounts quotations,
    PaymentCounts payments,
    List<MonthlyBookingCount> bookingTrend,
    List<NamedCount> bookingTypes,
    List<NamedCount> eventCategories,
    List<NamedCount> topVenues,
    List<NamedCount> topPackages,
    FinancialSummary financial,
    BigDecimal totalPaidRevenue,
    String revenueNote,
    String from,
    String to
) {
    public record BookingCounts(
        long total,
        long pending,
        long awaitingDeposit,
        long confirmed,
        long completed,
        long cancelled,
        long custom,
        long packageBookings
    ) {}

    public record ResourceCounts(
        long customers,
        long packages,
        long activePackages,
        long inactivePackages,
        long venues
    ) {}

    public record ConsultationCounts(
        long total,
        long requested,
        long scheduled,
        long completed,
        long cancelled
    ) {}

    public record QuotationCounts(
        long total,
        long draft,
        long sent,
        long accepted,
        long rejected,
        long expired
    ) {}

    public record PaymentCounts(
        long total,
        long pending,
        long paid,
        long failed,
        long refunded
    ) {}

    public record FinancialSummary(
        BigDecimal paidRevenue,
        BigDecimal depositPaid,
        BigDecimal balancePaid,
        BigDecimal outstandingAmount,
        BigDecimal refundedAmount,
        BigDecimal packagePaid,
        BigDecimal customizePaid
    ) {}

    public record MonthlyBookingCount(String month, long bookings) {}

    public record NamedCount(String name, long bookingCount) {}
}
