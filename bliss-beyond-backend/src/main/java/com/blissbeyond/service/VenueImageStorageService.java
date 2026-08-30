package com.blissbeyond.service;

import com.blissbeyond.entity.Venue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class VenueImageStorageService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final String PUBLIC_PREFIX = "/uploads/venue-images/";

    private final Path uploadRoot;
    private final CloudImageStorageService cloudImageStorageService;

    public VenueImageStorageService(
        @Value("${app.uploads.root:${user.dir}/uploads}") String uploadRoot,
        CloudImageStorageService cloudImageStorageService
    ) {
        this.uploadRoot = Path.of(uploadRoot).toAbsolutePath().normalize();
        this.cloudImageStorageService = cloudImageStorageService;
    }

    public StoredPhoto store(Venue venue, MultipartFile photo) {
        validate(photo);
        if (cloudImageStorageService.usesCloudinary()) {
            return new StoredPhoto(
                cloudImageStorageService.upload(photo, "bliss-beyond/venue-images/" + venue.getId()),
                null
            );
        }
        String extension = extensionFor(photo.getContentType());
        Path venueDirectory = uploadRoot.resolve("venue-images").resolve(String.valueOf(venue.getId())).normalize();
        if (!venueDirectory.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Invalid venue image storage location.");
        }

        String filename = UUID.randomUUID() + extension;
        Path target = venueDirectory.resolve(filename).normalize();
        if (!target.startsWith(venueDirectory)) {
            throw new IllegalArgumentException("Invalid venue image filename.");
        }

        try {
            Files.createDirectories(venueDirectory);
            try (InputStream input = photo.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new StoredPhoto(PUBLIC_PREFIX + venue.getId() + "/" + filename, target);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to store venue image.", ex);
        }
    }

    public void deleteManagedPhoto(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith(PUBLIC_PREFIX)) return;
        String relative = publicUrl.substring(PUBLIC_PREFIX.length());
        Path target = uploadRoot.resolve("venue-images").resolve(relative).normalize();
        Path managedRoot = uploadRoot.resolve("venue-images").normalize();
        if (!target.startsWith(managedRoot)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // A failed cleanup must not make a successful venue update fail.
        }
    }

    public Path getUploadRoot() {
        return uploadRoot.resolve("venue-images").normalize();
    }

    public Resource loadPhoto(Long venueId, String filename) {
        if (venueId == null || filename == null || filename.isBlank()) {
            throw new com.blissbeyond.exception.ResourceNotFoundException("Venue image not found.");
        }
        Path venueDirectory = getUploadRoot().resolve(String.valueOf(venueId)).normalize();
        Path target = venueDirectory.resolve(filename).normalize();
        if (!target.startsWith(venueDirectory) || !Files.isRegularFile(target)) {
            throw new com.blissbeyond.exception.ResourceNotFoundException("Venue image not found.");
        }
        return new FileSystemResource(target);
    }

    private void validate(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Please choose a venue image.");
        }
        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Venue image must be 5 MB or smaller.");
        }
        String contentType = photo.getContentType() == null ? "" : photo.getContentType().toLowerCase(Locale.ROOT);
        if (!MediaType.IMAGE_JPEG_VALUE.equals(contentType)
            && !MediaType.IMAGE_PNG_VALUE.equals(contentType)
            && !"image/webp".equals(contentType)) {
            throw new IllegalArgumentException("Venue image must be a JPG, PNG, or WebP image.");
        }
        try (InputStream input = photo.getInputStream()) {
            if ("image/webp".equals(contentType)) {
                byte[] header = input.readNBytes(12);
                if (header.length != 12 || header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F'
                    || header[8] != 'W' || header[9] != 'E' || header[10] != 'B' || header[11] != 'P') {
                    throw new IllegalArgumentException("The uploaded file is not a valid WebP image.");
                }
            } else if (ImageIO.read(input) == null) {
                throw new IllegalArgumentException("The uploaded file is not a valid image.");
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("The uploaded file could not be read.", ex);
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case MediaType.IMAGE_JPEG_VALUE -> ".jpg";
            case MediaType.IMAGE_PNG_VALUE -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new IllegalArgumentException("Unsupported venue image type.");
        };
    }

    public record StoredPhoto(String publicUrl, Path physicalPath) {}
}
