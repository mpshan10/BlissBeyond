package com.blissbeyond.controller;

import com.blissbeyond.dto.addon.AddOnResponse;
import com.blissbeyond.dto.addon.CateringAddonIncludedItemResponse;
import com.blissbeyond.service.AddOnCatalogService;
import com.blissbeyond.service.CateringAddonIncludedItemService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/addons")
public class AddOnController {
    private final AddOnCatalogService addOnCatalogService;
    private final CateringAddonIncludedItemService includedItemService;

    public AddOnController(AddOnCatalogService addOnCatalogService, CateringAddonIncludedItemService includedItemService) {
        this.addOnCatalogService = addOnCatalogService;
        this.includedItemService = includedItemService;
    }

    @GetMapping
    public List<AddOnResponse> list() {
        return addOnCatalogService.listAvailable();
    }

    @GetMapping("/{addonId}/included-items")
    public List<CateringAddonIncludedItemResponse> includedItems(@PathVariable Long addonId) {
        return includedItemService.customer(addonId);
    }
}
