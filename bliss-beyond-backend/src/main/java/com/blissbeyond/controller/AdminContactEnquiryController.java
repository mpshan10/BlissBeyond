package com.blissbeyond.controller;

import com.blissbeyond.dto.contact.ContactEnquiryResponse;
import com.blissbeyond.dto.contact.ContactEnquiryStatusRequest;
import com.blissbeyond.service.ContactEnquiryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/contact-enquiries")
public class AdminContactEnquiryController {
    private final ContactEnquiryService service;
    public AdminContactEnquiryController(ContactEnquiryService service) { this.service = service; }

    @GetMapping
    public List<ContactEnquiryResponse> list() { return service.list(); }

    @GetMapping("/{id}")
    public ContactEnquiryResponse get(@PathVariable Long id) { return service.get(id); }

    @PatchMapping("/{id}/status")
    public ContactEnquiryResponse updateStatus(@PathVariable Long id, @Valid @RequestBody ContactEnquiryStatusRequest request) {
        return service.updateStatus(id, request.status());
    }
}
