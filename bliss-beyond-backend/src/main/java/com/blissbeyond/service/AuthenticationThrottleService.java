package com.blissbeyond.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight per-email throttling for the stateless local application.
 * This intentionally avoids a database schema or external cache dependency.
 */
@Service
public class AuthenticationThrottleService {
    static final int LOGIN_FAILURE_LIMIT = 5;
    static final int RESET_REQUEST_LIMIT = 3;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, AttemptState> loginFailures = new ConcurrentHashMap<>();
    private final Map<String, AttemptState> resetRequests = new ConcurrentHashMap<>();

    public synchronized boolean loginAllowed(String key) {
        return allowed(loginFailures, key, LOGIN_FAILURE_LIMIT);
    }

    public synchronized void recordLoginFailure(String key) {
        record(loginFailures, key);
    }

    public synchronized void clearLoginFailures(String key) {
        loginFailures.remove(key);
    }

    public synchronized boolean passwordResetRequestAllowed(String key) {
        if (!allowed(resetRequests, key, RESET_REQUEST_LIMIT)) {
            return false;
        }
        record(resetRequests, key);
        return true;
    }

    private boolean allowed(Map<String, AttemptState> attempts, String key, int limit) {
        AttemptState state = attempts.get(key);
        if (state == null) {
            return true;
        }
        if (state.startedAt.plus(WINDOW).isBefore(Instant.now())) {
            attempts.remove(key);
            return true;
        }
        return state.count < limit;
    }

    private void record(Map<String, AttemptState> attempts, String key) {
        Instant now = Instant.now();
        AttemptState state = attempts.get(key);
        if (state == null || state.startedAt.plus(WINDOW).isBefore(now)) {
            attempts.put(key, new AttemptState(now, 1));
            return;
        }
        attempts.put(key, new AttemptState(state.startedAt, state.count + 1));
    }

    private record AttemptState(Instant startedAt, int count) {
    }
}
