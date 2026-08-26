package com.blissbeyond.service;

import com.blissbeyond.dto.notification.NotificationResponse;
import com.blissbeyond.entity.Notification;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.NotificationRepository;
import com.blissbeyond.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
public class NotificationService {
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               CurrentUserService currentUserService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine(Integer requestedLimit) {
        int limit = requestedLimit == null ? DEFAULT_LIMIT : Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
        User current = currentUserService.requireCurrentUser();
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                current.getId(), PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
            .stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCountMine() {
        return notificationRepository.countByRecipientIdAndReadAtIsNull(currentUserService.requireCurrentUser().getId());
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        Notification notification = owned(id);
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }
        return map(notification);
    }

    @Transactional
    public void markAllRead() {
        User current = currentUserService.requireCurrentUser();
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(current.getId());
        LocalDateTime readAt = LocalDateTime.now();
        notifications.forEach(notification -> {
            if (notification.getReadAt() == null) notification.setReadAt(readAt);
        });
        notificationRepository.saveAll(notifications);
    }

    public void notifyAdmins(User actor, String type, String title, String message,
                             String referenceType, Long referenceId, String actionUrl,
                             String dedupeSeed) {
        userRepository.findDistinctByRolesName(RoleName.ROLE_ADMIN).forEach(admin ->
            notifyOnce(admin, actor, type, title, message, referenceType, referenceId,
                actionUrl, dedupeSeed));
    }

    public void notifyOnce(User recipient, User actor, String type, String title, String message,
                           String referenceType, Long referenceId, String actionUrl,
                           String dedupeSeed) {
        if (recipient == null || recipient.getId() == null) return;
        String dedupeKey = sha256(recipient.getId() + "|" + dedupeSeed);
        if (notificationRepository.existsByRecipientIdAndDedupeKey(recipient.getId(), dedupeKey)) return;

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setActor(actor);
        notification.setType(type);
        notification.setSeverity("INFO");
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setActionUrl(normalizeActionUrl(actionUrl));
        notification.setDedupeKey(dedupeKey);
        notification.setReadAt(null);
        notificationRepository.save(notification);
    }

    // Compatibility adapter for existing customer notification call sites.
    public void notifyOnce(User recipient, String type, String title, String message,
                           Long referenceId, String actionUrl, String dedupeSeed) {
        notifyOnce(recipient, null, type, title, message, type, referenceId,
            actionUrl, dedupeSeed);
    }

    private Notification owned(Long id) {
        User current = currentUserService.requireCurrentUser();
        return notificationRepository.findByIdAndRecipientId(id, current.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
    }

    private NotificationResponse map(Notification notification) {
        return new NotificationResponse(
            notification.getId(), notification.getType(), notification.getSeverity(),
            notification.getTitle(), notification.getMessage(), notification.getReferenceType(),
            notification.getReferenceId(), notification.getActionUrl(), notification.getReadAt() != null,
            notification.getReadAt(), notification.getCreatedAt()
        );
    }

    private String normalizeActionUrl(String actionUrl) {
        if (actionUrl == null || actionUrl.isBlank()) return null;
        String value = actionUrl.trim();
        if (!value.startsWith("/prototype/") || value.contains("\\") || value.contains("//")) {
            throw new IllegalArgumentException("Notification action URL must be an internal application path.");
        }
        return value;
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable.", ex);
        }
    }
}
