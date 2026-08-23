package com.blissbeyond.controller;

import com.blissbeyond.dto.booking.PackageBookingRequest;
import com.blissbeyond.dto.booking.PackageBookingResponse;
import com.blissbeyond.service.PackageBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/customer/package-bookings")
public class PackageBookingController {
    private final PackageBookingService packageBookingService;

    public PackageBookingController(PackageBookingService packageBookingService) {
        this.packageBookingService = packageBookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<PackageBookingResponse> create(@Valid @RequestBody PackageBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(packageBookingService.create(request));
    }
}
