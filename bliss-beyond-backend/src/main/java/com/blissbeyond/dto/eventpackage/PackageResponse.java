package com.blissbeyond.dto.eventpackage;
import com.blissbeyond.entity.PackageCategory;
import java.math.BigDecimal;
import java.util.List;
public record PackageResponse(Long id, String slug, String name, PackageCategory category, String description, Integer maxGuests, BigDecimal finalPrice, String image, boolean active, PackageVenueResponse venue, List<PackageServiceItemResponse> services) {}


