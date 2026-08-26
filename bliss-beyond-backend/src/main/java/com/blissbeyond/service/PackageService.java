package com.blissbeyond.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.blissbeyond.dto.eventpackage.*;
import com.blissbeyond.entity.Package;
import com.blissbeyond.entity.*;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.PackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class PackageService {
    private final PackageRepository repository;
    private final ObjectMapper objectMapper;
    public PackageService(PackageRepository repository, ObjectMapper objectMapper){this.repository=repository;this.objectMapper=objectMapper;}
    @Transactional(readOnly=true)
    public List<PackageResponse> list(PackageCategory category){
        var packages=category==null?repository.findAllByActiveTrueOrderByIdAsc():repository.findAllByActiveTrueAndCategoryOrderByIdAsc(category);
        return packages.stream().filter(p -> p.getVenue() != null && p.getVenue().isAvailable()).map(this::map).toList();
    }
    @Transactional(readOnly=true)
    public PackageResponse get(String slug){return map(repository.findBySlugAndActiveTrue(slug).filter(p -> p.getVenue() != null && p.getVenue().isAvailable()).orElseThrow(()->new ResourceNotFoundException("Package not found")));}
    @Transactional(readOnly=true)
    public Package requireActiveEntity(Long id, String slug) {
        if (id != null) {
            return repository.findById(id).filter(Package::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Package not found"));
        }
        if (slug != null && !slug.isBlank()) {
            return repository.findBySlugAndActiveTrue(slug.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Package not found"));
        }
        throw new ResourceNotFoundException("Package identifier is required");
    }
    private PackageResponse map(Package p){
        var services=p.getServiceItems().stream().sorted(java.util.Comparator.comparing(PackageServiceItem::getDisplayOrder)).map(i->new PackageServiceItemResponse(i.getService().getId(),i.getService().getName(),i.getDisplayOrder(),parse(i.getInclusionJson()))).toList();
        var v=p.getVenue();
        return new PackageResponse(p.getId(),p.getSlug(),p.getName(),p.getCategory(),p.getDescription(),p.getMaxGuests(),p.getFinalPrice(),p.getImage(),p.isActive(),new PackageVenueResponse(v.getId(),v.getName(),v.getLocation(),v.getCapacity(),v.getWebsiteUrl()),services);
    }
    private List<String> parse(String json){try{return objectMapper.readValue(json,new TypeReference<>(){});}catch(Exception e){throw new IllegalStateException("Invalid package inclusion data",e);}}
}
