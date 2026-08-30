package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminVenueUpdateRequest;
import com.blissbeyond.dto.venue.VenueResponse;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.VenueRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class AdminVenueService {
    private final VenueRepository venueRepository;
    private final VenueImageStorageService venueImageStorageService;

    public AdminVenueService(VenueRepository venueRepository, VenueImageStorageService venueImageStorageService) {
        this.venueRepository = venueRepository;
        this.venueImageStorageService = venueImageStorageService;
    }

    @Transactional(readOnly = true)
    public List<VenueResponse> listVenues() {
        return venueRepository.findAll(Sort.by("id")).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VenueResponse getVenue(Long id) {
        return toResponse(requireVenue(id));
    }

    @Transactional
    public VenueResponse updateVenuePhoto(Long id, MultipartFile photo) {
        Venue venue = requireVenue(id);
        String previousUrl = venue.getImage();
        VenueImageStorageService.StoredPhoto stored = venueImageStorageService.store(venue, photo);
        try {
            venue.setImage(stored.publicUrl());
            VenueResponse saved = toResponse(venueRepository.save(venue));
            venueImageStorageService.deleteManagedPhoto(previousUrl);
            return saved;
        } catch (RuntimeException ex) {
            venueImageStorageService.deleteManagedPhoto(stored.publicUrl());
            throw ex;
        }
    }

    @Transactional
    public VenueResponse updateVenue(Long id, AdminVenueUpdateRequest request) {
        Venue venue = requireVenue(id);
        rejectDuplicate(id, request.name(), request.location());
        venue.setName(request.name().trim());
        venue.setType(request.type().trim());
        venue.setLocation(request.location().trim());
        venue.setDescription(trimToNull(request.description()));
        venue.setCapacity(request.capacity());
        venue.setPrice(request.price());
        venue.setImage(trimToNull(request.image()));
        venue.setWebsiteUrl(normalizeWebsiteUrl(request.websiteUrl()));
        if (request.available() != null) {
            venue.setAvailable(request.available());
        }
        return toResponse(venueRepository.save(venue));
    }

    @Transactional
    public VenueResponse createVenue(AdminVenueUpdateRequest request) {
        rejectDuplicate(null, request.name(), request.location());
        Venue venue = new Venue();
        venue.setName(request.name().trim());
        venue.setType(request.type().trim());
        venue.setLocation(request.location().trim());
        venue.setDescription(trimToNull(request.description()));
        venue.setCapacity(request.capacity());
        venue.setPrice(request.price());
        venue.setImage(trimToNull(request.image()));
        venue.setWebsiteUrl(normalizeWebsiteUrl(request.websiteUrl()));
        venue.setAvailable(request.available() == null || request.available());
        return toResponse(venueRepository.save(venue));
    }

    private Venue requireVenue(Long id) {
        return venueRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found."));
    }

    private void rejectDuplicate(Long id, String name, String location) {
        boolean duplicate = venueRepository.findAll().stream().anyMatch(venue ->
            (id == null || !venue.getId().equals(id))
                && normalizeName(venue.getName()).equals(normalizeName(name))
                && venue.getLocation().equalsIgnoreCase(location.trim())
        );
        if (duplicate) {
            throw new DuplicateResourceException("A venue with this name and location already exists.");
        }
    }

    private VenueResponse toResponse(Venue venue) {
        return new VenueResponse(
            venue.getId(), venue.getName(), venue.getType(), venue.getLocation(), venue.getDescription(),
            venue.getCapacity(), venue.getPrice(), venue.getImage(), venue.getWebsiteUrl(), venue.isAvailable()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeWebsiteUrl(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) return null;
        if (!trimmed.matches("(?i)^https?://.+")) {
            throw new IllegalArgumentException("websiteUrl must begin with http:// or https://.");
        }
        return trimmed;
    }

    private String normalizeName(String value) {
        return value.trim().toLowerCase()
            .replace('\u2013', '-')
            .replace('\u2014', '-')
            .replaceAll("\\s*-\\s*", " - ")
            .replaceAll("\\s+", " ");
    }
}
