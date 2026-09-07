package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dining_style_menu_categories")
public class DiningStyleMenuCategory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dining_style_id", nullable = false)
    private DiningStyle diningStyle;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private boolean available = true;

    @OneToMany(mappedBy = "category")
    private List<DiningStyleMenuItem> items = new ArrayList<>();

    public DiningStyle getDiningStyle() { return diningStyle; }
    public void setDiningStyle(DiningStyle diningStyle) { this.diningStyle = diningStyle; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public List<DiningStyleMenuItem> getItems() { return items; }
    public void setItems(List<DiningStyleMenuItem> items) { this.items = items; }
}
