package com.blissbeyond.dto.food;

import java.math.BigDecimal;

public record FoodResponse(
    Long id,
    String name,
    String description,
    String cuisine,
    String category,
    BigDecimal pricePerGuest,
    String image,
    boolean vegetarian,
    boolean vegan,
    boolean halal,
    boolean glutenFree,
    boolean nutFree,
    boolean available
) {
}
