package com.blissbeyond.dto.service;

import java.math.BigDecimal;
import java.util.Map;

public record ServiceCatalogOptionResponse(Long id, Long serviceId, String serviceName, String optionType,
                                           String optionKey, String name, String description, BigDecimal price,
                                           String billingType, boolean available, int displayOrder,
                                           Map<String, Object> metadata) {}
