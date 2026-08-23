package com.blissbeyond.controller;

import com.blissbeyond.dto.eventpackage.PackageResponse;
import com.blissbeyond.entity.PackageCategory;
import com.blissbeyond.service.PackageService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/packages")
public class PackageController {
    private final PackageService packageService;
    public PackageController(PackageService packageService){this.packageService=packageService;}
    @GetMapping public List<PackageResponse> list(@RequestParam(required=false) PackageCategory category){return packageService.list(category);}
    @GetMapping("/{slug}") public PackageResponse get(@PathVariable String slug){return packageService.get(slug);}
}


