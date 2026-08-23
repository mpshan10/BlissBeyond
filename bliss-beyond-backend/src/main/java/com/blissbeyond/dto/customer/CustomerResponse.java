package com.blissbeyond.dto.customer;

import java.util.List;

public record CustomerResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phone,
    String address,
    List<String> roles
) {
}
