package com.blissbeyond.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "food_categories")
public class FoodCategory extends BaseEntity {
    @Column(nullable = false, unique = true, length = 80)
    private String name;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
