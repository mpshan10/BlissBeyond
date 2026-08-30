package com.blissbeyond.service;

import com.blissbeyond.entity.User;
import com.blissbeyond.dto.customer.CustomerProfileUpdateRequest;
import com.blissbeyond.dto.customer.CustomerPasswordChangeRequest;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CurrentUserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProfilePhotoStorageService profilePhotoStorageService;

    public CurrentUserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                              ProfilePhotoStorageService profilePhotoStorageService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.profilePhotoStorageService = profilePhotoStorageService;
    }

    public User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new ForbiddenActionException("No authenticated user found");
        }
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ForbiddenActionException("Authenticated user not found"));
    }

    public User updateProfile(CustomerProfileUpdateRequest request) {
        User user = requireCurrentUser();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        user.setAddress(request.address() == null || request.address().isBlank() ? null : request.address().trim());
        return userRepository.save(user);
    }

    @Transactional
    public User updateProfilePhoto(MultipartFile photo) {
        User user = requireCurrentUser();
        String previousUrl = user.getProfileImageUrl();
        ProfilePhotoStorageService.StoredPhoto stored = profilePhotoStorageService.store(user, photo);
        try {
            user.setProfileImageUrl(stored.publicUrl());
            User saved = userRepository.save(user);
            profilePhotoStorageService.deleteManagedPhoto(previousUrl);
            return saved;
        } catch (RuntimeException ex) {
            profilePhotoStorageService.deleteManagedPhoto(stored.publicUrl());
            throw ex;
        }
    }

    @Transactional
    public void changePassword(CustomerPasswordChangeRequest request) {
        PasswordPolicy.validate(request.newPassword());
        User user = requireCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from the current password.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        incrementSecurityVersion(user);
    }

    private void incrementSecurityVersion(User user) {
        if (user.getSecurityVersion() == Long.MAX_VALUE) {
            throw new IllegalStateException("Security version limit reached.");
        }
        if (userRepository.incrementSecurityVersion(user.getId()) != 1) {
            throw new IllegalStateException("Unable to update account security state.");
        }
    }
}
