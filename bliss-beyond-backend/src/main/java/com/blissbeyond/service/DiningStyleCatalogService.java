package com.blissbeyond.service;

import com.blissbeyond.dto.diningstyle.DiningStyleResponse;
import com.blissbeyond.repository.DiningStyleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DiningStyleCatalogService {
    private final DiningStyleRepository diningStyleRepository;

    public DiningStyleCatalogService(DiningStyleRepository diningStyleRepository) {
        this.diningStyleRepository = diningStyleRepository;
    }

    @Transactional(readOnly = true)
    public List<DiningStyleResponse> listAvailable() {
        return diningStyleRepository.findByAvailableTrueOrderByIdAsc().stream()
            .map(style -> new DiningStyleResponse(
                style.getId(),
                style.getKey(),
                style.getName(),
                style.getDescription(),
                style.getPricePerGuest(),
                style.isAvailable()
            ))
            .toList();
    }
}
