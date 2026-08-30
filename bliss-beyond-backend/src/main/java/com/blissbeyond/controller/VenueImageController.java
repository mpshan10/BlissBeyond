package com.blissbeyond.controller;

import com.blissbeyond.service.VenueImageStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;

@RestController
public class VenueImageController {
    private final VenueImageStorageService venueImageStorageService;

    public VenueImageController(VenueImageStorageService venueImageStorageService) {
        this.venueImageStorageService = venueImageStorageService;
    }

    @GetMapping("/uploads/venue-images/{venueId}/{filename:.+}")
    public ResponseEntity<Resource> venueImage(@PathVariable Long venueId, @PathVariable String filename) throws IOException {
        Resource image = venueImageStorageService.loadPhoto(venueId, filename);
        String contentType = Files.probeContentType(image.getFile().toPath());
        MediaType mediaType = contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType);
        return ResponseEntity.ok().contentType(mediaType).body(image);
    }
}
