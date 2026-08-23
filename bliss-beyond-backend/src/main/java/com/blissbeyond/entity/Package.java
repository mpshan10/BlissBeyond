package com.blissbeyond.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "packages", uniqueConstraints = @UniqueConstraint(name = "uk_package_slug", columnNames = "slug"))
public class Package extends BaseEntity {
    @Column(nullable = false, length = 140) private String slug;
    @Column(nullable = false, length = 180) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private PackageCategory category;
    @Column(nullable = false, length = 2000) private String description;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "venue_id", nullable = false) private Venue venue;
    @Column(name = "max_guests", nullable = false) private Integer maxGuests;
    @Column(name = "final_price", nullable = false, precision = 14, scale = 2) private BigDecimal finalPrice;
    @Column(length = 500) private String image;
    @Column(nullable = false) private boolean active = true;
    @OneToMany(mappedBy = "eventPackage", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("displayOrder ASC") private List<PackageServiceItem> serviceItems = new ArrayList<>();
    public String getSlug(){return slug;} public void setSlug(String v){slug=v;}
    public String getName(){return name;} public void setName(String v){name=v;}
    public PackageCategory getCategory(){return category;} public void setCategory(PackageCategory v){category=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public Venue getVenue(){return venue;} public void setVenue(Venue v){venue=v;}
    public Integer getMaxGuests(){return maxGuests;} public void setMaxGuests(Integer v){maxGuests=v;}
    public BigDecimal getFinalPrice(){return finalPrice;} public void setFinalPrice(BigDecimal v){finalPrice=v;}
    public String getImage(){return image;} public void setImage(String v){image=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public List<PackageServiceItem> getServiceItems(){return serviceItems;} public void setServiceItems(List<PackageServiceItem> v){serviceItems=v;}
}


