package com.blissbeyond.service;

import com.blissbeyond.dto.service.ServiceResponse;
import com.blissbeyond.entity.ServiceEntity;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.ServiceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceCatalogService {
    private final ServiceRepository serviceRepository;

    public ServiceCatalogService(ServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    public List<ServiceResponse> list() {
        return serviceRepository.findAll().stream().map(this::map).toList();
    }

    public ServiceResponse get(Long id) {
        return map(serviceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Service not found")));
    }

    public ServiceEntity findEntity(Long id) {
        return serviceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Service not found"));
    }

    public ServiceResponse map(ServiceEntity service) {
        return new ServiceResponse(
            service.getId(),
            service.getName(),
            service.getDescription(),
            service.getBasePrice(),
            service.isCustomizable(),
            service.isAvailable()
        );
    }
}
