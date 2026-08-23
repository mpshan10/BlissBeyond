package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminCustomerDetailResponse;
import com.blissbeyond.dto.admin.AdminCustomerSummaryResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.PaymentRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.blissbeyond.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AdminCustomerService {
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final QuotationRepository quotationRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;

    public AdminCustomerService(
        UserRepository userRepository,
        BookingRepository bookingRepository,
        QuotationRepository quotationRepository,
        PaymentRepository paymentRepository,
        CurrentUserService currentUserService
    ) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.quotationRepository = quotationRepository;
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<AdminCustomerSummaryResponse> listCustomers() {
        return userRepository.findDistinctByRolesName(RoleName.ROLE_CUSTOMER).stream()
            .map(this::toSummary)
            .toList();
    }

    @Transactional(readOnly = true)
    public AdminCustomerDetailResponse getCustomer(Long id) {
        return toDetail(requireCustomer(id));
    }

    @Transactional
    public AdminCustomerDetailResponse disableCustomer(Long id) {
        User customer = requireCustomer(id);
        preventSelfAction(customer);
        customer.setEnabled(false);
        return toDetail(userRepository.save(customer));
    }

    @Transactional
    public AdminCustomerDetailResponse enableCustomer(Long id) {
        User customer = requireCustomer(id);
        preventSelfAction(customer);
        customer.setEnabled(true);
        return toDetail(userRepository.save(customer));
    }

    private AdminCustomerSummaryResponse toSummary(User customer) {
        return new AdminCustomerSummaryResponse(
            customer.getId(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getEmail(),
            customer.getPhone(),
            customer.getAddress(),
            customer.isEnabled(),
            bookingRepository.findByCustomerId(customer.getId()).size(),
            quotationRepository.findByEventCustomerId(customer.getId()).size(),
            paymentRepository.findByBookingCustomerId(customer.getId()).size()
        );
    }

    private AdminCustomerDetailResponse toDetail(User customer) {
        List<Booking> bookings = bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId());
        List<Payment> payments = paymentRepository.findByBookingCustomerId(customer.getId());
        BigDecimal paidAmount = payments.stream()
            .filter(payment -> payment.getPaymentStatus() == PaymentStatus.PAID)
            .map(Payment::getAmount)
            .filter(amount -> amount != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AdminCustomerDetailResponse(
            customer.getId(),
            customer.getFirstName(),
            customer.getLastName(),
            customer.getEmail(),
            customer.getPhone(),
            customer.getAddress(),
            customer.isEnabled(),
            bookings.size(),
            countBookings(bookings, BookingStatus.PENDING),
            countBookings(bookings, BookingStatus.AWAITING_DEPOSIT),
            countBookings(bookings, BookingStatus.CONFIRMED),
            countBookings(bookings, BookingStatus.CANCELLED),
            countBookings(bookings, BookingStatus.COMPLETED),
            quotationRepository.findByEventCustomerId(customer.getId()).size(),
            payments.size(),
            paidAmount,
            bookings.stream().limit(5).map(this::toRecentBooking).toList()
        );
    }

    private long countBookings(List<Booking> bookings, BookingStatus status) {
        return bookings.stream().filter(booking -> booking.getStatus() == status).count();
    }

    private AdminCustomerDetailResponse.RecentBooking toRecentBooking(Booking booking) {
        Event event = booking.getEvent();
        Venue venue = event != null ? event.getVenue() : null;
        return new AdminCustomerDetailResponse.RecentBooking(
            booking.getId(),
            booking.getId() != null ? String.format("BK-%04d", booking.getId()) : null,
            event != null ? event.getEventType() : null,
            venue != null ? venue.getName() : null,
            booking.getEventDate(),
            booking.getStatus() != null ? booking.getStatus().name() : null
        );
    }

    private User requireCustomer(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));
        boolean customerRole = user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ROLE_CUSTOMER);
        if (!customerRole) {
            throw new ResourceNotFoundException("Customer not found.");
        }
        return user;
    }

    private void preventSelfAction(User customer) {
        User current = currentUserService.requireCurrentUser();
        if (current.getId().equals(customer.getId())) {
            throw new ForbiddenActionException("Administrators cannot change their own account through customer management.");
        }
    }
}
