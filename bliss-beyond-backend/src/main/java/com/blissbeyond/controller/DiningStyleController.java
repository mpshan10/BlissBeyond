package com.blissbeyond.controller;

import com.blissbeyond.dto.diningstyle.DiningStyleResponse;
import com.blissbeyond.service.DiningStyleCatalogService;
import com.blissbeyond.dto.diningstyle.DiningStyleMenuResponse;
import com.blissbeyond.service.DiningStyleMenuService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dining-styles")
public class DiningStyleController {
    private final DiningStyleCatalogService diningStyleCatalogService;
    private final DiningStyleMenuService diningStyleMenuService;

    public DiningStyleController(DiningStyleCatalogService diningStyleCatalogService, DiningStyleMenuService diningStyleMenuService) {
        this.diningStyleCatalogService = diningStyleCatalogService;
        this.diningStyleMenuService = diningStyleMenuService;
    }

    @GetMapping
    public List<DiningStyleResponse> list() {
        return diningStyleCatalogService.listAvailable();
    }

    @GetMapping("/{id}/menu")
    public DiningStyleMenuResponse menu(@PathVariable Long id) {
        return diningStyleMenuService.customer(id);
    }
}
