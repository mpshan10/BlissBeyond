package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
public class Event extends BaseEntity {
    @Column(nullable = false, length = 60)
    private String eventType;
    @Column(nullable = false)
    private LocalDate eventDate;
    @Column(nullable = false)
    private Integer guestCount;
    @Column(precision = 12, scale = 2)
    private BigDecimal budget;
    @Column(length = 1000)
    private String specialRequirements;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventStatus status = EventStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    @JsonIgnore
    @OneToMany(mappedBy = "event", orphanRemoval = true)
    private List<EventService> services = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "event", orphanRemoval = true)
    private List<MenuSelection> menuSelections = new ArrayList<>();

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public String getSpecialRequirements() { return specialRequirements; }
    public void setSpecialRequirements(String specialRequirements) { this.specialRequirements = specialRequirements; }
    public EventStatus getStatus() { return status; }
    public void setStatus(EventStatus status) { this.status = status; }
    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }
    public Venue getVenue() { return venue; }
    public void setVenue(Venue venue) { this.venue = venue; }
    public List<EventService> getServices() { return services; }
    public void setServices(List<EventService> services) { this.services = services; }
    public List<MenuSelection> getMenuSelections() { return menuSelections; }
    public void setMenuSelections(List<MenuSelection> menuSelections) { this.menuSelections = menuSelections; }
}
