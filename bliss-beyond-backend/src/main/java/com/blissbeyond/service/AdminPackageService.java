package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminPackageUpdateRequest;
import com.blissbeyond.dto.admin.AdminPackageCreateRequest;
import com.blissbeyond.dto.eventpackage.PackageResponse;
import com.blissbeyond.dto.eventpackage.PackageServiceItemResponse;
import com.blissbeyond.dto.eventpackage.PackageVenueResponse;
import com.blissbeyond.entity.Package;
import com.blissbeyond.entity.PackageServiceItem;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.PackageRepository;
import com.blissbeyond.repository.VenueRepository;
import com.blissbeyond.repository.ServiceRepository;
import com.blissbeyond.entity.ServiceEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.ArrayList;
import java.text.Normalizer;
import java.util.Objects;

@Service
public class AdminPackageService {
    private final PackageRepository packageRepository;
    private final ObjectMapper objectMapper;
    private final VenueRepository venueRepository;
    private final ServiceRepository serviceRepository;

    public AdminPackageService(PackageRepository packageRepository, ObjectMapper objectMapper,
                               VenueRepository venueRepository, ServiceRepository serviceRepository) {
        this.packageRepository = packageRepository;
        this.objectMapper = objectMapper;
        this.venueRepository = venueRepository;
        this.serviceRepository = serviceRepository;
    }

    @Transactional(readOnly = true)
    public List<PackageResponse> listPackages() {
        return packageRepository.findAll().stream()
            .sorted(Comparator.comparing(Package::getId))
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public PackageResponse getPackage(Long id) {
        return toResponse(requirePackage(id));
    }

    @Transactional
    public PackageResponse createPackage(AdminPackageCreateRequest request) {
        String slug = slugify(request.name());
        if (packageRepository.findBySlug(slug).isPresent()) {
            throw new com.blissbeyond.exception.DuplicateResourceException("A package with this name already exists.");
        }

        var venue = findVenue(request.venueName());
        venue.setLocation(request.venueLocation().trim());
        venue.setWebsiteUrl(normalizeWebsiteUrl(request.websiteUrl()));

        Package eventPackage = new Package();
        eventPackage.setSlug(slug);
        eventPackage.setName(request.name().trim());
        eventPackage.setCategory(request.category());
        eventPackage.setVenue(venue);
        eventPackage.setDescription(request.description().trim());
        eventPackage.setMaxGuests(request.maxGuests());
        eventPackage.setFinalPrice(request.finalPrice());
        eventPackage.setImage(blankToNull(request.image()));
        eventPackage.setActive(request.active());

        addServiceItems(eventPackage, request.serviceInclusions());
        return toResponse(packageRepository.save(eventPackage));
    }

    @Transactional
    public PackageResponse updatePackage(Long id, AdminPackageUpdateRequest request) {
        Package eventPackage = requirePackage(id);
        eventPackage.setName(request.name().trim());
        eventPackage.setCategory(request.category());
        var venue = findVenue(request.venueName());
        venue.setLocation(request.venueLocation().trim());
        eventPackage.setVenue(venue);
        eventPackage.setDescription(request.description().trim());
        eventPackage.setMaxGuests(request.maxGuests());
        eventPackage.setFinalPrice(request.finalPrice());
        eventPackage.setImage(blankToNull(request.image()));
        eventPackage.setActive(request.active());
        venue.setWebsiteUrl(normalizeWebsiteUrl(request.websiteUrl()));
        updateServiceInclusions(eventPackage, request.serviceInclusions());
        return toResponse(packageRepository.save(eventPackage));
    }

    private void updateServiceInclusions(Package eventPackage, Map<String, List<String>> requestedInclusions) {
        if (requestedInclusions == null) {
            return;
        }

        Map<String, List<String>> normalizedByService = new LinkedHashMap<>();
        requestedInclusions.forEach((serviceName, inclusions) ->
            normalizedByService.put(normalizeServiceName(serviceName), normalizeInclusions(inclusions))
        );

        eventPackage.getServiceItems().forEach(item -> {
            String serviceKey = normalizeServiceName(item.getService().getName());
            List<String> inclusions = normalizedByService.get(serviceKey);
            if (inclusions != null) {
                try {
                    item.setInclusionJson(objectMapper.writeValueAsString(inclusions));
                } catch (Exception exception) {
                    throw new IllegalStateException("Unable to save package service inclusions", exception);
                }
            }
        });
    }

    private void addServiceItems(Package eventPackage, Map<String, List<String>> requestedInclusions) {
        Map<String, List<String>> byService = new LinkedHashMap<>();
        requestedInclusions.forEach((name, inclusions) -> {
            String key = normalizeServiceName(name);
            if (key.isBlank() || byService.put(key, normalizeInclusions(inclusions)) != null) {
                throw new IllegalArgumentException("Each service category may be provided only once.");
            }
        });

        List<ServiceEntity> services = serviceRepository.findAll().stream()
            .sorted(Comparator.comparing(ServiceEntity::getId))
            .toList();
        if (services.isEmpty()) {
            throw new IllegalArgumentException("No service catalog is available.");
        }

        int displayOrder = 1;
        for (ServiceEntity service : services) {
            List<String> inclusions = byService.remove(normalizeServiceName(service.getName()));
            if (inclusions == null) {
                throw new IllegalArgumentException("Missing service inclusions for " + service.getName() + ".");
            }
            PackageServiceItem item = new PackageServiceItem();
            item.setEventPackage(eventPackage);
            item.setService(service);
            item.setDisplayOrder(displayOrder++);
            try {
                item.setInclusionJson(objectMapper.writeValueAsString(inclusions));
            } catch (Exception exception) {
                throw new IllegalStateException("Unable to save package service inclusions", exception);
            }
            eventPackage.getServiceItems().add(item);
        }
        if (!byService.isEmpty()) {
            throw new ResourceNotFoundException("One or more service categories do not exist.");
        }
    }

    private List<String> normalizeInclusions(List<String> inclusions) {
        if (inclusions == null) {
            return List.of();
        }

        Map<String, String> unique = new LinkedHashMap<>();
        inclusions.forEach(value -> {
            if (value == null) {
                return;
            }
            String cleaned = value.trim();
            if (!cleaned.isEmpty()) {
                unique.putIfAbsent(cleaned.toLowerCase(Locale.ROOT), cleaned);
            }
        });
        return List.copyOf(unique.values());
    }

    private String normalizeServiceName(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value.trim(), Normalizer.Form.NFKD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("Package name must produce a valid slug.");
        }
        return normalized;
    }

