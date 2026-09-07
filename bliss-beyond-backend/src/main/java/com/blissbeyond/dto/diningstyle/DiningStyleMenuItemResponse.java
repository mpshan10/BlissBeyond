package com.blissbeyond.dto.diningstyle;

public record DiningStyleMenuItemResponse(
    Long id,
    String name,
    Integer displayOrder,
    boolean available
) {}
