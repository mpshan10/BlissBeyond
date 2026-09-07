package com.blissbeyond.dto.diningstyle;

import java.util.List;

public record DiningStyleMenuCategoryResponse(
    Long id,
    String name,
    Integer displayOrder,
    boolean available,
    List<DiningStyleMenuItemResponse> items
) {}