    private Package requirePackage(Long id) {
        return packageRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Package not found."));
    }

    private com.blissbeyond.entity.Venue findVenue(String name) {
        String normalizedRequested = normalizeVenueName(name);
        List<com.blissbeyond.entity.Venue> matches = venueRepository.findAll().stream()
            .filter(venue -> Objects.equals(normalizeVenueName(venue.getName()), normalizedRequested))
            .toList();
        if (matches.isEmpty()) {
            throw new IllegalArgumentException("Venue not found. Please add the venue in Admin > Venues first.");
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("Multiple venues match that name. Please provide a more specific name.");
        }
        return matches.get(0);
    }

    private String normalizeVenueName(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFKC)
            .toLowerCase(Locale.ROOT)
            .replaceAll("[\\p{Pd}]", " ")
            .replaceAll("[^\\p{L}\\p{N}]+", "");
    }

    private String normalizeWebsiteUrl(String value) {
        String trimmed = blankToNull(value);
        if (trimmed == null) return null;
        if (!trimmed.matches("(?i)^https?://.+")) {
            throw new IllegalArgumentException("websiteUrl must begin with http:// or https://.");
        }
        return trimmed;
    }

    private PackageResponse toResponse(Package eventPackage) {
        List<PackageServiceItemResponse> services = eventPackage.getServiceItems().stream()
            .sorted(Comparator.comparing(PackageServiceItem::getDisplayOrder))
            .map(item -> new PackageServiceItemResponse(
                item.getService().getId(), item.getService().getName(), item.getDisplayOrder(),
                parseInclusions(item.getInclusionJson())
            ))
            .toList();
        var venue = eventPackage.getVenue();
        return new PackageResponse(
            eventPackage.getId(), eventPackage.getSlug(), eventPackage.getName(), eventPackage.getCategory(),
            eventPackage.getDescription(), eventPackage.getMaxGuests(), eventPackage.getFinalPrice(),
            eventPackage.getImage(), eventPackage.isActive(),
            new PackageVenueResponse(venue.getId(), venue.getName(), venue.getLocation(), venue.getCapacity(), venue.getWebsiteUrl()),
            services
        );
    }

    private List<String> parseInclusions(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() { });
        } catch (Exception exception) {
            throw new IllegalStateException("Invalid package inclusion data", exception);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
