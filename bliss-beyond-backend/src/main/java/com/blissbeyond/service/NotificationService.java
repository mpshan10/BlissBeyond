package com.blissbeyond.service;

import com.blissbeyond.dto.notification.NotificationResponse;
import com.blissbeyond.entity.Notification;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    public NotificationService(NotificationRepository notificationRepository,
                                CurrentUserService currentUserService) {
        this.notificationRepository = notificationRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine() {
        return notificationRepository.findByCustomerIdOrderByCreatedAtDesc(currentUserService.requireCurrentUser().getId())
            .stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCountMine() {
        return notificationRepository.countByCustomerIdAndReadFalse(currentUserService.requireCurrentUser().getId());
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        Notification notification = owned(id);
        notification.setRead(true);
        return map(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead() {
        User current = currentUserService.requireCurrentUser();
        notificationRepository.findByCustomerIdOrderByCreatedAtDesc(current.getId()).forEach(notification -> {
            if (!notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        });
    }

    @Transactional
    public void notifyOnce(User customer, String type, String title, String message,
                           Long referenceId, String relatedPath, String fingerprint) {
        if (customer == null || customer.getId() == null
            || notificationRepository.existsByCustomerIdAndFingerprint(customer.getId(), fingerprint)) {
            return;
        }
        Notification notification = new Notification();
        notification.setCustomer(customer);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceId(referenceId);
        notification.setRelatedPath(relatedPath);
        notification.setFingerprint(fingerprint);
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    private Notification owned(Long id) {
        User current = currentUserService.requireCurrentUser();
        return notificationRepository.findByIdAndCustomerId(id, current.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
    }

    private NotificationResponse map(Notification notification) {
        return new NotificationResponse(
            notification.getId(), notification.getType(), notification.getTitle(),
            notification.getMessage(), notification.getReferenceId(), notification.getRelatedPath(),
            notification.isRead(), notification.getCreatedAt()
        );
    }
}
