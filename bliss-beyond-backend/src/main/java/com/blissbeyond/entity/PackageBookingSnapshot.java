package com.blissbeyond.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "package_booking_snapshots", uniqueConstraints = @UniqueConstraint(
    name = "uk_package_booking_snapshot_booking", columnNames = "booking_id"))
public class PackageBookingSnapshot extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "package_id", nullable = false)
    private Package eventPackage;

    @Column(name = "package_slug", nullable = false, length = 180)
    private String packageSlug;
    @Column(name = "package_name", nullable = false, length = 180)
    private String packageName;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PackageCategory category;
    @Column(name = "venue_id", nullable = false)
    private Long venueId;
    @Column(name = "venue_name", nullable = false, length = 120)
    private String venueName;
    @Column(name = "max_guests", nullable = false)
    private Integer maxGuests;
    @Column(name = "final_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal finalPrice;
    @Lob
    @Column(name = "inclusions_json", nullable = false, columnDefinition = "LONGTEXT")
    private String inclusionsJson;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public Package getEventPackage() { return eventPackage; }
    public void setEventPackage(Package eventPackage) { this.eventPackage = eventPackage; }
    public String getPackageSlug() { return packageSlug; }
    public void setPackageSlug(String value) { packageSlug = value; }
    public String getPackageName() { return packageName; }
    public void setPackageName(String value) { packageName = value; }
    public PackageCategory getCategory() { return category; }
    public void setCategory(PackageCategory value) { category = value; }
    public Long getVenueId() { return venueId; }
    public void setVenueId(Long value) { venueId = value; }
    public String getVenueName() { return venueName; }
    public void setVenueName(String value) { venueName = value; }
    public Integer getMaxGuests() { return maxGuests; }
    public void setMaxGuests(Integer value) { maxGuests = value; }
    public BigDecimal getFinalPrice() { return finalPrice; }
    public void setFinalPrice(BigDecimal value) { finalPrice = value; }
    public String getInclusionsJson() { return inclusionsJson; }
    public void setInclusionsJson(String value) { inclusionsJson = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
}
