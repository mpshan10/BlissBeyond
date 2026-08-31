package com.blissbeyond.controller;

import com.blissbeyond.dto.contact.ContactEnquiryRequest;
import com.blissbeyond.dto.contact.ContactEnquiryResponse;
import com.blissbeyond.service.ContactEnquiryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/contact-enquiries")
@PreAuthorize("hasRole('CUSTOMER')")
public class ContactEnquiryController {
    private final ContactEnquiryService service;
    public ContactEnquiryController(ContactEnquiryService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<ContactEnquiryResponse> create(@Valid @RequestBody ContactEnquiryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }
}
