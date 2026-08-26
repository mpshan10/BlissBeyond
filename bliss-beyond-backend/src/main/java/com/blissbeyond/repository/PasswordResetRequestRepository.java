package com.blissbeyond.repository;

import com.blissbeyond.entity.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    List<PasswordResetRequest> findByEmailAndInvalidatedAtIsNullAndUsedAtIsNullOrderByCreatedAtDesc(String email);

    Optional<PasswordResetRequest> findByResetTokenHashAndInvalidatedAtIsNullAndUsedAtIsNull(String resetTokenHash);
}
