package com.blissbeyond.repository;

import com.blissbeyond.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndReadAtIsNull(Long recipientId);
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
    boolean existsByRecipientIdAndDedupeKey(Long recipientId, String dedupeKey);

    @Modifying
    @Query("update Notification n set n.readAt = :readAt where n.recipient.id = :recipientId and n.readAt is null")
    int markAllUnreadAsRead(@Param("recipientId") Long recipientId, @Param("readAt") java.time.LocalDateTime readAt);

    @Modifying
    @Query(value = """
        INSERT INTO notifications
            (recipient_user_id, actor_user_id, type, severity, title, message,
             reference_type, reference_id, action_url, read_at, dedupe_key, created_at)
        VALUES (:recipientId, :actorId, :type, 'INFO', :title, :message,
                :referenceType, :referenceId, :actionUrl, NULL, :dedupeKey, :createdAt)
        ON DUPLICATE KEY UPDATE id = id
        """, nativeQuery = true)
    int insertIfAbsent(@Param("recipientId") Long recipientId,
                       @Param("actorId") Long actorId,
                       @Param("type") String type,
                       @Param("title") String title,
                       @Param("message") String message,
                       @Param("referenceType") String referenceType,
                       @Param("referenceId") Long referenceId,
                       @Param("actionUrl") String actionUrl,
                       @Param("dedupeKey") String dedupeKey,
                       @Param("createdAt") java.time.LocalDateTime createdAt);
}
