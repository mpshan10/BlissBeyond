package com.blissbeyond.controller;

import com.blissbeyond.dto.service.ServiceResponse;
import com.blissbeyond.service.ServiceCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/services")
public class ServiceController {
    private final ServiceCatalogService serviceCatalogService;

    public ServiceController(ServiceCatalogService serviceCatalogService) {
        this.serviceCatalogService = serviceCatalogService;
    }

    @GetMapping
    public List<ServiceResponse> list() {
        return serviceCatalogService.list();
    }

    @GetMapping("/{id}")
    public ServiceResponse get(@PathVariable Long id) {
        return serviceCatalogService.get(id);
    }
}
