package com.blissbeyond.service;

import com.blissbeyond.dto.contact.ContactEnquiryRequest;
import com.blissbeyond.dto.contact.ContactEnquiryResponse;
import com.blissbeyond.entity.ContactEnquiry;
import com.blissbeyond.entity.ContactEnquiryStatus;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.ContactEnquiryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContactEnquiryService {
    private final ContactEnquiryRepository repository;
    private final CurrentUserService currentUserService;

    public ContactEnquiryService(ContactEnquiryRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public ContactEnquiryResponse create(ContactEnquiryRequest request) {
        var user = currentUserService.requireCurrentUser();
        ContactEnquiry enquiry = new ContactEnquiry();
        enquiry.setUser(user);
        enquiry.setName((user.getFirstName() + " " + user.getLastName()).trim());
        enquiry.setEmail(user.getEmail().trim().toLowerCase());
        enquiry.setPhone(normalize(request.phone()));
        enquiry.setEventType(normalize(request.eventType()));
        enquiry.setPreferredDate(request.preferredDate());
        enquiry.setGuestCount(request.guestCount());
        enquiry.setMessage(request.message().trim());
        enquiry.setStatus(ContactEnquiryStatus.NEW);
        return map(repository.save(enquiry));
    }

    @Transactional(readOnly = true)
    public List<ContactEnquiryResponse> list() { return repository.findAllByOrderByCreatedAtDesc().stream().map(this::map).toList(); }

    @Transactional(readOnly = true)
    public ContactEnquiryResponse get(Long id) { return map(require(id)); }

    @Transactional
    public ContactEnquiryResponse updateStatus(Long id, ContactEnquiryStatus status) {
        ContactEnquiry enquiry = require(id);
        enquiry.setStatus(status);
        return map(repository.save(enquiry));
    }

    private ContactEnquiry require(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contact enquiry not found."));
    }

    private ContactEnquiryResponse map(ContactEnquiry enquiry) {
        return new ContactEnquiryResponse(enquiry.getId(), enquiry.getName(), enquiry.getEmail(), enquiry.getPhone(),
            enquiry.getEventType(), enquiry.getPreferredDate(), enquiry.getGuestCount(), enquiry.getMessage(),
            enquiry.getStatus() == null ? null : enquiry.getStatus().name(), enquiry.getCreatedAt());
    }

    private String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
