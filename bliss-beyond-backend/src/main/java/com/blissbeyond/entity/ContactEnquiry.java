package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contact_enquiries")
public class ContactEnquiry extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, length = 160)
    private String email;
    @Column(length = 40)
    private String phone;
    @Column(name = "event_type", length = 80)
    private String eventType;
    @Column(name = "preferred_date")
    private LocalDate preferredDate;
    @Column(name = "guest_count")
    private Integer guestCount;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContactEnquiryStatus status = ContactEnquiryStatus.NEW;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void initializeCreatedAt() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getEmail() { return email; }
    public void setEmail(String value) { email = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = value; }
    public String getEventType() { return eventType; }
    public void setEventType(String value) { eventType = value; }
    public LocalDate getPreferredDate() { return preferredDate; }
    public void setPreferredDate(LocalDate value) { preferredDate = value; }
    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer value) { guestCount = value; }
    public String getMessage() { return message; }
    public void setMessage(String value) { message = value; }
    public ContactEnquiryStatus getStatus() { return status; }
    public void setStatus(ContactEnquiryStatus value) { status = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public User getUser() { return user; }
    public void setUser(User value) { user = value; }
}
