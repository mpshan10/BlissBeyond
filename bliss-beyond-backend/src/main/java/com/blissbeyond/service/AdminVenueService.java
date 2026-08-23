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

import java.util.List;

@Service
public class AdminVenueService {
    private final VenueRepository venueRepository;

    public AdminVenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
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
            venue.getCapacity(), venue.getPrice(), venue.getImage(), venue.isAvailable()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeName(String value) {
        return value.trim().toLowerCase()
            .replace('\u2013', '-')
            .replace('\u2014', '-')
            .replaceAll("\\s*-\\s*", " - ")
            .replaceAll("\\s+", " ");
    }
}
