package com.blissbeyond.service;

import com.blissbeyond.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
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
public class ProfilePhotoStorageService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final String PUBLIC_PREFIX = "/uploads/profile-photos/";

    private final Path uploadRoot;
    private final CloudImageStorageService cloudImageStorageService;

    public ProfilePhotoStorageService(
        @Value("${app.uploads.root:${user.dir}/uploads}") String uploadRoot,
        CloudImageStorageService cloudImageStorageService
    ) {
        this.uploadRoot = Path.of(uploadRoot).toAbsolutePath().normalize();
        this.cloudImageStorageService = cloudImageStorageService;
    }

    public StoredPhoto store(User user, MultipartFile photo) {
        validate(photo);
        if (cloudImageStorageService.usesCloudinary()) {
            return new StoredPhoto(
                cloudImageStorageService.upload(photo, "bliss-beyond/profile-photos/" + user.getId()),
                null
            );
        }
        String extension = extensionFor(photo.getContentType());
        Path userDirectory = uploadRoot.resolve("profile-photos").resolve(String.valueOf(user.getId())).normalize();
        if (!userDirectory.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Invalid profile photo storage location.");
        }

        String filename = UUID.randomUUID() + extension;
        Path target = userDirectory.resolve(filename).normalize();
        if (!target.startsWith(userDirectory)) {
            throw new IllegalArgumentException("Invalid profile photo filename.");
        }

        try {
            Files.createDirectories(userDirectory);
            try (InputStream input = photo.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new StoredPhoto(PUBLIC_PREFIX + user.getId() + "/" + filename, target);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to store profile photo.", ex);
        }
    }

    public void deleteManagedPhoto(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith(PUBLIC_PREFIX)) return;
        String relative = publicUrl.substring(PUBLIC_PREFIX.length());
        Path target = uploadRoot.resolve("profile-photos").resolve(relative).normalize();
        Path managedRoot = uploadRoot.resolve("profile-photos").normalize();
        if (!target.startsWith(managedRoot)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // A failed cleanup must not make a successful profile update fail.
        }
    }

    public Path getUploadRoot() {
        return uploadRoot.resolve("profile-photos").normalize();
    }

    private void validate(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Please choose a profile photo.");
        }
        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Profile photo must be 5 MB or smaller.");
        }
        String contentType = photo.getContentType() == null ? "" : photo.getContentType().toLowerCase(Locale.ROOT);
        if (!MediaType.IMAGE_JPEG_VALUE.equals(contentType)
            && !MediaType.IMAGE_PNG_VALUE.equals(contentType)
            && !"image/webp".equals(contentType)) {
            throw new IllegalArgumentException("Profile photo must be a JPG, PNG, or WebP image.");
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
            default -> throw new IllegalArgumentException("Unsupported profile photo type.");
        };
    }

    public record StoredPhoto(String publicUrl, Path physicalPath) {}
}
