package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_account_id")
    private PaymentAccount paymentAccount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentType paymentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(length = 50)
    private String paymentMethod;

    @Column(length = 120)
    private String transactionReference;

    @Column
    private LocalDateTime paidAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "destination_provider_snapshot", length = 100)
    private String destinationProviderSnapshot;

    @Column(name = "destination_account_name_snapshot", length = 160)
    private String destinationAccountNameSnapshot;

    @Column(name = "destination_account_number_snapshot", length = 120)
    private String destinationAccountNumberSnapshot;

    @Column(name = "destination_instructions_snapshot", length = 1000)
    private String destinationInstructionsSnapshot;

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public PaymentAccount getPaymentAccount() { return paymentAccount; }
    public void setPaymentAccount(PaymentAccount paymentAccount) { this.paymentAccount = paymentAccount; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public PaymentType getPaymentType() { return paymentType; }
    public void setPaymentType(PaymentType paymentType) { this.paymentType = paymentType; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getTransactionReference() { return transactionReference; }
    public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public LocalDateTime getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(LocalDateTime rejectedAt) { this.rejectedAt = rejectedAt; }
    public String getAdminNote() { return adminNote; }
    public void setAdminNote(String adminNote) { this.adminNote = adminNote; }
    public String getDestinationProviderSnapshot() { return destinationProviderSnapshot; }
    public void setDestinationProviderSnapshot(String value) { destinationProviderSnapshot = value; }
    public String getDestinationAccountNameSnapshot() { return destinationAccountNameSnapshot; }
    public void setDestinationAccountNameSnapshot(String value) { destinationAccountNameSnapshot = value; }
    public String getDestinationAccountNumberSnapshot() { return destinationAccountNumberSnapshot; }
    public void setDestinationAccountNumberSnapshot(String value) { destinationAccountNumberSnapshot = value; }
    public String getDestinationInstructionsSnapshot() { return destinationInstructionsSnapshot; }
    public void setDestinationInstructionsSnapshot(String value) { destinationInstructionsSnapshot = value; }
}
