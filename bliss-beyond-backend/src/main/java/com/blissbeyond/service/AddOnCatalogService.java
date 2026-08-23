package com.blissbeyond.service;

import com.blissbeyond.dto.addon.AddOnResponse;
import com.blissbeyond.repository.AddOnRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AddOnCatalogService {
    private final AddOnRepository addOnRepository;

    public AddOnCatalogService(AddOnRepository addOnRepository) {
        this.addOnRepository = addOnRepository;
    }

    @Transactional(readOnly = true)
    public List<AddOnResponse> listAvailable() {
        return addOnRepository.findAll().stream()
            .filter(addOn -> addOn.isAvailable())
            .map(addOn -> new AddOnResponse(
                addOn.getId(),
                addOn.getName(),
                addOn.getDescription(),
                addOn.getBillingType(),
                addOn.getPrice(),
                addOn.isAvailable()
            ))
            .toList();
    }
}
