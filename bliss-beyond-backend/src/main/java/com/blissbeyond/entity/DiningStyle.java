package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "dining_styles")
public class DiningStyle extends BaseEntity {
    @Column(name = "style_key", nullable = false, unique = true, length = 60)
    private String key;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 800)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerGuest;

    @Column(nullable = false)
    private boolean available = true;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPricePerGuest() { return pricePerGuest; }
    public void setPricePerGuest(BigDecimal pricePerGuest) { this.pricePerGuest = pricePerGuest; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
