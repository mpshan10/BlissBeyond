package com.blissbeyond.config;

import com.blissbeyond.service.ProfilePhotoStorageService;
import com.blissbeyond.service.PackageImageStorageService;
import com.blissbeyond.service.VenueImageStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadWebConfig implements WebMvcConfigurer {
    private final ProfilePhotoStorageService profilePhotoStorageService;
    private final PackageImageStorageService packageImageStorageService;
    private final VenueImageStorageService venueImageStorageService;

    public UploadWebConfig(ProfilePhotoStorageService profilePhotoStorageService,
                           PackageImageStorageService packageImageStorageService,
                           VenueImageStorageService venueImageStorageService) {
        this.profilePhotoStorageService = profilePhotoStorageService;
        this.packageImageStorageService = packageImageStorageService;
        this.venueImageStorageService = venueImageStorageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/profile-photos/**")
            .addResourceLocations(profilePhotoStorageService.getUploadRoot().toUri().toString());
        registry.addResourceHandler("/uploads/package-images/**")
            .addResourceLocations(packageImageStorageService.getUploadRoot().toUri().toString());
        registry.addResourceHandler("/uploads/venue-images/**")
            .addResourceLocations(venueImageStorageService.getUploadRoot().toUri().toString());
    }
}
