package com.blissbeyond.exception;

public class EmailDeliveryUnavailableException extends RuntimeException {
    public EmailDeliveryUnavailableException(String message) {
        super(message);
    }
}
