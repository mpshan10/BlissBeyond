package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "venues")
public class Venue extends BaseEntity {
    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, length = 60)
    private String type;
    @Column(nullable = false, length = 120)
    private String location;
    @Column(length = 800)
    private String description;
    @Column
    private Integer capacity;
    @Column(precision = 12, scale = 2)
    private BigDecimal price;
    @Column(length = 255)
    private String image;
    @Column(name = "website_url", length = 500)
    private String websiteUrl;
    @Column(nullable = false)
    private boolean available = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
