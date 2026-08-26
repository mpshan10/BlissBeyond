package com.blissbeyond.controller;

import com.blissbeyond.dto.consultation.ConsultationRequest;
import com.blissbeyond.dto.consultation.ConsultationResponse;
import com.blissbeyond.dto.consultation.ConsultationSlotsResponse;
import com.blissbeyond.dto.consultation.PlannerOption;
import com.blissbeyond.service.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/customer/consultations")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerConsultationController {
    private final ConsultationService consultationService;

    public CustomerConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @PostMapping
    public ResponseEntity<ConsultationResponse> create(@Valid @RequestBody ConsultationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(consultationService.create(request));
    }

    @GetMapping
    public List<ConsultationResponse> list() {
        return consultationService.listMine();
    }

    @GetMapping("/planners")
    public List<PlannerOption> planners() {
        return consultationService.availablePlanners();
    }

    @GetMapping("/available-slots")
    public ConsultationSlotsResponse availableSlots(@RequestParam LocalDate date, @RequestParam String planner) {
        return new ConsultationSlotsResponse(date, consultationService.availableStartTimes(date, planner));
    }

    @GetMapping("/{id}")
    public ConsultationResponse get(@PathVariable Long id) {
        return consultationService.getMine(id);
    }
}
