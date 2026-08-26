package com.blissbeyond.repository;

import com.blissbeyond.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndReadAtIsNull(Long recipientId);
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
    boolean existsByRecipientIdAndDedupeKey(Long recipientId, String dedupeKey);
}
