package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "foods")
public class Food extends BaseEntity {
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 800)
    private String description;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuisine_id")
    private Cuisine cuisine;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FoodCategory category;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerGuest;
    @Column(length = 255)
    private String image;
    @Column(nullable = false)
    private boolean vegetarian;
    @Column(nullable = false)
    private boolean vegan;
    @Column(nullable = false)
    private boolean halal;
    @Column(nullable = false)
    private boolean glutenFree;
    @Column(nullable = false)
    private boolean nutFree;
    @Column(nullable = false)
    private boolean available = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Cuisine getCuisine() { return cuisine; }
    public void setCuisine(Cuisine cuisine) { this.cuisine = cuisine; }
    public FoodCategory getCategory() { return category; }
    public void setCategory(FoodCategory category) { this.category = category; }
    public BigDecimal getPricePerGuest() { return pricePerGuest; }
    public void setPricePerGuest(BigDecimal pricePerGuest) { this.pricePerGuest = pricePerGuest; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public boolean isVegetarian() { return vegetarian; }
    public void setVegetarian(boolean vegetarian) { this.vegetarian = vegetarian; }
    public boolean isVegan() { return vegan; }
    public void setVegan(boolean vegan) { this.vegan = vegan; }
    public boolean isHalal() { return halal; }
    public void setHalal(boolean halal) { this.halal = halal; }
    public boolean isGlutenFree() { return glutenFree; }
    public void setGlutenFree(boolean glutenFree) { this.glutenFree = glutenFree; }
    public boolean isNutFree() { return nutFree; }
    public void setNutFree(boolean nutFree) { this.nutFree = nutFree; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
