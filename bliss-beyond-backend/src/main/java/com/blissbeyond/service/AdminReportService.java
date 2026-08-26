package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminReportSummaryResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.ConsultationStatus;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.QuotationStatus;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.ConsultationRepository;
import com.blissbeyond.repository.PackageRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.PaymentRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.blissbeyond.repository.UserRepository;
import com.blissbeyond.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminReportService {
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final BookingRepository bookingRepository;
    private final ConsultationRepository consultationRepository;
    private final PackageRepository packageRepository;
    private final PackageBookingSnapshotRepository snapshotRepository;
    private final PaymentRepository paymentRepository;
    private final QuotationRepository quotationRepository;
    private final UserRepository userRepository;
    private final VenueRepository venueRepository;

    public AdminReportService(BookingRepository bookingRepository,
                              ConsultationRepository consultationRepository,
                              PackageRepository packageRepository,
                              PackageBookingSnapshotRepository snapshotRepository,
                              PaymentRepository paymentRepository,
                              QuotationRepository quotationRepository,
                              UserRepository userRepository,
                              VenueRepository venueRepository) {
        this.bookingRepository = bookingRepository;
        this.consultationRepository = consultationRepository;
        this.packageRepository = packageRepository;
        this.snapshotRepository = snapshotRepository;
        this.paymentRepository = paymentRepository;
        this.quotationRepository = quotationRepository;
        this.userRepository = userRepository;
        this.venueRepository = venueRepository;
    }

    @Transactional(readOnly = true)
    public AdminReportSummaryResponse summary(LocalDate from, LocalDate to) {
        List<Booking> bookings = bookingRepository.findAll().stream()
            .filter(booking -> inRange(booking.getEventDate(), from, to))
            .toList();
        List<Consultation> consultations = consultationRepository.findAll().stream()
            .filter(item -> inRange(item.getConsultationDate(), from, to))
            .toList();
        List<Quotation> quotations = quotationRepository.findAll().stream()
            .filter(item -> inRange(item.getCreatedAt() == null ? null : item.getCreatedAt().toLocalDate(), from, to))
            .toList();
        List<Payment> payments = paymentRepository.findAll().stream()
            .filter(item -> paymentDate(item) == null || inRange(paymentDate(item), from, to))
            .toList();

        return new AdminReportSummaryResponse(
            bookingCounts(bookings),
            new AdminReportSummaryResponse.ResourceCounts(
                userRepository.findDistinctByRolesName(RoleName.ROLE_CUSTOMER).size(),
                packageRepository.count(),
                packageRepository.findAllByActiveTrueOrderByIdAsc().size(),
                packageRepository.findAll().stream().filter(item -> !item.isActive()).count(),
                venueRepository.count()
            ),
            consultationCounts(consultations),
            quotationCounts(quotations),
            paymentCounts(payments),
            bookingTrend(bookings),
            namedCounts(bookings, booking -> booking.getBookingType().name()),
            namedCounts(bookings, booking -> booking.getEvent() == null ? null : booking.getEvent().getEventType()),
            namedCounts(bookings, booking -> booking.getEvent() != null && booking.getEvent().getVenue() != null
                ? booking.getEvent().getVenue().getName() : null),
            topPackages(bookings),
            payments.stream()
                .filter(item -> item.getPaymentStatus() == PaymentStatus.PAID)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add),
            "Paid payment amounts only; pending, failed, and refunded payments are excluded.",
            from == null ? null : from.toString(),
            to == null ? null : to.toString()
        );
    }

    private AdminReportSummaryResponse.BookingCounts bookingCounts(List<Booking> bookings) {
        return new AdminReportSummaryResponse.BookingCounts(
            bookings.size(), count(bookings, item -> item.getStatus() == BookingStatus.PENDING),
            count(bookings, item -> item.getStatus() == BookingStatus.AWAITING_DEPOSIT),
            count(bookings, item -> item.getStatus() == BookingStatus.CONFIRMED),
            count(bookings, item -> item.getStatus() == BookingStatus.COMPLETED),
            count(bookings, item -> item.getStatus() == BookingStatus.CANCELLED),
            count(bookings, item -> item.getBookingType() == BookingType.CUSTOM),
            count(bookings, item -> item.getBookingType() == BookingType.PACKAGE)
        );
    }

    private AdminReportSummaryResponse.ConsultationCounts consultationCounts(List<Consultation> items) {
        return new AdminReportSummaryResponse.ConsultationCounts(
            items.size(), count(items, item -> item.getStatus() == ConsultationStatus.REQUESTED),
            count(items, item -> item.getStatus() == ConsultationStatus.SCHEDULED),
            count(items, item -> item.getStatus() == ConsultationStatus.COMPLETED),
            count(items, item -> item.getStatus() == ConsultationStatus.CANCELLED)
        );
    }

    private AdminReportSummaryResponse.QuotationCounts quotationCounts(List<Quotation> items) {
        return new AdminReportSummaryResponse.QuotationCounts(
            items.size(), count(items, item -> item.getStatus() == QuotationStatus.DRAFT),
            count(items, item -> item.getStatus() == QuotationStatus.SENT),
            count(items, item -> item.getStatus() == QuotationStatus.ACCEPTED),
            count(items, item -> item.getStatus() == QuotationStatus.REJECTED),
            count(items, item -> item.getStatus() == QuotationStatus.EXPIRED)
        );
    }

    private AdminReportSummaryResponse.PaymentCounts paymentCounts(List<Payment> items) {
        return new AdminReportSummaryResponse.PaymentCounts(
            items.size(), count(items, item -> item.getPaymentStatus() == PaymentStatus.PENDING),
            count(items, item -> item.getPaymentStatus() == PaymentStatus.PAID),
            count(items, item -> item.getPaymentStatus() == PaymentStatus.FAILED),
            count(items, item -> item.getPaymentStatus() == PaymentStatus.REFUNDED)
        );
    }

    private List<AdminReportSummaryResponse.MonthlyBookingCount> bookingTrend(List<Booking> bookings) {
        YearMonth current = YearMonth.now();
        Map<YearMonth, Long> counts = bookings.stream()
            .filter(item -> item.getCreatedAt() != null)
            .map(item -> YearMonth.from(item.getCreatedAt()))
            .filter(month -> !month.isBefore(current.minusMonths(5)) && !month.isAfter(current))
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        List<AdminReportSummaryResponse.MonthlyBookingCount> result = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = current.minusMonths(i);
            result.add(new AdminReportSummaryResponse.MonthlyBookingCount(
                month.format(MONTH_FORMAT), counts.getOrDefault(month, 0L)));
        }
        return result;
    }

    private List<AdminReportSummaryResponse.NamedCount> namedCounts(List<Booking> bookings,
                                                                      Function<Booking, String> nameMapper) {
        return bookings.stream()
            .map(nameMapper)
            .filter(name -> name != null && !name.isBlank())
            .collect(Collectors.groupingBy(String::toUpperCase, Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .map(item -> new AdminReportSummaryResponse.NamedCount(item.getKey(), item.getValue()))
            .toList();
    }

    private List<AdminReportSummaryResponse.NamedCount> topPackages(List<Booking> bookings) {
        Map<String, Long> counts = bookings.stream()
            .filter(item -> item.getBookingType() == BookingType.PACKAGE)
            .map(item -> snapshotRepository.findByBookingId(item.getId()).map(snapshot -> snapshot.getPackageName())
                .orElse(item.getEventPackage() == null ? null : item.getEventPackage().getName()))
            .filter(name -> name != null && !name.isBlank())
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return counts.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
            .map(item -> new AdminReportSummaryResponse.NamedCount(item.getKey(), item.getValue()))
            .toList();
    }

    private LocalDate paymentDate(Payment payment) {
        if (payment.getPaidAt() != null) return payment.getPaidAt().toLocalDate();
        return payment.getBooking() == null ? null : payment.getBooking().getEventDate();
    }

    private boolean inRange(LocalDate value, LocalDate from, LocalDate to) {
        if (from == null && to == null) return true;
        return value != null && (from == null || !value.isBefore(from)) && (to == null || !value.isAfter(to));
    }

    private <T> long count(List<T> items, java.util.function.Predicate<T> predicate) {
        return items.stream().filter(predicate).count();
    }
}
