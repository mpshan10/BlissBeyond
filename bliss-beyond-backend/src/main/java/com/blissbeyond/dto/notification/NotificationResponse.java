package com.blissbeyond.dto.notification;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    String type,
    String title,
    String message,
    Long referenceId,
    String relatedPath,
    boolean read,
    LocalDateTime createdAt
) {}
