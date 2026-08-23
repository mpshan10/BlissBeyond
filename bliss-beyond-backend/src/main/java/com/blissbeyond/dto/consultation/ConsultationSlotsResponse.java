package com.blissbeyond.dto.consultation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record ConsultationSlotsResponse(LocalDate date, List<LocalTime> slots) {
}
