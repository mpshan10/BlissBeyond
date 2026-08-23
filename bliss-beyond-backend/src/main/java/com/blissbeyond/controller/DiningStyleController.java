package com.blissbeyond.controller;

import com.blissbeyond.dto.diningstyle.DiningStyleResponse;
import com.blissbeyond.service.DiningStyleCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dining-styles")
public class DiningStyleController {
    private final DiningStyleCatalogService diningStyleCatalogService;

    public DiningStyleController(DiningStyleCatalogService diningStyleCatalogService) {
        this.diningStyleCatalogService = diningStyleCatalogService;
    }

    @GetMapping
    public List<DiningStyleResponse> list() {
        return diningStyleCatalogService.listAvailable();
    }
}
