package com.blissbeyond.dto.eventpackage;
import java.util.List;
public record PackageServiceItemResponse(Long serviceId, String serviceName, Integer displayOrder, List<String> inclusions) {}


