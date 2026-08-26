package com.blissbeyond.controller;

import com.blissbeyond.dto.consultation.ConsultationRequest;
import com.blissbeyond.dto.consultation.ConsultationResponse;
import com.blissbeyond.dto.consultation.PlannerOption;
import com.blissbeyond.service.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/consultations")
@PreAuthorize("hasRole('ADMIN')")
public class AdminConsultationController {
    private final ConsultationService consultationService;

    public AdminConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @GetMapping
    public List<ConsultationResponse> list() {
        return consultationService.listAll();
    }

    @GetMapping("/planners")
    public List<PlannerOption> planners() {
        return consultationService.availablePlanners();
    }

    @GetMapping("/{id}")
    public ConsultationResponse get(@PathVariable Long id) {
        return consultationService.getAny(id);
    }

    @PatchMapping("/{id}/schedule")
    public ConsultationResponse schedule(@PathVariable Long id,
                                         @Valid @RequestBody ConsultationRequest request) {
        return consultationService.schedule(id, request);
    }

    @PatchMapping("/{id}/complete")
    public ConsultationResponse complete(@PathVariable Long id) {
        return consultationService.complete(id);
    }

    @PatchMapping("/{id}/cancel")
    public ConsultationResponse cancel(@PathVariable Long id) {
        return consultationService.cancel(id);
    }
}
