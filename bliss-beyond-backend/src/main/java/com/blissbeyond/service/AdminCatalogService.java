package com.blissbeyond.service;

import com.blissbeyond.dto.addon.AddOnResponse;
import com.blissbeyond.dto.admin.AdminAddOnUpdateRequest;
import com.blissbeyond.dto.admin.AdminDiningStyleUpdateRequest;
import com.blissbeyond.dto.admin.AdminServiceUpdateRequest;
import com.blissbeyond.dto.diningstyle.DiningStyleResponse;
import com.blissbeyond.dto.service.ServiceResponse;
import com.blissbeyond.entity.AddOn;
import com.blissbeyond.entity.DiningStyle;
import com.blissbeyond.entity.ServiceEntity;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.AddOnRepository;
import com.blissbeyond.repository.DiningStyleRepository;
import com.blissbeyond.repository.ServiceRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminCatalogService {
    private final ServiceRepository serviceRepository;
    private final DiningStyleRepository diningStyleRepository;
    private final AddOnRepository addOnRepository;

    public AdminCatalogService(
        ServiceRepository serviceRepository,
        DiningStyleRepository diningStyleRepository,
        AddOnRepository addOnRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.diningStyleRepository = diningStyleRepository;
        this.addOnRepository = addOnRepository;
    }

    @Transactional(readOnly = true)
    public List<ServiceResponse> listServices() {
        return serviceRepository.findAll(Sort.by("id")).stream().map(this::toServiceResponse).toList();
    }

    @Transactional(readOnly = true)
    public ServiceResponse getService(Long id) {
        return toServiceResponse(requireService(id));
    }

    @Transactional
    public ServiceResponse updateService(Long id, AdminServiceUpdateRequest request) {
        ServiceEntity service = requireService(id);
        rejectDuplicateServiceName(id, request.name());
        service.setName(request.name().trim());
        service.setDescription(trimToNull(request.description()));
        service.setBasePrice(request.basePrice());
        service.setAvailable(request.available());
        return toServiceResponse(serviceRepository.save(service));
    }

    @Transactional(readOnly = true)
    public List<DiningStyleResponse> listDiningStyles() {
        return diningStyleRepository.findAll(Sort.by("id")).stream().map(this::toDiningStyleResponse).toList();
    }

    @Transactional
    public DiningStyleResponse updateDiningStyle(Long id, AdminDiningStyleUpdateRequest request) {
        DiningStyle style = requireDiningStyle(id);
        rejectDuplicateDiningStyleName(id, request.name());
        style.setName(request.name().trim());
        style.setDescription(trimToNull(request.description()));
        style.setPricePerGuest(request.pricePerGuest());
        style.setAvailable(request.available());
        return toDiningStyleResponse(diningStyleRepository.save(style));
    }

    @Transactional(readOnly = true)
    public List<AddOnResponse> listAddOns() {
        return addOnRepository.findAll(Sort.by("id")).stream().map(this::toAddOnResponse).toList();
    }

    @Transactional
    public AddOnResponse updateAddOn(Long id, AdminAddOnUpdateRequest request) {
        AddOn addOn = requireAddOn(id);
        rejectDuplicateAddOnName(id, request.name());
        addOn.setName(request.name().trim());
        addOn.setDescription(trimToNull(request.description()));
        addOn.setBillingType(request.billingType());
        addOn.setPrice(request.price());
        addOn.setAvailable(request.available());
        return toAddOnResponse(addOnRepository.save(addOn));
    }

    private ServiceEntity requireService(Long id) {
        return serviceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Service not found."));
    }

    private DiningStyle requireDiningStyle(Long id) {
        return diningStyleRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dining style not found."));
    }

    private AddOn requireAddOn(Long id) {
        return addOnRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Add-on not found."));
    }

    private void rejectDuplicateServiceName(Long id, String name) {
        boolean duplicate = serviceRepository.findAll().stream()
            .anyMatch(service -> !service.getId().equals(id) && service.getName().equalsIgnoreCase(name.trim()));
        if (duplicate) throw new DuplicateResourceException("A service with this name already exists.");
    }

    private void rejectDuplicateDiningStyleName(Long id, String name) {
        boolean duplicate = diningStyleRepository.findAll().stream()
            .anyMatch(style -> !style.getId().equals(id) && style.getName().equalsIgnoreCase(name.trim()));
        if (duplicate) throw new DuplicateResourceException("A dining style with this name already exists.");
    }

    private void rejectDuplicateAddOnName(Long id, String name) {
        boolean duplicate = addOnRepository.findAll().stream()
            .anyMatch(addOn -> !addOn.getId().equals(id) && addOn.getName().equalsIgnoreCase(name.trim()));
        if (duplicate) throw new DuplicateResourceException("An add-on with this name already exists.");
    }

    private ServiceResponse toServiceResponse(ServiceEntity service) {
        return new ServiceResponse(
            service.getId(), service.getName(), service.getDescription(), service.getBasePrice(),
            service.isCustomizable(), service.isAvailable()
        );
    }

    private DiningStyleResponse toDiningStyleResponse(DiningStyle style) {
        return new DiningStyleResponse(
            style.getId(), style.getKey(), style.getName(), style.getDescription(),
            style.getPricePerGuest(), style.isAvailable()
        );
    }

    private AddOnResponse toAddOnResponse(AddOn addOn) {
        return new AddOnResponse(
            addOn.getId(), addOn.getName(), addOn.getDescription(), addOn.getBillingType(),
            addOn.getPrice(), addOn.isAvailable()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
