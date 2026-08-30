package com.blissbeyond.config;

import com.blissbeyond.service.ProfilePhotoStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ProfilePhotoWebConfig implements WebMvcConfigurer {
    private final ProfilePhotoStorageService storageService;

    public ProfilePhotoWebConfig(ProfilePhotoStorageService storageService) {
        this.storageService = storageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = storageService.getUploadRoot().toUri().toString();
        registry.addResourceHandler("/uploads/profile-photos/**")
            .addResourceLocations(location);
    }
}
