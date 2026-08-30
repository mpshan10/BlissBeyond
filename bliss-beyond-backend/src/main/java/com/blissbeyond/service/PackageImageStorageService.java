package com.blissbeyond.service;

import com.blissbeyond.entity.Package;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class PackageImageStorageService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final String PUBLIC_PREFIX = "/uploads/package-images/";

    private final Path uploadRoot;
    private final CloudImageStorageService cloudImageStorageService;

    public PackageImageStorageService(
        @Value("${app.uploads.root:${user.dir}/uploads}") String uploadRoot,
        CloudImageStorageService cloudImageStorageService
    ) {
        this.uploadRoot = Path.of(uploadRoot).toAbsolutePath().normalize();
        this.cloudImageStorageService = cloudImageStorageService;
    }

    public StoredPhoto store(Package eventPackage, MultipartFile photo) {
        String detectedType = validate(photo);
        if (cloudImageStorageService.usesCloudinary()) {
            return new StoredPhoto(
                cloudImageStorageService.upload(photo, "bliss-beyond/package-images/" + eventPackage.getId()),
                null
            );
        }
        String extension = extensionFor(detectedType);
        Path packageDirectory = uploadRoot.resolve("package-images").resolve(String.valueOf(eventPackage.getId())).normalize();
        if (!packageDirectory.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Invalid package image storage location.");
        }

        String filename = UUID.randomUUID() + extension;
        Path target = packageDirectory.resolve(filename).normalize();
        if (!target.startsWith(packageDirectory)) {
            throw new IllegalArgumentException("Invalid package image filename.");
        }

        try {
            Files.createDirectories(packageDirectory);
            try (InputStream input = photo.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new StoredPhoto(PUBLIC_PREFIX + eventPackage.getId() + "/" + filename, target);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to store package image.", ex);
        }
    }

    public void deleteManagedPhoto(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith(PUBLIC_PREFIX)) return;
        String relative = publicUrl.substring(PUBLIC_PREFIX.length());
        Path target = uploadRoot.resolve("package-images").resolve(relative).normalize();
        Path managedRoot = uploadRoot.resolve("package-images").normalize();
        if (!target.startsWith(managedRoot)) return;
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // A failed cleanup must not make a successful package update fail.
        }
    }

    public Path getUploadRoot() {
        return uploadRoot.resolve("package-images").normalize();
    }

    private String validate(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Please choose a package image.");
        }
        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Package image must be 5 MB or smaller.");
        }
        String declaredType = photo.getContentType() == null ? "" : photo.getContentType().toLowerCase(Locale.ROOT);
        if (!declaredType.isBlank()
            && !"image/jpeg".equals(declaredType)
            && !"image/jpg".equals(declaredType)
            && !"image/png".equals(declaredType)
            && !"image/webp".equals(declaredType)) {
            throw new IllegalArgumentException("Only JPG, PNG and WebP images are allowed.");
        }
        try {
            byte[] bytes = photo.getBytes();
            String detectedType = detectImageType(bytes);
            if (detectedType == null) {
                throw new IllegalArgumentException("The uploaded file is not a valid JPG, PNG, or WebP image.");
            }
            if (!declaredType.isBlank()
                && !("image/jpg".equals(declaredType) && "image/jpeg".equals(detectedType))
                && !declaredType.equals(detectedType)) {
                throw new IllegalArgumentException("The uploaded file type does not match its image content.");
            }
            return detectedType;
        } catch (IOException ex) {
            throw new IllegalArgumentException("The uploaded file could not be read.", ex);
        }
    }

    private String detectImageType(byte[] bytes) throws IOException {
        if (isWebp(bytes)) return "image/webp";
        if (isJpeg(bytes) && ImageIO.read(new ByteArrayInputStream(bytes)) != null) return "image/jpeg";
        if (isPng(bytes) && ImageIO.read(new ByteArrayInputStream(bytes)) != null) return "image/png";
        return null;
    }

    private boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
            && (bytes[2] & 0xff) == 0xff;
    }

    private boolean isPng(byte[] bytes) {
        return bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N'
            && bytes[3] == 'G' && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a;
    }

    private boolean isWebp(byte[] bytes) {
        return bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
            && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new IllegalArgumentException("Unsupported package image type.");
        };
    }

    public record StoredPhoto(String publicUrl, Path physicalPath) {}
}
