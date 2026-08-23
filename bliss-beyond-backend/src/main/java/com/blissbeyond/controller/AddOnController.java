package com.blissbeyond.controller;

import com.blissbeyond.dto.addon.AddOnResponse;
import com.blissbeyond.service.AddOnCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/addons")
public class AddOnController {
    private final AddOnCatalogService addOnCatalogService;

    public AddOnController(AddOnCatalogService addOnCatalogService) {
        this.addOnCatalogService = addOnCatalogService;
    }

    @GetMapping
    public List<AddOnResponse> list() {
        return addOnCatalogService.listAvailable();
    }
}
