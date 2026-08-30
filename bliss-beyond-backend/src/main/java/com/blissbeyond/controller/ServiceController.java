package com.blissbeyond.controller;

import com.blissbeyond.dto.service.ServiceResponse;
import com.blissbeyond.service.ServiceCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/services")
public class ServiceController {
    private final ServiceCatalogService serviceCatalogService;
    private final com.blissbeyond.service.ServiceCatalogOptionService optionService;

    public ServiceController(ServiceCatalogService serviceCatalogService, com.blissbeyond.service.ServiceCatalogOptionService optionService) {
        this.serviceCatalogService = serviceCatalogService; this.optionService = optionService;
    }

    @GetMapping
    public List<ServiceResponse> list() {
        return serviceCatalogService.list();
    }

    @GetMapping("/{id}")
    public ServiceResponse get(@PathVariable Long id) {
        return serviceCatalogService.get(id);
    }

    @GetMapping("/key/{key}")
    public ServiceResponse getByKey(@PathVariable String key) {
        return serviceCatalogService.getByKey(key);
    }

    @GetMapping("/key/{key}/options")
    public List<com.blissbeyond.dto.service.ServiceCatalogOptionResponse> options(
        @PathVariable String key, @RequestParam(required = false) String type
    ) { return optionService.customer(key, type); }
}
