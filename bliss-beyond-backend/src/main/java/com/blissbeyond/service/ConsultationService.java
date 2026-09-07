package com.blissbeyond.service;

import com.blissbeyond.dto.consultation.ConsultationRequest;
import com.blissbeyond.dto.consultation.ConsultationResponse;
import com.blissbeyond.dto.consultation.PlannerOption;
import com.blissbeyond.entity.Consultation;
import com.blissbeyond.entity.ConsultationStatus;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.ConsultationRepository;
import com.blissbeyond.repository.BookingRepository;
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
    private final BookingRepository bookingRepository;

    public ConsultationService(ConsultationRepository consultationRepository,
                                CurrentUserService currentUserService,
                                NotificationService notificationService,
                                BookingRepository bookingRepository) {
        this.consultationRepository = consultationRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public synchronized ConsultationResponse create(ConsultationRequest request) {
        User current = currentUserService.requireCurrentUser();
        if (consultationRepository.existsByCustomerIdAndStatusIn(current.getId(), BLOCKING_STATUSES)) {
            throw new DuplicateResourceException("You already have an active consultation. Complete or cancel it before booking another consultation.");
        }
        Consultation consultation = new Consultation();
        consultation.setCustomer(current);
        attachBooking(request.bookingId(), current, consultation);
        applyRequest(request, consultation, true);
        validateDirectSlot(consultation);
        consultation.setStatus(ConsultationStatus.SCHEDULED);
        Consultation saved = consultationRepository.save(consultation);
        notificationService.notifyAdmins(
            current, "CONSULTATION_REQUESTED", "New Consultation Request",
            "A consultation request was submitted by " + current.getFirstName() + " " + current.getLastName()
                + bookingContext(saved) + ".",
            "CONSULTATION", saved.getId(), "/prototype/admin/consultations.html?consultationId=" + saved.getId(),
            "CONSULTATION_REQUESTED:" + saved.getId()
        );
        return map(saved);
    }

    @Transactional(readOnly = true)
    public List<PlannerOption> availablePlanners() {
        return PlannerCatalog.all();
    }

    @Transactional(readOnly = true)
    public List<LocalTime> availableStartTimes(LocalDate date, String planner) {
        validateConsultationDate(date);
        String selectedPlanner = requirePlanner(planner);
        LocalTime now = LocalTime.now();
        List<Consultation> consultations = consultationRepository.findAllByConsultationDate(date);
        return AVAILABLE_START_TIMES.stream()
            .filter(start -> !date.equals(LocalDate.now()) || start.isAfter(now))
            .filter(start -> !hasConflict(consultations, start, null, selectedPlanner))
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
        validateScheduledSlot(consultation, consultation.getId());
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
        Consultation saved = consultationRepository.save(consultation);
        notificationService.notifyOnce(
            saved.getCustomer(), currentUserService.requireCurrentUser(), "CONSULTATION_COMPLETED",
            "Consultation completed", "Your consultation has been completed.",
            "CONSULTATION", saved.getId(), "/prototype/customer/consultation.html?id=" + saved.getId(),
            "CONSULTATION:" + saved.getId() + ":COMPLETED"
        );
        return map(saved);
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

    private void applyRequest(ConsultationRequest request, Consultation consultation, boolean requireSelectedPlanner) {
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
        consultation.setPlanner(normalizePlanner(request.planner(), requireSelectedPlanner));
        consultation.setNotes(blankToNull(request.notes()));
    }

    private void attachBooking(Long bookingId, User customer, Consultation consultation) {
        if (bookingId == null) return;
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getCustomer() == null || !customer.getId().equals(booking.getCustomer().getId())) {
            throw new ForbiddenActionException("You cannot create a consultation for this booking");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalArgumentException("Consultations cannot be created for cancelled or completed bookings.");
        }
        consultation.setBooking(booking);
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
        if (hasConflict(consultationRepository.findByConsultationDate(consultation.getConsultationDate()), consultation.getStartTime(), null, consultation.getPlanner())) {
            throw new DuplicateResourceException("That consultation time is no longer available. Please choose another time.");
        }
    }

    private void validateScheduledSlot(Consultation consultation, Long excludedId) {
        if (consultation.getConsultationDate().equals(LocalDate.now())
            && !consultation.getStartTime().isAfter(LocalTime.now())) {
            throw new IllegalArgumentException("Please choose a future consultation time.");
        }
        if (!AVAILABLE_START_TIMES.contains(consultation.getStartTime())
            || !consultation.getEndTime().equals(consultation.getStartTime().plusMinutes(30))) {
            throw new IllegalArgumentException("Please choose one of the available 30-minute consultation slots.");
        }
        if (hasConflict(consultationRepository.findByConsultationDate(consultation.getConsultationDate()), consultation.getStartTime(), excludedId, consultation.getPlanner())) {
            throw new DuplicateResourceException("That consultation time is no longer available. Please choose another time.");
        }
    }

    private boolean hasConflict(List<Consultation> consultations, LocalTime requestedStart, Long excludedId, String requestedPlanner) {
        LocalTime requestedEnd = requestedStart.plusMinutes(30);
        return consultations.stream()
            .filter(consultation -> BLOCKING_STATUSES.contains(consultation.getStatus()))
            .filter(consultation -> excludedId == null || !excludedId.equals(consultation.getId()))
            .filter(consultation -> consultation.getPlanner() != null
                && !consultation.getPlanner().isBlank()
                && consultation.getPlanner().equals(requestedPlanner))
            .anyMatch(existing -> existing.getStartTime().isBefore(requestedEnd)
                && existing.getEndTime().isAfter(requestedStart));
    }

    private String normalizePlanner(String value, boolean required) {
        String planner = blankToNull(value);
        if (planner == null) {
            if (required) throw new IllegalArgumentException("Please select a valid planner.");
            return null;
        }
        if (!PlannerCatalog.isAllowed(planner)) {
            throw new IllegalArgumentException("Please select a valid planner.");
        }
        return planner;
    }

    private String requirePlanner(String value) {
        return normalizePlanner(value, true);
    }

    private void validateConsultationDate(LocalDate date) {
        if (date == null || date.isBefore(LocalDate.now())) {
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
        Booking booking = consultation.getBooking();
        var event = booking == null ? null : booking.getEvent();
        var venue = event == null ? null : event.getVenue();
        String customerName = customer == null
            ? null
            : (customer.getFirstName() + " " + customer.getLastName()).trim();
        return new ConsultationResponse(
            consultation.getId(),
            booking == null ? null : booking.getId(),
            booking == null ? null : booking.getBookingType().name(),
            event == null ? null : event.getEventType(),
            venue == null ? null : venue.getName(),
            booking == null ? null : booking.getEventDate(),
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

    private String bookingContext(Consultation consultation) {
        return consultation.getBooking() == null
            ? ""
            : " for Booking BK-" + String.format("%04d", consultation.getBooking().getId());
    }
}
