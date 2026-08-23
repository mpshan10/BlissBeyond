package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "services")
public class ServiceEntity extends BaseEntity {
    @Column(nullable = false, unique = true, length = 120)
    private String name;
    @Column(length = 800)
    private String description;
    @Column(precision = 12, scale = 2)
    private BigDecimal basePrice;
    @Column(nullable = false)
    private boolean customizable = true;
    @Column(nullable = false)
    private boolean available = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public boolean isCustomizable() { return customizable; }
    public void setCustomizable(boolean customizable) { this.customizable = customizable; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
