package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminPaymentConfirmationRequest;
import com.blissbeyond.dto.admin.AdminPaymentResponse;
import com.blissbeyond.dto.payment.PaymentResponse;
import com.blissbeyond.dto.payment.PaymentSummaryResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.PaymentType;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.QuotationStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentService {
    private static final BigDecimal DEPOSIT_PERCENTAGE = new BigDecimal("0.30");
    private static final BigDecimal DEPOSIT_PERCENTAGE_DISPLAY = new BigDecimal("30");

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final BookingService bookingService;

    public PaymentService(BookingRepository bookingRepository,
                          PaymentRepository paymentRepository,
                          CurrentUserService currentUserService,
                          BookingService bookingService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
    }

    @Transactional
    public Payment createNextPayment(Long bookingId) {
        Booking booking = requireOwnedBooking(bookingId);
        PaymentCalculation calculation = calculate(booking);
        PaymentType nextType = calculation.nextPaymentType();

        if (nextType == null || calculation.nextPaymentAmount().signum() <= 0) {
            throw new IllegalArgumentException("This booking is fully paid.");
        }

        return paymentRepository
            .findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(
                bookingId, nextType, PaymentStatus.PENDING
            )
            .orElseGet(() -> {
                Payment payment = new Payment();
                payment.setBooking(booking);
                payment.setPaymentType(nextType);
                payment.setAmount(calculation.nextPaymentAmount());
                payment.setPaymentStatus(PaymentStatus.PENDING);
                return paymentRepository.save(payment);
            });
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary(Long bookingId) {
        Booking booking = requireOwnedBooking(bookingId);
        PaymentCalculation calculation = calculate(booking);
        List<PaymentResponse> payments = paymentRepository.findByBookingIdOrderByIdAsc(bookingId)
            .stream()
            .map(this::toResponse)
            .toList();

        return new PaymentSummaryResponse(
            bookingId,
            booking.getQuotation().getId(),
            calculation.quotationTotal(),
            DEPOSIT_PERCENTAGE_DISPLAY,
            calculation.depositRequired(),
            calculation.amountPaid(),
            calculation.remainingBalance(),
            calculation.nextPaymentType() == null ? null : calculation.nextPaymentType().name(),
            calculation.nextPaymentAmount(),
            payments
        );
    }

    public PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getBooking() != null ? payment.getBooking().getId() : null,
            payment.getPaymentType() != null ? payment.getPaymentType().name() : null,
            payment.getAmount(),
            payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : null,
            payment.getPaymentMethod(),
            payment.getTransactionReference(),
            payment.getPaidAt()
        );
    }

    @Transactional(readOnly = true)
    public List<AdminPaymentResponse> listAdminPayments() {
        return paymentRepository.findAllByOrderByIdDesc().stream()
            .map(this::toAdminResponse)
            .toList();
    }

    @Transactional
    public AdminPaymentResponse confirmPayment(Long paymentId, AdminPaymentConfirmationRequest request) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found."));

        if (payment.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Only pending payments can be confirmed.");
        }

        Booking booking = payment.getBooking();
        if (booking == null) {
            throw new IllegalArgumentException("Payment is not associated with a booking.");
        }

        if (payment.getPaymentType() == PaymentType.DEPOSIT) {
            bookingService.confirmAfterDeposit(booking.getId());
        }

        payment.setPaymentMethod(normalizeOptional(request == null ? null : request.paymentMethod()));
        payment.setTransactionReference(normalizeOptional(request == null ? null : request.transactionReference()));
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        return toAdminResponse(paymentRepository.save(payment));
    }

    private AdminPaymentResponse toAdminResponse(Payment payment) {
        Booking booking = payment.getBooking();
        User customer = booking != null ? booking.getCustomer() : null;
        Event event = booking != null ? booking.getEvent() : null;
        Venue venue = event != null ? event.getVenue() : null;
        Quotation quotation = booking != null ? booking.getQuotation() : null;
        String customerName = customer == null
            ? null
            : (customer.getFirstName() + " " + customer.getLastName()).trim();

        return new AdminPaymentResponse(
            payment.getId(),
            booking != null ? booking.getId() : null,
            booking != null && booking.getId() != null ? String.format("BK-%04d", booking.getId()) : null,
            customer != null ? customer.getId() : null,
            customerName,
            customer != null ? customer.getEmail() : null,
            event != null ? event.getId() : null,
            event != null ? event.getEventType() : null,
            venue != null ? venue.getName() : null,
            payment.getPaymentType() != null ? payment.getPaymentType().name() : null,
            payment.getAmount(),
            payment.getPaymentStatus() != null ? payment.getPaymentStatus().name() : null,
            payment.getPaymentMethod(),
            payment.getTransactionReference(),
            payment.getPaidAt(),
            quotation != null ? quotation.getId() : null,
            quotation != null ? quotation.getTotal() : null
        );
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Booking requireOwnedBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found."));
        Long currentUserId = currentUserService.requireCurrentUser().getId();
        if (booking.getCustomer() == null || !currentUserId.equals(booking.getCustomer().getId())) {
            throw new ForbiddenActionException("You cannot access payments for this booking.");
        }
        return booking;
    }

    private PaymentCalculation calculate(Booking booking) {
        if (booking.getQuotation() == null
            || booking.getQuotation().getStatus() == null
            || booking.getQuotation().getStatus() != QuotationStatus.ACCEPTED
            || booking.getQuotation().getTotal() == null
            || booking.getQuotation().getTotal().signum() <= 0) {
            throw new IllegalArgumentException("Payment is available only for an accepted quotation.");
        }

        BigDecimal quotationTotal = booking.getQuotation().getTotal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositRequired = quotationTotal.multiply(DEPOSIT_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal amountPaid = paymentRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream()
            .filter(payment -> payment.getPaymentStatus() == PaymentStatus.PAID)
            .map(Payment::getAmount)
            .filter(amount -> amount != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal remainingBalance = quotationTotal.subtract(amountPaid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        boolean depositPaid = paymentRepository
            .findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(booking.getId(), PaymentType.DEPOSIT, PaymentStatus.PAID)
            .isPresent();
        PaymentType nextType = depositPaid ? (remainingBalance.signum() > 0 ? PaymentType.BALANCE : null) : PaymentType.DEPOSIT;
        BigDecimal nextAmount = nextType == PaymentType.DEPOSIT ? depositRequired : nextType == PaymentType.BALANCE ? remainingBalance : BigDecimal.ZERO;

        return new PaymentCalculation(quotationTotal, depositRequired, amountPaid, remainingBalance, nextType, nextAmount);
    }

    private record PaymentCalculation(
        BigDecimal quotationTotal,
        BigDecimal depositRequired,
        BigDecimal amountPaid,
        BigDecimal remainingBalance,
        PaymentType nextPaymentType,
        BigDecimal nextPaymentAmount
    ) { }
}
