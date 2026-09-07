package com.blissbeyond.dto.diningstyle;

import java.util.List;

public record DiningStyleMenuResponse(
    Long diningStyleId,
    List<DiningStyleMenuCategoryResponse> categories
) {}
