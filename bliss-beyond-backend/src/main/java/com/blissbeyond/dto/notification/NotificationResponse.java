package com.blissbeyond.dto.notification;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    String type,
    String severity,
    String title,
    String message,
    String referenceType,
    Long referenceId,
    String actionUrl,
    boolean read,
    java.time.LocalDateTime readAt,
    LocalDateTime createdAt
) {}
