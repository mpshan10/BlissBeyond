package com.blissbeyond.controller;

import com.blissbeyond.dto.admin.AdminBookingSummaryResponse;
import com.blissbeyond.dto.admin.AdminPaymentConfirmationRequest;
import com.blissbeyond.dto.admin.AdminPaymentResponse;
import com.blissbeyond.dto.admin.AdminQuotationSummaryResponse;
import com.blissbeyond.dto.admin.AdminQuotationDetailResponse;
import com.blissbeyond.dto.admin.AdminQuotationUpdateRequest;
import com.blissbeyond.dto.admin.AdminCustomerDetailResponse;
import com.blissbeyond.dto.admin.AdminCustomerSummaryResponse;
import com.blissbeyond.dto.admin.AdminAddOnUpdateRequest;
import com.blissbeyond.dto.admin.AdminDiningStyleUpdateRequest;
import com.blissbeyond.dto.admin.AdminServiceUpdateRequest;
import com.blissbeyond.dto.admin.AdminVenueUpdateRequest;
import com.blissbeyond.dto.admin.AdminPackageUpdateRequest;
import com.blissbeyond.dto.admin.AdminPackageCreateRequest;
import com.blissbeyond.dto.admin.AdminReportSummaryResponse;
import com.blissbeyond.dto.admin.AdminBookingDetailResponse;
import com.blissbeyond.dto.addon.AddOnResponse;
import com.blissbeyond.dto.booking.BookingResponse;
import com.blissbeyond.dto.diningstyle.DiningStyleResponse;
import com.blissbeyond.dto.service.ServiceResponse;
import com.blissbeyond.dto.venue.VenueResponse;
import com.blissbeyond.entity.*;
import com.blissbeyond.repository.*;
import com.blissbeyond.service.BookingService;
import com.blissbeyond.service.PaymentService;
import com.blissbeyond.service.QuotationService;
import com.blissbeyond.service.AdminCustomerService;
import com.blissbeyond.service.AdminCatalogService;
import com.blissbeyond.service.AdminVenueService;
import com.blissbeyond.service.AdminPackageService;
import com.blissbeyond.service.AdminReportService;
import com.blissbeyond.service.AdminBookingDetailService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.List;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final FoodRepository foodRepository;
    private final EventRepository eventRepository;
    private final BookingService bookingService;
    private final QuotationService quotationService;
    private final PaymentService paymentService;
    private final AdminCustomerService adminCustomerService;
    private final AdminCatalogService adminCatalogService;
    private final AdminVenueService adminVenueService;
    private final AdminPackageService adminPackageService;
    private final AdminReportService adminReportService;
    private final AdminBookingDetailService adminBookingDetailService;

    public AdminController(FoodRepository foodRepository,
                           EventRepository eventRepository,
                           BookingService bookingService,
                           QuotationService quotationService,
                           PaymentService paymentService,
                           AdminCustomerService adminCustomerService,
                           AdminCatalogService adminCatalogService,
                           AdminVenueService adminVenueService,
                           AdminPackageService adminPackageService,
                           AdminReportService adminReportService,
                           AdminBookingDetailService adminBookingDetailService) {
        this.foodRepository = foodRepository;
        this.eventRepository = eventRepository;
        this.bookingService = bookingService;
        this.quotationService = quotationService;
        this.paymentService = paymentService;
        this.adminCustomerService = adminCustomerService;
        this.adminCatalogService = adminCatalogService;
        this.adminVenueService = adminVenueService;
        this.adminPackageService = adminPackageService;
        this.adminReportService = adminReportService;
        this.adminBookingDetailService = adminBookingDetailService;
    }

    @GetMapping("/customers")
    public List<AdminCustomerSummaryResponse> customers() {
        return adminCustomerService.listCustomers();
    }

    @GetMapping("/customers/{id}")
    public AdminCustomerDetailResponse customer(@PathVariable Long id) {
        return adminCustomerService.getCustomer(id);
    }

    @PatchMapping("/customers/{id}/disable")
    public AdminCustomerDetailResponse disableCustomer(@PathVariable Long id) {
        return adminCustomerService.disableCustomer(id);
    }

    @PatchMapping("/customers/{id}/enable")
    public AdminCustomerDetailResponse enableCustomer(@PathVariable Long id) {
        return adminCustomerService.enableCustomer(id);
    }

    @GetMapping("/venues")
    public List<VenueResponse> venues() {
        return adminVenueService.listVenues();
    }

    @GetMapping("/venues/{id}")
    public VenueResponse venue(@PathVariable Long id) {
        return adminVenueService.getVenue(id);
    }

    @PostMapping("/venues")
    @ResponseStatus(HttpStatus.CREATED)
    public VenueResponse createVenue(@Valid @RequestBody AdminVenueUpdateRequest request) {
        return adminVenueService.createVenue(request);
    }

    @PutMapping("/venues/{id}")
    public VenueResponse updateVenue(
        @PathVariable Long id,
        @Valid @RequestBody AdminVenueUpdateRequest request
    ) {
        return adminVenueService.updateVenue(id, request);
    }

    @GetMapping("/food")
    public List<Food> food() {
        return foodRepository.findAll();
    }

    @GetMapping("/packages")
    public List<com.blissbeyond.dto.eventpackage.PackageResponse> packages() {
        return adminPackageService.listPackages();
    }

    @PostMapping("/packages")
    @ResponseStatus(HttpStatus.CREATED)
    public com.blissbeyond.dto.eventpackage.PackageResponse createPackage(
        @Valid @RequestBody AdminPackageCreateRequest request
    ) {
        return adminPackageService.createPackage(request);
    }

    @GetMapping("/packages/{id}")
    public com.blissbeyond.dto.eventpackage.PackageResponse packageById(@PathVariable Long id) {
        return adminPackageService.getPackage(id);
    }

    @PutMapping("/packages/{id}")
    public com.blissbeyond.dto.eventpackage.PackageResponse updatePackage(
        @PathVariable Long id,
        @Valid @RequestBody AdminPackageUpdateRequest request
    ) {
        return adminPackageService.updatePackage(id, request);
    }

    @GetMapping("/services")
    public List<ServiceResponse> services() {
        return adminCatalogService.listServices();
    }

    @GetMapping("/services/{id}")
    public ServiceResponse service(@PathVariable Long id) {
        return adminCatalogService.getService(id);
    }

    @PutMapping("/services/{id}")
    public ServiceResponse updateService(
        @PathVariable Long id,
        @Valid @RequestBody AdminServiceUpdateRequest request
    ) {
        return adminCatalogService.updateService(id, request);
    }

    @GetMapping("/dining-styles")
    public List<DiningStyleResponse> diningStyles() {
        return adminCatalogService.listDiningStyles();
    }

    @PutMapping("/dining-styles/{id}")
    public DiningStyleResponse updateDiningStyle(
        @PathVariable Long id,
        @Valid @RequestBody AdminDiningStyleUpdateRequest request
    ) {
        return adminCatalogService.updateDiningStyle(id, request);
    }

    @GetMapping("/addons")
    public List<AddOnResponse> addOns() {
        return adminCatalogService.listAddOns();
    }

    @PutMapping("/addons/{id}")
    public AddOnResponse updateAddOn(
        @PathVariable Long id,
        @Valid @RequestBody AdminAddOnUpdateRequest request
    ) {
        return adminCatalogService.updateAddOn(id, request);
    }

    @GetMapping("/events")
    public List<Event> events() {
        return eventRepository.findAll();
    }

    @GetMapping("/bookings")
    public List<AdminBookingSummaryResponse> bookings() {
        return bookingService.listAdminSummaries();
    }

    @GetMapping("/bookings/{id}")
    public AdminBookingDetailResponse booking(@PathVariable Long id) {
        return adminBookingDetailService.get(id);
    }

    @GetMapping("/quotations")
    public List<AdminQuotationSummaryResponse> quotations() {
        return quotationService.listAdminSummaries();
    }

    @GetMapping("/quotations/{id}")
    public AdminQuotationDetailResponse quotation(@PathVariable Long id) {
        return quotationService.getAdminDetail(id);
    }

    @PutMapping("/quotations/{id}")
    public AdminQuotationDetailResponse updateQuotation(
        @PathVariable Long id,
        @Valid @RequestBody AdminQuotationUpdateRequest request
    ) {
        return quotationService.updateAdminDraft(id, request);
    }

    @PatchMapping("/quotations/{id}/send")
    public AdminQuotationDetailResponse sendQuotation(@PathVariable Long id) {
        return quotationService.sendAdminQuotation(id);
    }

    @GetMapping("/payments")
    public List<AdminPaymentResponse> payments() {
        return paymentService.listAdminPayments();
    }

    @GetMapping("/reports/summary")
    public AdminReportSummaryResponse reportSummary(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("The report start date must be on or before the end date.");
        }
        return adminReportService.summary(from, to);
    }

    @PatchMapping("/payments/{id}/confirm")
    public AdminPaymentResponse confirmPayment(
        @PathVariable Long id,
        @Valid @RequestBody(required = false) AdminPaymentConfirmationRequest request
    ) {
        return paymentService.confirmPayment(id, request);
    }

    @PatchMapping("/bookings/{id}/confirm")
    public ResponseEntity<BookingResponse> confirmBooking(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(map(bookingService.approveBooking(id)));
    }

    @PatchMapping("/bookings/{id}/approve")
    public ResponseEntity<BookingResponse> approveBooking(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(map(bookingService.approveBooking(id)));
    }

    @PatchMapping("/bookings/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(map(bookingService.cancelBooking(id)));
    }

    @PatchMapping("/bookings/{id}/complete")
    public ResponseEntity<BookingResponse> completeBooking(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(map(bookingService.completeBooking(id)));
    }

    private BookingResponse map(Booking booking) {
        return new BookingResponse(
            booking.getId(),
            booking.getCustomer() != null ? booking.getCustomer().getId() : null,
            booking.getEvent() != null ? booking.getEvent().getId() : null,
            booking.getQuotation() != null ? booking.getQuotation().getId() : null,
            booking.getVenueId(),
            booking.getEventDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            booking.getStatus() != null ? booking.getStatus().name() : null,
            booking.getCreatedAt(),
            booking.getConfirmedAt()
        );
    }
}
