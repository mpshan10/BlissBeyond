package com.blissbeyond.validation;

import java.time.LocalTime;

public final class EventTimeValidator {
    private static final int FIRST_HOUR = 9;
    private static final int LAST_HOUR = 23;

    private EventTimeValidator() {}

    public static void validate(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("A valid event date and time range are required.");
        }
        if (startTime.getMinute() != 0 || startTime.getSecond() != 0 || startTime.getNano() != 0
            || endTime.getMinute() != 0 || endTime.getSecond() != 0 || endTime.getNano() != 0) {
            throw new IllegalArgumentException("Event times must use whole hours.");
        }
        if (startTime.getHour() < FIRST_HOUR || startTime.getHour() > LAST_HOUR
            || endTime.getHour() < FIRST_HOUR || endTime.getHour() > LAST_HOUR) {
            throw new IllegalArgumentException("Event times must be between 09:00 and 23:00.");
        }
        if (!startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time.");
        }
    }
}
