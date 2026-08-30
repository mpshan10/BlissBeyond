package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminServiceCatalogOptionRequest;
import com.blissbeyond.dto.service.ServiceCatalogOptionResponse;
import com.blissbeyond.entity.ServiceCatalogOption;
import com.blissbeyond.entity.ServiceEntity;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.ServiceCatalogOptionRepository;
import com.blissbeyond.repository.ServiceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ServiceCatalogOptionService {
    private final ServiceCatalogOptionRepository optionRepository;
    private final ServiceRepository serviceRepository;
    private final ObjectMapper objectMapper;
    public ServiceCatalogOptionService(ServiceCatalogOptionRepository optionRepository, ServiceRepository serviceRepository, ObjectMapper objectMapper) {
        this.optionRepository = optionRepository; this.serviceRepository = serviceRepository; this.objectMapper = objectMapper;
    }
    @Transactional(readOnly = true)
    public List<ServiceCatalogOptionResponse> customer(String key, String type) {
        ServiceEntity service = resolve(key);
        return optionRepository.findByServiceAndAvailableTrue(service, Sort.by("displayOrder", "id")).stream()
            .filter(o -> type == null || type.isBlank() || o.getOptionType().equalsIgnoreCase(type))
            .map(this::map).toList();
    }
    @Transactional(readOnly = true)
    public List<ServiceCatalogOptionResponse> admin(Long serviceId) { return optionRepository.findByService(requireService(serviceId), Sort.by("displayOrder", "id")).stream().map(this::map).toList(); }
    @Transactional
    public ServiceCatalogOptionResponse create(Long serviceId, AdminServiceCatalogOptionRequest request) {
        ServiceEntity service = requireService(serviceId); String key = request.optionKey().trim();
        if (optionRepository.existsByServiceAndOptionKey(service, key)) throw new DuplicateResourceException("An option with this key already exists.");
        return map(optionRepository.save(apply(new ServiceCatalogOption(), service, request, key)));
    }
    @Transactional
    public ServiceCatalogOptionResponse update(Long id, AdminServiceCatalogOptionRequest request) {
        ServiceCatalogOption option = optionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Catalog option not found."));
        String key = request.optionKey().trim();
        optionRepository.findByServiceAndOptionKey(option.getService(), key).filter(other -> !other.getId().equals(id)).ifPresent(other -> { throw new DuplicateResourceException("An option with this key already exists."); });
        return map(optionRepository.save(apply(option, option.getService(), request, key)));
    }
    private ServiceCatalogOption apply(ServiceCatalogOption option, ServiceEntity service, AdminServiceCatalogOptionRequest r, String key) {
        String billingType = r.billingType().trim().toUpperCase();
        if (!Set.of("FLAT", "PER_GUEST", "PER_UNIT").contains(billingType)) {
            throw new IllegalArgumentException("billingType must be FLAT, PER_GUEST, or PER_UNIT.");
        }
        option.setService(service); option.setOptionType(r.optionType().trim()); option.setOptionKey(key); option.setName(r.name().trim());
        option.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().trim()); option.setPrice(r.price());
        option.setBillingType(billingType); option.setAvailable(r.available()); option.setDisplayOrder(r.displayOrder()); validateMetadata(r.metadataJson()); option.setMetadataJson(r.metadataJson()); return option;
    }
    private ServiceEntity resolve(String key) { String normalized = key == null ? "" : key.trim().toLowerCase(); String name = switch (normalized) { case "decoration" -> "Decoration & Styling"; case "photography" -> "Photography & Videography"; case "entertainment" -> "Entertainment"; case "lighting-av", "lighting" -> "Lighting & AV"; case "cake" -> "Cake & Desserts"; case "florals", "floral" -> "Floral Design"; default -> throw new ResourceNotFoundException("Service not found."); }; return serviceRepository.findByNameIgnoreCase(name).orElseThrow(() -> new ResourceNotFoundException("Service not found.")); }
    private ServiceEntity requireService(Long id) { return serviceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Service not found.")); }
    private void validateMetadata(String json) { if (json == null || json.isBlank()) return; try { objectMapper.readTree(json); } catch (Exception e) { throw new IllegalArgumentException("metadataJson must be valid JSON."); } }
    private ServiceCatalogOptionResponse map(ServiceCatalogOption o) { Map<String,Object> metadata = Map.of(); if (o.getMetadataJson() != null && !o.getMetadataJson().isBlank()) try { metadata = objectMapper.readValue(o.getMetadataJson(), new TypeReference<>() {}); } catch (Exception ignored) {} return new ServiceCatalogOptionResponse(o.getId(), o.getService().getId(), o.getService().getName(), o.getOptionType(), o.getOptionKey(), o.getName(), o.getDescription(), o.getPrice(), o.getBillingType(), o.isAvailable(), o.getDisplayOrder(), metadata); }
}
