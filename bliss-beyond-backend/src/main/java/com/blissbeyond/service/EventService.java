package com.blissbeyond.service;

import com.blissbeyond.dto.event.EventRequest;
import com.blissbeyond.dto.event.EventResponse;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.EventStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.EventRepository;
import com.blissbeyond.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EventService {
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final VenueService venueService;
    private final CurrentUserService currentUserService;

    public EventService(EventRepository eventRepository,
                        UserRepository userRepository,
                        VenueService venueService,
                        CurrentUserService currentUserService) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.venueService = venueService;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public EventResponse create(EventRequest request) {
        User current = currentUserService.requireCurrentUser();
        Event event = new Event();
        apply(request, event);
        event.setCustomer(current);
        event.setStatus(EventStatus.DRAFT);
        return map(eventRepository.save(event));
    }

    public List<EventResponse> listMine() {
        User current = currentUserService.requireCurrentUser();
        return eventRepository.findByCustomerId(current.getId()).stream().map(this::map).toList();
    }

    public EventResponse getMine(Long id) {
        return map(requireOwnedEvent(id));
    }

    @Transactional
    public EventResponse update(Long id, EventRequest request) {
        Event event = requireOwnedEvent(id);
        apply(request, event);
        if (request.venueId() != null) {
            Venue venue = venueService.findVenueEntity(request.venueId());
            event.setVenue(venue);
        }
        return map(eventRepository.save(event));
    }

    @Transactional
    public void delete(Long id) {
        Event event = requireOwnedEvent(id);
        eventRepository.delete(event);
    }

    public Event requireOwnedEvent(Long id) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        User current = currentUserService.requireCurrentUser();
        if (!event.getCustomer().getId().equals(current.getId())) {
            throw new ForbiddenActionException("You cannot access this event");
        }
        return event;
    }

    private void apply(EventRequest request, Event event) {
        event.setEventType(EventTypeCatalog.requireValid(request.eventType()));
        event.setEventDate(request.eventDate());
        event.setGuestCount(request.guestCount());
        event.setBudget(request.budget());
        event.setSpecialRequirements(request.specialRequirements());
        if (request.venueId() != null) {
            event.setVenue(venueService.findVenueEntity(request.venueId()));
        }
    }

    private EventResponse map(Event event) {
        return new EventResponse(
            event.getId(),
            event.getEventType(),
            event.getEventDate(),
            event.getGuestCount(),
            event.getBudget(),
            event.getSpecialRequirements(),
            event.getStatus() != null ? event.getStatus().name() : null,
            event.getCustomer() != null ? event.getCustomer().getId() : null,
            event.getVenue() != null ? event.getVenue().getId() : null,
            event.getVenue() != null ? event.getVenue().getName() : null
        );
    }
}
