package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminPaymentConfirmationRequest;
import com.blissbeyond.dto.admin.AdminPaymentRejectionRequest;
import com.blissbeyond.dto.admin.AdminPaymentResponse;
import com.blissbeyond.dto.payment.CustomerPaymentSubmissionRequest;
import com.blissbeyond.dto.payment.PaymentResponse;
import com.blissbeyond.dto.payment.PaymentSummaryResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.PackageBookingSnapshot;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.PaymentType;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.QuotationStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class PaymentService {
    private static final BigDecimal DEPOSIT_PERCENTAGE = new BigDecimal("0.30");
    private static final BigDecimal DEPOSIT_PERCENTAGE_DISPLAY = new BigDecimal("30");
    private static final Set<String> METHODS = Set.of(
        "BANK_TRANSFER", "KBZ_BANK", "AYA_BANK", "CB_BANK", "KBZPAY", "WAVEPAY", "CASH"
    );
    private static final Set<PaymentStatus> REFERENCE_BLOCKING_STATUSES = Set.of(PaymentStatus.PENDING, PaymentStatus.PAID);

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final BookingService bookingService;
    private final NotificationService notificationService;
    private final PackageBookingSnapshotRepository snapshotRepository;

    public PaymentService(BookingRepository bookingRepository, PaymentRepository paymentRepository,
                          CurrentUserService currentUserService, BookingService bookingService,
                          NotificationService notificationService, PackageBookingSnapshotRepository snapshotRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
        this.bookingService = bookingService;
        this.notificationService = notificationService;
        this.snapshotRepository = snapshotRepository;
    }

    @Transactional
    public Payment createNextPayment(Long bookingId, CustomerPaymentSubmissionRequest request) {
        Booking booking = requireOwnedBookingForUpdate(bookingId);
        String method = normalizeOptional(request == null ? null : request.paymentMethod());
        String reference = normalizeOptional(request == null ? null : request.transactionReference());
        validatePaymentDetails(method, reference);
        PaymentCalculation calculation = calculate(booking);
        PaymentType type = calculation.nextPaymentType();
        enforceCustomerWindow(booking, calculation, type);
        if (type == null || calculation.nextPaymentAmount().signum() <= 0) {
            throw new IllegalArgumentException("This booking is fully paid.");
        }
        if (paymentRepository.findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(bookingId, type, PaymentStatus.PENDING).isPresent()) {
            return paymentRepository.findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(bookingId, type, PaymentStatus.PENDING).orElseThrow();
        }
        rejectDuplicateReference(reference, null);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentType(type);
        payment.setAmount(calculation.nextPaymentAmount());
        payment.setPaymentStatus(PaymentStatus.PENDING);
        payment.setPaymentMethod(method);
        payment.setTransactionReference(reference);
        payment.setSubmittedAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);
        String customerName = booking.getCustomer() == null ? "A customer" :
            (booking.getCustomer().getFirstName() + " " + booking.getCustomer().getLastName()).trim();
        notificationService.notifyAdmins(booking.getCustomer(), "PAYMENT_SUBMITTED", "Payment Submitted",
            customerName + " submitted a " + type.name().toLowerCase() + " payment for Booking BK-" + String.format("%04d", bookingId) + ".",
            "PAYMENT", saved.getId(), "/prototype/admin/payments.html?paymentId=" + saved.getId(),
            "PAYMENT_SUBMITTED:" + saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary(Long bookingId) {
        Booking booking = requireOwnedBooking(bookingId);
        PaymentCalculation calculation = calculate(booking);
        List<PaymentResponse> payments = paymentRepository.findByBookingIdOrderByIdAsc(bookingId).stream().map(this::toResponse).toList();
        return new PaymentSummaryResponse(bookingId, booking.getQuotation() == null ? null : booking.getQuotation().getId(),
            calculation.total(), DEPOSIT_PERCENTAGE_DISPLAY, calculation.depositRequired(), calculation.amountPaid(),
            calculation.remainingBalance(), calculation.nextPaymentType() == null ? null : calculation.nextPaymentType().name(),
            calculation.nextPaymentAmount(), payments, calculation.depositDueDate(), calculation.balanceDueDate(), calculation.paymentState());
    }

    public PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getBooking() == null ? null : payment.getBooking().getId(),
            payment.getPaymentType() == null ? null : payment.getPaymentType().name(), payment.getAmount(),
            payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().name(), payment.getPaymentMethod(),
            payment.getTransactionReference(), payment.getPaidAt(), payment.getSubmittedAt(), payment.getRejectedAt(), payment.getAdminNote());
    }

    @Transactional(readOnly = true)
    public List<AdminPaymentResponse> listAdminPayments() {
        return paymentRepository.findAllByOrderByIdDesc().stream().map(this::toAdminResponse).toList();
    }

    @Transactional
    public AdminPaymentResponse confirmPayment(Long paymentId, AdminPaymentConfirmationRequest request) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found."));
        Booking booking = lockedBooking(payment);
        if (payment.getPaymentStatus() != PaymentStatus.PENDING) throw new IllegalArgumentException("Only pending payments can be confirmed.");
        PaymentCalculation calculation = calculate(booking);
        BigDecimal expected = payment.getPaymentType() == PaymentType.DEPOSIT ? calculation.depositRequired() : calculation.remainingBalance();
        if (payment.getAmount() == null || payment.getAmount().compareTo(expected) != 0) throw new IllegalArgumentException("Payment amount does not match the authoritative amount.");
        if (payment.getPaymentType() == PaymentType.DEPOSIT) {
            if (booking.getStatus() != BookingStatus.AWAITING_DEPOSIT) throw new IllegalArgumentException("Deposit confirmation is not available for this booking state.");
            bookingService.confirmAfterDeposit(booking.getId());
        } else if (booking.getStatus() != BookingStatus.CONFIRMED || !hasPaidDeposit(booking.getId())) {
            throw new IllegalArgumentException("Balance confirmation requires a confirmed booking with a paid deposit.");
        }
        String method = normalizeOptional(request == null ? null : request.paymentMethod());
        String reference = normalizeOptional(request == null ? null : request.transactionReference());
        if (method == null) method = payment.getPaymentMethod();
        if (reference == null) reference = payment.getTransactionReference();
        validatePaymentDetails(method, reference);
        rejectDuplicateReference(reference, payment.getId());
        payment.setPaymentMethod(method);
        payment.setTransactionReference(reference);
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);
        String message = payment.getPaymentType() == PaymentType.DEPOSIT
            ? "Your deposit has been confirmed. Remaining balance: " + calculation.remainingBalance().subtract(payment.getAmount()).max(BigDecimal.ZERO) + ". Due by " + calculation.balanceDueDate() + "."
            : "Your balance payment has been confirmed. Your booking is fully paid.";
        notificationService.notifyOnce(booking.getCustomer(), currentUserService.requireCurrentUser(), "PAYMENT_CONFIRMED",
            "Payment Confirmed", message, "PAYMENT", saved.getId(), "/prototype/customer/payment.html?bookingId=" + booking.getId(),
            "PAYMENT_CONFIRMED:" + saved.getId() + ":PAID");
        return toAdminResponse(saved);
    }

    @Transactional
    public AdminPaymentResponse rejectPayment(Long paymentId, AdminPaymentRejectionRequest request) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found."));
        Booking booking = lockedBooking(payment);
        if (payment.getPaymentStatus() != PaymentStatus.PENDING) throw new IllegalArgumentException("Only pending payments can be rejected.");
        if (payment.getPaymentType() == PaymentType.DEPOSIT && booking.getStatus() != BookingStatus.AWAITING_DEPOSIT) throw new IllegalArgumentException("Deposit rejection is not available for this booking state.");
        if (payment.getPaymentType() == PaymentType.BALANCE && booking.getStatus() != BookingStatus.CONFIRMED) throw new IllegalArgumentException("Balance rejection is not available for this booking state.");
        String reason = request == null ? null : normalizeOptional(request.reason());
        if (reason == null) throw new IllegalArgumentException("A rejection reason is required.");
        payment.setPaymentStatus(PaymentStatus.FAILED);
        payment.setRejectedAt(LocalDateTime.now());
        payment.setAdminNote(reason);
        Payment saved = paymentRepository.save(payment);
        notificationService.notifyOnce(booking.getCustomer(), currentUserService.requireCurrentUser(), "PAYMENT_REJECTED",
            "Payment Rejected", "Your " + payment.getPaymentType().name().toLowerCase() + " payment was rejected: " + reason,
            "PAYMENT", saved.getId(), "/prototype/customer/payment.html?bookingId=" + booking.getId(), "PAYMENT_REJECTED:" + saved.getId());
        return toAdminResponse(saved);
    }

    private AdminPaymentResponse toAdminResponse(Payment payment) {
        Booking booking = payment.getBooking();
        User customer = booking == null ? null : booking.getCustomer();
        Event event = booking == null ? null : booking.getEvent();
        Venue venue = event == null ? null : event.getVenue();
        Quotation quotation = booking == null ? null : booking.getQuotation();
        String customerName = customer == null ? null : (customer.getFirstName() + " " + customer.getLastName()).trim();
        return new AdminPaymentResponse(payment.getId(), booking == null ? null : booking.getId(), booking == null ? null : String.format("BK-%04d", booking.getId()),
            customer == null ? null : customer.getId(), customerName, customer == null ? null : customer.getEmail(), event == null ? null : event.getId(),
            event == null ? null : event.getEventType(), venue == null ? null : venue.getName(), payment.getPaymentType() == null ? null : payment.getPaymentType().name(),
            payment.getAmount(), payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().name(), payment.getPaymentMethod(), payment.getTransactionReference(),
            payment.getPaidAt(), payment.getSubmittedAt(), payment.getRejectedAt(), payment.getAdminNote(), quotation == null ? null : quotation.getId(),
            quotation == null ? null : quotation.getTotal(), booking == null || booking.getBookingType() == null ? null : booking.getBookingType().name(),
            booking == null || booking.getStatus() == null ? null : booking.getStatus().name(), payment.getSubmittedAt());
    }

    private void validatePaymentDetails(String method, String reference) {
        if (method == null || !METHODS.contains(method)) throw new IllegalArgumentException("Choose a valid payment method.");
        if (!"CASH".equals(method) && (reference == null || reference.isBlank())) throw new IllegalArgumentException("Transaction reference is required for electronic payments.");
    }

    private void rejectDuplicateReference(String reference, Long currentPaymentId) {
        if (reference == null) return;
        boolean duplicate = paymentRepository.findAllByOrderByIdDesc().stream().anyMatch(payment ->
            !payment.getId().equals(currentPaymentId) && payment.getTransactionReference() != null
                && payment.getTransactionReference().equalsIgnoreCase(reference) && REFERENCE_BLOCKING_STATUSES.contains(payment.getPaymentStatus()));
        if (duplicate) throw new DuplicateResourceException("This transaction reference is already in use.");
    }

    private void enforceCustomerWindow(Booking booking, PaymentCalculation calculation, PaymentType type) {
        LocalDateTime now = LocalDateTime.now();
        if (type == PaymentType.DEPOSIT) {
            if (booking.getStatus() != BookingStatus.AWAITING_DEPOSIT) throw new IllegalArgumentException("Deposit payment is not available for this booking.");
            if (calculation.depositDueDate() == null || now.isAfter(calculation.depositDueDate())) throw new IllegalArgumentException("The deposit payment deadline has passed.");
        } else if (type == PaymentType.BALANCE) {
            if (booking.getStatus() != BookingStatus.CONFIRMED) throw new IllegalArgumentException("Balance payment is available only for confirmed bookings.");
            if (calculation.balanceDueDate() != null && LocalDate.now().isAfter(calculation.balanceDueDate())) throw new IllegalArgumentException("The balance payment deadline has passed.");
        }
    }

    private PaymentCalculation calculate(Booking booking) {
        BigDecimal total = booking.getBookingType() == com.blissbeyond.entity.BookingType.PACKAGE
            ? snapshotRepository.findByBookingId(booking.getId()).map(PackageBookingSnapshot::getFinalPrice).orElseThrow(() -> new IllegalArgumentException("Historical package price is unavailable."))
            : acceptedQuotationTotal(booking);
        total = total.setScale(2, RoundingMode.HALF_UP);
        BigDecimal deposit = total.multiply(DEPOSIT_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal paid = paymentRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream().filter(p -> p.getPaymentStatus() == PaymentStatus.PAID).map(Payment::getAmount).filter(a -> a != null).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal remaining = total.subtract(paid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        boolean depositPaid = hasPaidDeposit(booking.getId());
        PaymentType next = depositPaid ? (remaining.signum() > 0 ? PaymentType.BALANCE : null) : PaymentType.DEPOSIT;
        BigDecimal nextAmount = next == PaymentType.DEPOSIT ? deposit : next == PaymentType.BALANCE ? remaining : BigDecimal.ZERO;
        LocalDateTime depositDue = booking.getDepositRequestedAt() == null ? null : booking.getDepositRequestedAt().plusDays(5);
        LocalDate balanceDue = booking.getEventDate() == null ? null : booking.getEventDate().minusDays(7);
        String state = remaining.signum() == 0 ? "FULLY_PAID" : !depositPaid ? (hasPending(booking.getId(), PaymentType.DEPOSIT) ? "DEPOSIT_PENDING" : depositDue != null && LocalDateTime.now().isAfter(depositDue) ? "DEPOSIT_OVERDUE" : "DEPOSIT_DUE") : hasPending(booking.getId(), PaymentType.BALANCE) ? "BALANCE_PENDING" : balanceDue != null && LocalDate.now().isAfter(balanceDue) ? "BALANCE_OVERDUE" : "BALANCE_DUE";
        return new PaymentCalculation(total, deposit, paid, remaining, next, nextAmount, depositDue, balanceDue, state);
    }

    private boolean hasPending(Long bookingId, PaymentType type) { return paymentRepository.findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(bookingId, type, PaymentStatus.PENDING).isPresent(); }
    private boolean hasPaidDeposit(Long bookingId) { return paymentRepository.findFirstByBookingIdAndPaymentTypeAndPaymentStatusOrderByIdDesc(bookingId, PaymentType.DEPOSIT, PaymentStatus.PAID).isPresent(); }
    private BigDecimal acceptedQuotationTotal(Booking booking) {
        Quotation q = booking.getQuotation();
        if (q == null || q.getStatus() != QuotationStatus.ACCEPTED || q.getTotal() == null || q.getTotal().signum() <= 0) throw new IllegalArgumentException("Payment is available only for an accepted quotation.");
        return q.getTotal();
    }
    private Booking lockedBooking(Payment payment) { return bookingRepository.findByIdForUpdate(payment.getBooking().getId()).orElseThrow(() -> new ResourceNotFoundException("Booking not found.")); }
    private Booking requireOwnedBooking(Long id) { return requireOwned(bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found."))); }
    private Booking requireOwnedBookingForUpdate(Long id) { return requireOwned(bookingRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found."))); }
    private Booking requireOwned(Booking booking) {
        Long current = currentUserService.requireCurrentUser().getId();
        if (booking.getCustomer() == null || !current.equals(booking.getCustomer().getId())) throw new ForbiddenActionException("You cannot access payments for this booking.");
        return booking;
    }
    private String normalizeOptional(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record PaymentCalculation(BigDecimal total, BigDecimal depositRequired, BigDecimal amountPaid, BigDecimal remainingBalance,
        PaymentType nextPaymentType, BigDecimal nextPaymentAmount, LocalDateTime depositDueDate, LocalDate balanceDueDate, String paymentState) { }
}
