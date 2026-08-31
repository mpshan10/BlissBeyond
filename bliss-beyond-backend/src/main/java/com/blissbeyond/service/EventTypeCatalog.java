package com.blissbeyond.service;

import java.util.Set;

final class EventTypeCatalog {
    private static final Set<String> ALLOWED = Set.of(
        "Wedding", "Engagement", "Corporate", "Graduation", "Anniversary", "Birthday"
    );

    private EventTypeCatalog() {}

    static String requireValid(String value) {
        String normalized = value == null ? "" : value.trim();
        if (!ALLOWED.contains(normalized)) {
            throw new IllegalArgumentException("Please select a valid event type.");
        }
        return normalized;
    }

    static String canonicalize(String value) {
        if (value == null) return null;
        return switch (value.trim().toLowerCase()) {
            case "wedding" -> "Wedding";
            case "engagement" -> "Engagement";
            case "corporate" -> "Corporate";
            case "graduation" -> "Graduation";
            case "anniversary" -> "Anniversary";
            case "birthday" -> "Birthday";
            default -> null;
        };
    }

    static boolean isCanonical(String value) {
        return value != null && ALLOWED.contains(value.trim());
    }
}
