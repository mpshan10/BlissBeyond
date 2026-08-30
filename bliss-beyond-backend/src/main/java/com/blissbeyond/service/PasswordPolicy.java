package com.blissbeyond.service;

/**
 * Keeps password rules identical for registration, password changes, and resets.
 */
public final class PasswordPolicy {
    private PasswordPolicy() {
    }

    public static void validate(String password) {
        if (password == null || password.length() < 8 || password.length() > 255
            || !password.matches(".*[A-Z].*")
            || !password.matches(".*[a-z].*")
            || !password.matches(".*\\d.*")
            || !password.matches(".*[!@#$%^&*].*")) {
            throw new IllegalArgumentException(
                "Password must be 8-255 characters and contain uppercase, lowercase, number, and special character."
            );
        }
    }
}
