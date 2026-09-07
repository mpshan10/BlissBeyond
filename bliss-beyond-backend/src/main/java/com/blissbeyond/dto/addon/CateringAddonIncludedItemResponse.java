package com.blissbeyond.dto.addon;

public record CateringAddonIncludedItemResponse(
    Long id,
    String name,
    Integer displayOrder,
    boolean available
) {}
