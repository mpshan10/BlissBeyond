package com.blissbeyond.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudImageStorageService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    private final Cloudinary cloudinary;
    private final Environment environment;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public CloudImageStorageService(
        Cloudinary cloudinary,
        Environment environment,
        @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
        @Value("${CLOUDINARY_API_KEY:}") String apiKey,
        @Value("${CLOUDINARY_API_SECRET:}") String apiSecret
    ) {
        this.cloudinary = cloudinary;
        this.environment = environment;
        this.cloudName = cloudName == null ? "" : cloudName.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
    }

    public boolean usesCloudinary() {
        return environment.acceptsProfiles(org.springframework.core.env.Profiles.of("production"));
    }

    public String upload(MultipartFile photo, String folder) {
        validateUpload(photo);
        if (!usesCloudinary() || !isConfigured()) {
            if (usesCloudinary()) {
                throw new IllegalStateException("Image storage is not configured.");
            }
            throw new IllegalStateException("Cloudinary storage is available only in production.");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                photo.getBytes(),
                ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", UUID.randomUUID().toString(),
                    "resource_type", "image",
                    "overwrite", false,
                    "unique_filename", true
                )
            );
            Object secureUrl = result.get("secure_url");
            if (secureUrl == null || String.valueOf(secureUrl).isBlank()) {
                throw new IllegalStateException("Image storage did not return a public URL.");
            }
            return String.valueOf(secureUrl);
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof IllegalStateException) throw (IllegalStateException) ex;
            throw new IllegalStateException("Unable to store image.", ex);
        }
    }

    public void deleteManagedImage(String publicUrl) {
        // Existing Cloudinary URLs are intentionally retained because their public IDs
        // are not stored separately and deleting an inferred ID could remove the wrong asset.
    }

    private boolean isConfigured() {
        return !cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank();
    }

    private void validateUpload(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Please choose an image.");
        }
        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Image must be 5 MB or smaller.");
        }
        String contentType = photo.getContentType() == null
            ? ""
            : photo.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.equals("image/jpeg")
            && !contentType.equals("image/jpg")
            && !contentType.equals("image/png")
            && !contentType.equals("image/webp")) {
            throw new IllegalArgumentException("Only JPG, PNG and WebP images are allowed.");
        }
    }
}
