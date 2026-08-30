package com.blissbeyond.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_catalog_options", uniqueConstraints = @UniqueConstraint(name = "uq_service_catalog_option_key", columnNames = {"service_id", "option_key"}))
public class ServiceCatalogOption extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceEntity service;
    @Column(name = "option_type", nullable = false, length = 40)
    private String optionType;
    @Column(name = "option_key", nullable = false, length = 120)
    private String optionKey;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 1000)
    private String description;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;
    @Column(name = "billing_type", nullable = false, length = 30)
    private String billingType = "FLAT";
    @Column(nullable = false)
    private boolean available = true;
    @Column(name = "display_order", nullable = false)
    private int displayOrder;
    @Column(name = "metadata_json", columnDefinition = "json")
    private String metadataJson;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist void beforeInsert() { LocalDateTime now = LocalDateTime.now(); createdAt = now; updatedAt = now; }
    @PreUpdate void beforeUpdate() { updatedAt = LocalDateTime.now(); }
    public ServiceEntity getService() { return service; }
    public void setService(ServiceEntity service) { this.service = service; }
    public String getOptionType() { return optionType; }
    public void setOptionType(String optionType) { this.optionType = optionType; }
    public String getOptionKey() { return optionKey; }
    public void setOptionKey(String optionKey) { this.optionKey = optionKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getBillingType() { return billingType; }
    public void setBillingType(String billingType) { this.billingType = billingType; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
