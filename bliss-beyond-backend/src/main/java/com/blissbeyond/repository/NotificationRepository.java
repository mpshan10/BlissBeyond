package com.blissbeyond.repository;

import com.blissbeyond.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    long countByCustomerIdAndReadFalse(Long customerId);
    Optional<Notification> findByIdAndCustomerId(Long id, Long customerId);
    boolean existsByCustomerIdAndFingerprint(Long customerId, String fingerprint);
}
