package com.blissbeyond.service;

import com.blissbeyond.dto.consultation.ConsultationRequest;
import com.blissbeyond.dto.consultation.ConsultationResponse;
import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.ConsultationStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.ConsultationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Service
public class ConsultationService {
    private static final List<LocalTime> AVAILABLE_START_TIMES = List.of(
        LocalTime.of(10, 0), LocalTime.of(11, 30), LocalTime.of(14, 0),
        LocalTime.of(15, 0), LocalTime.of(16, 30)
    );
    private static final Set<ConsultationStatus> BLOCKING_STATUSES = Set.of(
        ConsultationStatus.REQUESTED, ConsultationStatus.SCHEDULED
    );
    private final ConsultationRepository consultationRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public ConsultationService(ConsultationRepository consultationRepository,
                                CurrentUserService currentUserService,
                                NotificationService notificationService) {
        this.consultationRepository = consultationRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @Transactional
    public synchronized ConsultationResponse create(ConsultationRequest request) {
        User current = currentUserService.requireCurrentUser();
        if (consultationRepository.existsByCustomerIdAndStatusIn(current.getId(), BLOCKING_STATUSES)) {
            throw new DuplicateResourceException("You already have an active consultation. Complete or cancel it before booking another consultation.");
        }
        Consultation consultation = new Consultation();
        consultation.setCustomer(current);
        applyRequest(request, consultation, false);
        validateDirectSlot(consultation);
        consultation.setStatus(ConsultationStatus.SCHEDULED);
        Consultation saved = consultationRepository.save(consultation);
        notificationService.notifyAdmins(
            current, "CONSULTATION_REQUESTED", "New Consultation Request",
            "A consultation request was submitted by " + current.getFirstName() + " " + current.getLastName() + ".",
            "CONSULTATION", saved.getId(), "/prototype/admin/consultations.html",
            "CONSULTATION_REQUESTED:" + saved.getId()
        );
        return map(saved);
    }

    @Transactional(readOnly = true)
    public List<LocalTime> availableStartTimes(LocalDate date) {
        validateConsultationDate(date);
        LocalTime now = LocalTime.now();
        List<Consultation> consultations = consultationRepository.findAllByConsultationDate(date);
        return AVAILABLE_START_TIMES.stream()
            .filter(start -> !date.equals(LocalDate.now()) || start.isAfter(now))
            .filter(start -> !hasConflict(consultations, start))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listMine() {
        User current = currentUserService.requireCurrentUser();
        return consultationRepository.findByCustomerIdOrderByCreatedAtDesc(current.getId())
            .stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public ConsultationResponse getMine(Long id) {
        return map(requireOwned(id));
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> listAll() {
        return consultationRepository.findAll().stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public ConsultationResponse getAny(Long id) {
        return map(require(id));
    }

    @Transactional
    public ConsultationResponse schedule(Long id, ConsultationRequest request) {
        Consultation consultation = require(id);
        ConsultationStatus previousStatus = consultation.getStatus();
        if (consultation.getStatus() != ConsultationStatus.REQUESTED
            && consultation.getStatus() != ConsultationStatus.SCHEDULED) {
            throw new IllegalArgumentException("Only requested or scheduled consultations can be scheduled.");
        }
        applyRequest(request, consultation, true);
        consultation.setStatus(ConsultationStatus.SCHEDULED);
        Consultation saved = consultationRepository.save(consultation);
        String title = previousStatus == ConsultationStatus.SCHEDULED
            ? "Consultation rescheduled" : "Consultation confirmed";
        notificationService.notifyOnce(
            saved.getCustomer(), currentUserService.requireCurrentUser(),
            previousStatus == ConsultationStatus.SCHEDULED ? "CONSULTATION_RESCHEDULED" : "CONSULTATION_SCHEDULED", title,
            previousStatus == ConsultationStatus.SCHEDULED
                ? "Your consultation time has been updated."
                : "Your consultation has been confirmed.",
            "CONSULTATION", saved.getId(), "/prototype/customer/consultation.html?id=" + saved.getId(),
            "CONSULTATION:" + saved.getId() + ":SCHEDULED:"
                + saved.getConsultationDate() + ":" + saved.getStartTime() + ":" + saved.getEndTime()
        );
        return map(saved);
    }

    @Transactional
    public ConsultationResponse complete(Long id) {
        Consultation consultation = require(id);
        if (consultation.getStatus() != ConsultationStatus.SCHEDULED) {
            throw new IllegalArgumentException("Only scheduled consultations can be completed.");
        }
        consultation.setStatus(ConsultationStatus.COMPLETED);
        consultation.setCompletedAt(LocalDateTime.now());
        return map(consultationRepository.save(consultation));
    }

    @Transactional
    public ConsultationResponse cancel(Long id) {
        Consultation consultation = require(id);
        if (consultation.getStatus() == ConsultationStatus.COMPLETED
            || consultation.getStatus() == ConsultationStatus.CANCELLED) {
            throw new IllegalArgumentException("This consultation cannot be cancelled.");
        }
        consultation.setStatus(ConsultationStatus.CANCELLED);
        Consultation saved = consultationRepository.save(consultation);
        notificationService.notifyOnce(
            saved.getCustomer(), currentUserService.requireCurrentUser(), "CONSULTATION_CANCELLED", "Consultation cancelled",
            "Your consultation has been cancelled.", "CONSULTATION", saved.getId(),
            "/prototype/customer/consultation.html?id=" + saved.getId(),
            "CONSULTATION:" + saved.getId() + ":CANCELLED"
        );
        return map(saved);
    }

    private void applyRequest(ConsultationRequest request, Consultation consultation, boolean allowPlanner) {
        validateConsultationDate(request.consultationDate());
        LocalTime endTime = request.endTime() == null
            ? request.startTime().plusMinutes(30)
            : request.endTime();
        if (!request.startTime().isBefore(endTime)) {
            throw new IllegalArgumentException("Consultation start time must be before end time.");
        }
        consultation.setConsultationDate(request.consultationDate());
        consultation.setStartTime(request.startTime());
        consultation.setEndTime(endTime);
        consultation.setConsultationType(request.consultationType().trim());
        consultation.setPlanner(allowPlanner ? blankToNull(request.planner()) : null);
        consultation.setNotes(blankToNull(request.notes()));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateDirectSlot(Consultation consultation) {
        if (consultation.getConsultationDate().equals(LocalDate.now())
            && !consultation.getStartTime().isAfter(LocalTime.now())) {
            throw new IllegalArgumentException("Please choose a future consultation time.");
        }
        if (!AVAILABLE_START_TIMES.contains(consultation.getStartTime())
            || !consultation.getEndTime().equals(consultation.getStartTime().plusMinutes(30))) {
            throw new IllegalArgumentException("Please choose one of the available 30-minute consultation slots.");
        }
        if (hasConflict(consultationRepository.findByConsultationDate(consultation.getConsultationDate()), consultation.getStartTime())) {
            throw new DuplicateResourceException("That consultation time is no longer available. Please choose another time.");
        }
    }

    private boolean hasConflict(List<Consultation> consultations, LocalTime requestedStart) {
        LocalTime requestedEnd = requestedStart.plusMinutes(30);
        return consultations.stream()
            .filter(consultation -> BLOCKING_STATUSES.contains(consultation.getStatus()))
            .anyMatch(existing -> existing.getStartTime().isBefore(requestedEnd)
                && existing.getEndTime().isAfter(requestedStart));
    }

    private void validateConsultationDate(LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Consultation date must be today or later.");
        }
    }

    private Consultation requireOwned(Long id) {
        Consultation consultation = require(id);
        User current = currentUserService.requireCurrentUser();
        if (!consultation.getCustomer().getId().equals(current.getId())) {
            throw new ForbiddenActionException("You cannot access this consultation");
        }
        return consultation;
    }

    private Consultation require(Long id) {
        return consultationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));
    }

    private ConsultationResponse map(Consultation consultation) {
        User customer = consultation.getCustomer();
        String customerName = customer == null
            ? null
            : (customer.getFirstName() + " " + customer.getLastName()).trim();
        return new ConsultationResponse(
            consultation.getId(),
            customer != null ? customer.getId() : null,
            customerName,
            customer != null ? customer.getEmail() : null,
            consultation.getConsultationDate(),
            consultation.getStartTime(),
            consultation.getEndTime(),
            consultation.getConsultationType(),
            consultation.getPlanner(),
            consultation.getNotes(),
            consultation.getStatus() != null ? consultation.getStatus().name() : null,
            consultation.getCreatedAt(),
            consultation.getCompletedAt()
        );
    }
}
