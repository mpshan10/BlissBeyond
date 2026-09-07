package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminBookingSummaryResponse;
import com.blissbeyond.dto.booking.BookingServiceSelectionRequest;
import com.blissbeyond.dto.booking.CustomerBookingDetailResponse;
import com.blissbeyond.dto.booking.CustomerBookingSummaryResponse;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.BookingStatus;
import com.blissbeyond.entity.BookingType;
import com.blissbeyond.entity.PackageBookingSnapshot;
import com.blissbeyond.entity.EventService;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.Food;
import com.blissbeyond.entity.MenuSelection;
import com.blissbeyond.entity.ServiceCustomization;
import com.blissbeyond.entity.ServiceEntity;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.QuotationStatus;
import com.blissbeyond.entity.User;
import com.blissbeyond.entity.Payment;
import com.blissbeyond.entity.PaymentStatus;
import com.blissbeyond.entity.EventStatus;
import com.blissbeyond.entity.Venue;
import com.blissbeyond.entity.AddOn;
import com.blissbeyond.entity.AddOnBillingType;
import com.blissbeyond.entity.DiningStyle;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.EventServiceRepository;
import com.blissbeyond.repository.EventRepository;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.FoodRepository;
import com.blissbeyond.repository.MenuSelectionRepository;
import com.blissbeyond.repository.ServiceCustomizationRepository;
import com.blissbeyond.repository.ServiceRepository;
import com.blissbeyond.repository.AddOnRepository;
import com.blissbeyond.repository.DiningStyleRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.PaymentRepository;
import com.blissbeyond.repository.ConsultationRepository;
import com.blissbeyond.validation.EventTimeValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Objects;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final CurrentUserService currentUserService;
    private final ServiceRepository serviceRepository;
    private final EventServiceRepository eventServiceRepository;
    private final ServiceCustomizationRepository serviceCustomizationRepository;
    private final MenuSelectionRepository menuSelectionRepository;
    private final FoodRepository foodRepository;
    private final DiningStyleRepository diningStyleRepository;
    private final AddOnRepository addOnRepository;
    private final ObjectMapper objectMapper;
    private final VenueService venueService;
    private final PackageBookingSnapshotRepository packageBookingSnapshotRepository;
    private final NotificationService notificationService;
    private final PaymentRepository paymentRepository;
    private final ConsultationRepository consultationRepository;
    private final CustomizeServicePricing customizeServicePricing;

    public BookingService(
        BookingRepository bookingRepository,
        EventRepository eventRepository,
        CurrentUserService currentUserService,
        ServiceRepository serviceRepository,
        EventServiceRepository eventServiceRepository,
        ServiceCustomizationRepository serviceCustomizationRepository,
        MenuSelectionRepository menuSelectionRepository,
        FoodRepository foodRepository,
        DiningStyleRepository diningStyleRepository,
        AddOnRepository addOnRepository,
        ObjectMapper objectMapper,
        VenueService venueService,
        PackageBookingSnapshotRepository packageBookingSnapshotRepository,
        NotificationService notificationService,
        PaymentRepository paymentRepository,
        ConsultationRepository consultationRepository,
        CustomizeServicePricing customizeServicePricing
    ) {
        this.bookingRepository = bookingRepository;
        this.eventRepository = eventRepository;
        this.currentUserService = currentUserService;
        this.serviceRepository = serviceRepository;
        this.eventServiceRepository = eventServiceRepository;
        this.serviceCustomizationRepository = serviceCustomizationRepository;
        this.menuSelectionRepository = menuSelectionRepository;
        this.foodRepository = foodRepository;
        this.diningStyleRepository = diningStyleRepository;
        this.addOnRepository = addOnRepository;
        this.objectMapper = objectMapper;
        this.venueService = venueService;
        this.packageBookingSnapshotRepository = packageBookingSnapshotRepository;
        this.notificationService = notificationService;
        this.paymentRepository = paymentRepository;
        this.consultationRepository = consultationRepository;
        this.customizeServicePricing = customizeServicePricing;
    }

    public List<Booking> listMine() {
        User current = currentUserService.requireCurrentUser();
        return bookingRepository.findByCustomerId(current.getId());
    }

    @Transactional(readOnly = true)
    public List<CustomerBookingSummaryResponse> listMineSummaries() {
        User current = currentUserService.requireCurrentUser();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(current.getId()).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminBookingSummaryResponse> listAdminSummaries() {
        return bookingRepository.findAll().stream()
            .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
            .map(this::toAdminSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public CustomerBookingDetailResponse requireOwnedBookingDetail(Long id) {
        return toDetailResponse(requireOwnedBooking(id));
    }

    @Transactional
    public Booking create(Event event, Quotation quotation, LocalTime startTime, LocalTime endTime, List<BookingServiceSelectionRequest> selectedServices) {
        User current = currentUserService.requireCurrentUser();
        validateBookingDate(event.getEventDate());
        EventTimeValidator.validate(startTime, endTime);
        if (event.getVenue() != null) {
            venueService.ensureVenueCapacity(event.getVenue().getId(), event.getGuestCount());
            venueService.ensureBookingSlotAvailable(
                event.getVenue().getId(),
                event.getEventDate(),
                startTime,
                endTime,
                null
            );
        }
        Booking booking = new Booking();
        booking.setCustomer(current);
        booking.setEvent(event);
        booking.setQuotation(quotation);
        booking.setVenueId(event.getVenue() != null ? event.getVenue().getId() : null);
        booking.setEventDate(event.getEventDate());
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        event.setStatus(EventStatus.BOOKED);
        booking.setStatus(BookingStatus.PENDING);
        booking = bookingRepository.save(booking);
        notificationService.notifyAdmins(
            current, "BOOKING_CREATED", "New Booking Request",
            "A new booking request was submitted by " + current.getFirstName() + " " + current.getLastName() + ".",
            "BOOKING", booking.getId(), "/prototype/admin/bookings.html?bookingId=" + booking.getId(),
            "BOOKING_CREATED:" + booking.getId()
        );
        persistSelectedServices(event, selectedServices);
        eventRepository.save(event);
        return booking;
    }

    @Transactional
    public Booking approveBooking(Long id) {
        Booking booking = requireBooking(id);
        if (booking.getBookingType() == BookingType.CUSTOM
            && (booking.getQuotation() == null
                || booking.getQuotation().getStatus() != com.blissbeyond.entity.QuotationStatus.ACCEPTED)) {
            throw new IllegalArgumentException("Customer must accept the quotation before deposit can be requested.");
        }
        if (booking.getStatus() == BookingStatus.PENDING && booking.getVenueId() != null) {
            venueService.ensureBookingSlotAvailable(
                booking.getVenueId(),
                booking.getEventDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getId()
            );
        }
        LocalDateTime depositRequestedAt = LocalDateTime.now();
        LocalDate balanceDueDate = booking.getEventDate() == null ? null : booking.getEventDate().minusDays(7);
        if (balanceDueDate != null && !depositRequestedAt.plusDays(5).toLocalDate().isBefore(balanceDueDate)) {
            throw new IllegalArgumentException("The deposit deadline would overlap the balance deadline.");
        }
        return transitionBookingStatus(booking, BookingStatus.AWAITING_DEPOSIT);
    }

    /**
     * Compatibility method for the existing /confirm route. Approval now only
     * moves a booking to AWAITING_DEPOSIT; payment will own confirmation later.
     */
    public Booking confirmBooking(Long id) {
        return approveBooking(id);
    }

    @Transactional
    public Booking confirmAfterDeposit(Long id) {
        Booking booking = requireBooking(id);
        if (booking.getStatus() != BookingStatus.AWAITING_DEPOSIT) {
            throw new IllegalArgumentException("Only bookings awaiting deposit can be confirmed by a deposit payment.");
        }
        return transitionBookingStatus(booking, BookingStatus.CONFIRMED);
    }

    @Transactional
    public Booking cancelBooking(Long id) {
        Booking booking = requireBooking(id);
        return cancelBookingIfAllowed(booking, true);
    }

    @Transactional
    public Booking cancelOwnedBooking(Long id) {
        return cancelBookingIfAllowed(requireOwnedBooking(id), false);
    }

    private Booking cancelBookingIfAllowed(Booking booking, boolean enforcePaymentReview) {
        if (enforcePaymentReview && booking.getStatus() == BookingStatus.CONFIRMED
            && paymentRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream()
                .anyMatch(payment -> payment.getPaymentStatus() == PaymentStatus.PAID)) {
            throw new IllegalArgumentException("Confirmed paid bookings cannot be cancelled directly. Payment/refund review is required.");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.AWAITING_DEPOSIT
            && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("This booking cannot be cancelled.");
        }
        return transitionBookingStatus(booking, BookingStatus.CANCELLED);
    }

    @Transactional
    public Booking completeBooking(Long id) {
        Booking booking = requireBooking(id);
        if (remainingBalance(booking).signum() > 0) {
            throw new IllegalArgumentException("A booking cannot be completed while a balance remains unpaid.");
        }
        return transitionBookingStatus(booking, BookingStatus.COMPLETED);
    }

    private void validateBookingDate(LocalDate eventDate) {
        LocalDate minimumAllowedDate = LocalDate.now().plusMonths(1);
        if (eventDate == null || eventDate.isBefore(minimumAllowedDate)) {
            throw new IllegalArgumentException("Event date must be at least one month in advance.");
        }
    }

    private void persistSelectedServices(Event event, List<BookingServiceSelectionRequest> selectedServices) {
        if (selectedServices == null || selectedServices.isEmpty()) {
            return;
        }

        if (event.getCustomer() == null || event.getCustomer().getId() == null) {
            throw new ForbiddenActionException("You cannot access this event");
        }

        List<EventService> existing = eventServiceRepository.findByEventId(event.getId());
        if (!existing.isEmpty()) {
          List<Long> existingIds = existing.stream().map(EventService::getId).toList();
          serviceCustomizationRepository.deleteByEventServiceIdIn(existingIds);
          menuSelectionRepository.deleteByEventId(event.getId());
          eventServiceRepository.deleteByEventId(event.getId());
        }

        Set<String> seenServices = new HashSet<>();
        for (BookingServiceSelectionRequest selection : selectedServices) {
            if (selection == null) {
                continue;
            }

            Long backendServiceId = selection.backendServiceId();
            String serviceKey = selection.serviceKey() == null ? "" : selection.serviceKey().trim().toLowerCase();
            if ((backendServiceId == null || backendServiceId <= 0) && serviceKey.isBlank()) {
                throw new IllegalArgumentException("Selected service is missing a valid service key");
            }
            if (!seenServices.add(serviceKey.isBlank() ? "id:" + backendServiceId : "key:" + serviceKey)) {
                throw new IllegalArgumentException("Duplicate service selection found");
            }

            ServiceEntity service = resolveSelectedService(selection, backendServiceId);
            if (!service.isAvailable()) {
                throw new IllegalArgumentException(service.getName() + " is currently unavailable.");
            }

            JsonNode customization = selection.customization();
            BigDecimal estimatedTotal = customizeServicePricing.isCateringKey(selection.serviceKey())
                || ((selection.serviceKey() == null || selection.serviceKey().isBlank()) && backendServiceId == 1L)
                ? calculateTrustedCateringTotal(event, customization)
                : customizeServicePricing.calculate(selection.serviceKey(), customization).total();

            EventService eventService = new EventService();
            eventService.setEvent(event);
            eventService.setService(service);
            eventService.setServiceNameSnapshot(service.getName());
            eventService.setSelected(true);
            eventService.setEstimatedTotal(estimatedTotal);
            eventService.setCustomizationJson(null);
            eventService = eventServiceRepository.save(eventService);

            if (customization != null && !customization.isNull() && !customization.isEmpty()) {
                String payloadJson = serializeCustomization(customization, service.getName());

                ServiceCustomization serviceCustomization = new ServiceCustomization();
                serviceCustomization.setEventService(eventService);
                serviceCustomization.setPayloadJson(payloadJson);
                serviceCustomization.setEstimatedTotal(estimatedTotal);
                serviceCustomizationRepository.save(serviceCustomization);

                if (customizeServicePricing.isCateringKey(selection.serviceKey())
                    || ((selection.serviceKey() == null || selection.serviceKey().isBlank()) && backendServiceId == 1L)) {
                    persistMenuSelections(event, customization);
                }
            }
        }
    }

    private ServiceEntity resolveSelectedService(BookingServiceSelectionRequest selection, Long backendServiceId) {
        String key = selection.serviceKey() == null ? "" : selection.serviceKey().trim().toLowerCase();
        String serviceName = switch (key) {
            case "catering" -> "Catering";
            case "decoration" -> "Decoration & Styling";
            case "photography" -> "Photography & Videography";
            case "entertainment" -> "Entertainment";
            case "lighting-av" -> "Lighting & AV";
            case "cake" -> "Cake & Desserts";
            case "florals" -> "Floral Design";
            default -> null;
        };
        if (serviceName != null) {
            return serviceRepository.findByNameIgnoreCase(serviceName)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        }
        return serviceRepository.findById(backendServiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Service not found"));
    }

    private BigDecimal calculateTrustedCateringTotal(Event event, JsonNode customization) {
        if (customization == null || !customization.isObject()) {
            throw new IllegalArgumentException("Catering customization is required");
        }
        if (event.getGuestCount() == null || event.getGuestCount() <= 0) {
            throw new IllegalArgumentException("Event guest count must be greater than zero");
        }

        JsonNode guestCountNode = customization.get("guestCount");
        if (guestCountNode != null && !guestCountNode.isNull()) {
            if (!guestCountNode.canConvertToInt() || guestCountNode.asInt() != event.getGuestCount()) {
                throw new IllegalArgumentException("Catering guest count does not match the event guest count");
            }
        }

        DiningStyle diningStyle = resolveDiningStyle(customization);
        if (!diningStyle.isAvailable()) {
            throw new IllegalArgumentException("Catering dining style is currently unavailable");
        }

        BigDecimal guests = BigDecimal.valueOf(event.getGuestCount());
        BigDecimal total = diningStyle.getPricePerGuest().multiply(guests);
        total = total.add(calculateTrustedFoodTotal(customization, event.getGuestCount()));
        JsonNode addons = customization.get("addons");
        Set<Long> seenAddonIds = new HashSet<>();

        if (addons != null && !addons.isNull()) {
            if (!addons.isArray()) {
                throw new IllegalArgumentException("Invalid Catering add-on selection");
            }
            for (JsonNode addonNode : addons) {
                JsonNode idNode = addonNode == null ? null : addonNode.get("backendAddonId");
                if (idNode == null || !idNode.canConvertToLong() || idNode.asLong() <= 0) {
                    throw new IllegalArgumentException("Catering add-on is missing a valid backend ID");
                }

                long addonId = idNode.asLong();
                if (!seenAddonIds.add(addonId)) {
                    throw new IllegalArgumentException("Duplicate Catering add-on selected: " + addonId);
                }

                AddOn addon = addOnRepository.findById(addonId)
                    .orElseThrow(() -> new ResourceNotFoundException("Catering add-on not found"));
                if (!addon.isAvailable()) {
                    throw new IllegalArgumentException(addon.getName() + " is currently unavailable");
                }

                if (addon.getBillingType() == AddOnBillingType.PER_GUEST) {
                    total = total.add(addon.getPrice().multiply(guests));
                } else if (addon.getBillingType() == AddOnBillingType.FLAT) {
                    total = total.add(addon.getPrice());
                } else if (addon.getBillingType() == AddOnBillingType.PER_UNIT) {
                    JsonNode quantityNode = addonNode.get("quantity");
                    if (quantityNode == null || !quantityNode.canConvertToInt() || quantityNode.asInt() <= 0) {
                        throw new IllegalArgumentException("A positive quantity is required for " + addon.getName());
                    }
                    total = total.add(addon.getPrice().multiply(BigDecimal.valueOf(quantityNode.asInt())));
                }
            }
        }

        return total;
    }

    private BigDecimal calculateTrustedFoodTotal(JsonNode customization, int guestCount) {
        JsonNode foods = customization.get("foods");
        if (foods == null || foods.isNull()) {
            return BigDecimal.ZERO;
        }
        if (!foods.isArray()) {
            throw new IllegalArgumentException("Please select valid Catering food items.");
        }

        BigDecimal guests = BigDecimal.valueOf(guestCount);
        BigDecimal total = BigDecimal.ZERO;
        Set<Long> seenFoodIds = new HashSet<>();
        for (JsonNode foodNode : foods) {
            Long foodId = extractFoodId(foodNode);
            if (foodId == null || !seenFoodIds.add(foodId)) {
                throw new IllegalArgumentException(foodId == null
                    ? "Please select valid Catering food items."
                    : "Duplicate Catering food selected: " + foodId);
            }

            Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new IllegalArgumentException("Please select valid Catering food items."));
            if (!food.isAvailable()) {
                throw new IllegalArgumentException("Selected food is currently unavailable: " + food.getName());
            }
            total = total.add(food.getPricePerGuest().multiply(guests));
        }
        return total;
    }

    private DiningStyle resolveDiningStyle(JsonNode customization) {
        JsonNode styleNode = customization.get("style");
        JsonNode idNode = styleNode != null && styleNode.isObject()
            ? styleNode.get("backendDiningStyleId")
            : customization.get("backendDiningStyleId");
        JsonNode keyNode = styleNode != null && styleNode.isObject()
            ? styleNode.get("key")
            : customization.get("styleKey");

        DiningStyle diningStyle = null;
        if (idNode != null && idNode.canConvertToLong() && idNode.asLong() > 0) {
            diningStyle = diningStyleRepository.findById(idNode.asLong())
                .orElseThrow(() -> new ResourceNotFoundException("Catering dining style not found"));
        } else if (keyNode != null && !keyNode.isNull() && !keyNode.asText().isBlank()) {
            diningStyle = diningStyleRepository.findByKey(keyNode.asText())
                .orElseThrow(() -> new ResourceNotFoundException("Catering dining style not found"));
        } else {
            throw new IllegalArgumentException("Catering selection is missing a valid dining style");
        }
        return diningStyle;
    }

    private String serializeCustomization(JsonNode customization, String serviceName) {
        try {
            String payloadJson = objectMapper.writeValueAsString(customization);
            if (payloadJson.length() > 4000) {
                throw new IllegalArgumentException("Customization payload is too large for " + serviceName);
            }
            return payloadJson;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to serialize customization for " + serviceName);
        }
    }

    private void persistMenuSelections(Event event, JsonNode customization) {
        JsonNode foods = customization.get("foods");
        if (foods == null || foods.isNull()) {
            return;
        }
        if (!foods.isArray()) {
            throw new IllegalArgumentException("Please select valid Catering food items.");
        }

        Set<Long> seenFoodIds = new HashSet<>();
        for (JsonNode foodNode : foods) {
            Long foodId = extractFoodId(foodNode);
            if (foodId == null || !seenFoodIds.add(foodId)) {
                throw new IllegalArgumentException(foodId == null
                    ? "Please select valid Catering food items."
                    : "Duplicate Catering food selected: " + foodId);
            }

            Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new IllegalArgumentException("Please select valid Catering food items."));
            if (!food.isAvailable()) {
                throw new IllegalArgumentException("Selected food is currently unavailable: " + food.getName());
            }

            int quantity = Math.max(1, event.getGuestCount() == null ? 1 : event.getGuestCount());

            MenuSelection selection = new MenuSelection();
            selection.setEvent(event);
            selection.setFood(food);
            selection.setQuantity(quantity);
            selection.setEstimatedTotal(food.getPricePerGuest().multiply(BigDecimal.valueOf(quantity)));
            menuSelectionRepository.save(selection);
        }

    }

    private Long extractFoodId(JsonNode foodNode) {
        if (foodNode == null || foodNode.isNull() || foodNode.isMissingNode()) {
            return null;
        }

        JsonNode idNode = foodNode.get("backendFoodId");
        if (idNode == null || idNode.isNull()) {
            idNode = foodNode.get("foodId");
        }
        if (idNode == null || idNode.isNull()) {
            idNode = foodNode.get("id");
        }
        if (idNode != null && idNode.canConvertToLong()) {
            long value = idNode.asLong();
            return value > 0 ? value : null;
        }
        return null;
    }

    private Booking transitionBookingStatus(Long id, BookingStatus targetStatus) {
        return transitionBookingStatus(requireBooking(id), targetStatus);
    }

    private Booking requireBooking(Long id) {
        return bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found."));
    }

    private Booking transitionBookingStatus(Booking booking, BookingStatus targetStatus) {

        BookingStatus currentStatus = booking.getStatus();
        if (currentStatus == targetStatus) {
            return booking;
        }

        if (!isAllowedTransition(currentStatus, targetStatus)) {
            throw new IllegalArgumentException(buildTransitionErrorMessage(currentStatus, targetStatus));
        }

        booking.setStatus(targetStatus);
        if (targetStatus == BookingStatus.AWAITING_DEPOSIT && booking.getDepositRequestedAt() == null) {
            booking.setDepositRequestedAt(LocalDateTime.now());
        }
        if (targetStatus == BookingStatus.CONFIRMED && booking.getConfirmedAt() == null) {
            booking.setConfirmedAt(LocalDateTime.now());
        }
        Booking saved = bookingRepository.save(booking);
        User customer = saved.getCustomer();
        String status = targetStatus.name();
        String title = switch (targetStatus) {
            case CONFIRMED -> "Booking confirmed";
            case CANCELLED -> "Booking cancelled";
            case COMPLETED -> "Booking completed";
            case AWAITING_DEPOSIT -> "Booking approved";
            case PENDING -> "Booking updated";
        };
        String message = switch (targetStatus) {
            case CONFIRMED -> "Your booking is confirmed.";
            case CANCELLED -> "Your booking has been cancelled.";
            case COMPLETED -> "Your event booking has been completed.";
            case AWAITING_DEPOSIT -> "Your booking was approved. The 30% deposit is due by "
                + saved.getDepositRequestedAt().plusDays(5).toLocalDate() + ".";
            case PENDING -> "Your booking status was updated.";
        };
        notificationService.notifyOnce(
            customer, currentUserService.requireCurrentUser(), "BOOKING_" + status, title, message,
            "BOOKING", saved.getId(), "/prototype/customer/booking-status.html?id=" + saved.getId(),
            "BOOKING:" + saved.getId() + ":" + status
        );
        return saved;
    }

    private BigDecimal remainingBalance(Booking booking) {
        BigDecimal total;
        if (booking.getBookingType() == BookingType.PACKAGE) {
            total = packageBookingSnapshotRepository.findByBookingId(booking.getId())
                .map(PackageBookingSnapshot::getFinalPrice)
                .orElseThrow(() -> new IllegalArgumentException("Historical package price is unavailable."));
        } else {
            Quotation quotation = booking.getQuotation();
            if (quotation == null || quotation.getStatus() != com.blissbeyond.entity.QuotationStatus.ACCEPTED
                || quotation.getTotal() == null) {
                throw new IllegalArgumentException("Payment is available only for an accepted quotation.");
            }
            total = quotation.getTotal();
        }
        BigDecimal paid = paymentRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream()
            .filter(payment -> payment.getPaymentStatus() == PaymentStatus.PAID)
            .map(Payment::getAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.subtract(paid).max(BigDecimal.ZERO);
    }

    private boolean isAllowedTransition(BookingStatus currentStatus, BookingStatus targetStatus) {
        if (currentStatus == null || targetStatus == null) {
            return false;
        }

        return switch (currentStatus) {
            case PENDING -> targetStatus == BookingStatus.AWAITING_DEPOSIT || targetStatus == BookingStatus.CANCELLED;
            case AWAITING_DEPOSIT -> targetStatus == BookingStatus.CONFIRMED || targetStatus == BookingStatus.CANCELLED;
            case CONFIRMED -> targetStatus == BookingStatus.CANCELLED || targetStatus == BookingStatus.COMPLETED;
            case CANCELLED -> false;
            case COMPLETED -> false;
        };
    }

    private String buildTransitionErrorMessage(BookingStatus currentStatus, BookingStatus targetStatus) {
        if (currentStatus == null) {
            return "Booking status is missing.";
        }
        if (targetStatus == null) {
            return "Target booking status is missing.";
        }

        if (currentStatus == BookingStatus.CANCELLED && targetStatus == BookingStatus.AWAITING_DEPOSIT) {
            return "Cannot approve a cancelled booking.";
        }
        if (currentStatus == BookingStatus.CANCELLED && targetStatus == BookingStatus.COMPLETED) {
            return "Cannot complete a cancelled booking.";
        }
        if (currentStatus == BookingStatus.COMPLETED && targetStatus == BookingStatus.CANCELLED) {
            return "Cannot cancel a completed booking.";
        }
        if (currentStatus == BookingStatus.COMPLETED && targetStatus == BookingStatus.CONFIRMED) {
            return "Cannot confirm a completed booking.";
        }
        if (currentStatus == BookingStatus.PENDING && targetStatus == BookingStatus.COMPLETED) {
            return "Only confirmed bookings can be completed.";
        }
        if (currentStatus == BookingStatus.AWAITING_DEPOSIT && targetStatus == BookingStatus.COMPLETED) {
            return "Only confirmed bookings can be completed.";
        }

        return "Cannot change booking status from " + currentStatus + " to " + targetStatus + ".";
    }

    public Booking requireOwnedBooking(Long id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        User current = currentUserService.requireCurrentUser();
        if (!booking.getCustomer().getId().equals(current.getId())) {
            throw new ForbiddenActionException("You cannot access this booking");
        }
        return booking;
    }

    private CustomerBookingSummaryResponse toSummaryResponse(Booking booking) {
        Event event = booking.getEvent();
        Venue venue = event != null ? event.getVenue() : null;
        return new CustomerBookingSummaryResponse(
            booking.getId(),
            formatBookingRef(booking.getId()),
            booking.getStatus() != null ? booking.getStatus().name() : null,
            booking.getCreatedAt(),
            event != null ? event.getEventType() : null,
            venue != null ? venue.getId() : booking.getVenueId(),
            venue != null ? venue.getName() : null,
            booking.getEventDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            event != null ? event.getGuestCount() : null,
            resolveEstimatedTotal(booking),
            booking.getBookingType() == null ? BookingType.CUSTOM.name() : booking.getBookingType().name(),
            booking.getEventPackage() != null ? booking.getEventPackage().getId() : null,
            packageSnapshot(booking) != null ? packageSnapshot(booking).getPackageName() : null,
            packageSnapshot(booking) != null ? packageSnapshot(booking).getFinalPrice() : null,
            latestPaymentStatus(booking), paidAmount(booking), remainingAmount(booking)
        );
    }

    private String latestPaymentStatus(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingIdOrderByIdAsc(booking.getId());
        if (payments.isEmpty()) return null;
        Payment payment = payments.get(payments.size() - 1);
        return payment.getPaymentStatus() == null ? null : payment.getPaymentStatus().name();
    }

    private BigDecimal paidAmount(Booking booking) {
        return paymentRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream()
            .filter(payment -> payment.getPaymentStatus() == com.blissbeyond.entity.PaymentStatus.PAID)
            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private AdminBookingSummaryResponse toAdminSummaryResponse(Booking booking) {
        Event event = booking.getEvent();
        Venue venue = event != null ? event.getVenue() : null;
        User customer = booking.getCustomer();
        Quotation quotation = booking.getQuotation();
        String customerName = customer == null
            ? null
            : (customer.getFirstName() + " " + customer.getLastName()).trim();

        return new AdminBookingSummaryResponse(
            booking.getId(),
            formatBookingRef(booking.getId()),
            booking.getStatus() != null ? booking.getStatus().name() : null,
            customer != null ? customer.getId() : null,
            customerName,
            customer != null ? customer.getEmail() : null,
            event != null ? event.getId() : null,
            event != null ? event.getEventType() : null,
            venue != null ? venue.getId() : booking.getVenueId(),
            venue != null ? venue.getName() : null,
            booking.getEventDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            event != null ? event.getGuestCount() : null,
            resolveEstimatedTotal(booking),
            quotation != null ? quotation.getId() : null,
            quotation != null && quotation.getStatus() != null ? quotation.getStatus().name() : null,
            booking.getBookingType().name(),
            booking.getEventPackage() != null ? booking.getEventPackage().getId() : null,
            booking.getEventPackage() != null ? booking.getEventPackage().getName() : null,
            packageSnapshot(booking) != null ? packageSnapshot(booking).getFinalPrice() : null,
            latestPaymentStatus(booking), paidAmount(booking), booking.getCreatedAt()
        );
    }

    private CustomerBookingDetailResponse toDetailResponse(Booking booking) {
        Event event = booking.getEvent();
        Venue venue = event != null ? event.getVenue() : null;
        List<EventService> eventServices = event != null ? eventServiceRepository.findByEventId(event.getId()) : List.of();
        List<CustomerBookingDetailResponse.BookingServiceItem> services = new ArrayList<>();
        CustomerBookingDetailResponse.BookingCateringDetail catering = null;

        for (EventService eventService : eventServices) {
            if (!eventService.isSelected()) continue;
            ServiceEntity service = eventService.getService();
            JsonNode customization = readCustomization(eventService);
            CustomerBookingDetailResponse.BookingServiceItem serviceItem = new CustomerBookingDetailResponse.BookingServiceItem(
                service != null ? service.getId() : null,
                eventService.getServiceNameSnapshot() != null ? eventService.getServiceNameSnapshot() : (service != null ? service.getName() : null),
                eventService.getEstimatedTotal(),
                eventService.isSelected(),
                customization
            );
            services.add(serviceItem);

            if (service != null && service.getId() != null && service.getId() == 1L) {
                catering = new CustomerBookingDetailResponse.BookingCateringDetail(
                    service.getId(),
                    eventService.getServiceNameSnapshot() != null ? eventService.getServiceNameSnapshot() : service.getName(),
                    eventService.getEstimatedTotal(),
                    customization,
                    mapMenuSelections(event)
                );
            }
        }

        return new CustomerBookingDetailResponse(
            booking.getId(),
            formatBookingRef(booking.getId()),
            booking.getStatus() != null ? booking.getStatus().name() : null,
            booking.getCreatedAt(),
            booking.getConfirmedAt(),
            new CustomerBookingDetailResponse.BookingEvent(
                event != null ? event.getId() : null,
                event != null ? event.getEventType() : null,
                event != null ? event.getGuestCount() : null,
                event != null ? event.getSpecialRequirements() : null
            ),
            new CustomerBookingDetailResponse.BookingVenue(
                venue != null ? venue.getId() : booking.getVenueId(),
                venue != null ? venue.getName() : null,
                venue != null ? venue.getLocation() : null,
                venue != null ? venue.getPrice() : null
            ),
            booking.getEventDate(),
            booking.getStartTime(),
            booking.getEndTime(),
            services,
            catering,
            resolveEstimatedTotal(booking),
            booking.getQuotation() != null ? booking.getQuotation().getId() : null,
            booking.getBookingType() == null ? BookingType.CUSTOM.name() : booking.getBookingType().name(),
            booking.getEventPackage() != null ? booking.getEventPackage().getId() : null,
            packageSnapshot(booking) != null ? packageSnapshot(booking).getPackageSlug() : null,
            packageSnapshot(booking) != null ? packageSnapshot(booking).getPackageName() : null,
            packageInclusions(booking),
            packageSnapshot(booking) != null ? packageSnapshot(booking).getFinalPrice() : null,
            paymentSummary(booking), quotationSummary(booking), consultationSummaries(booking)
        );
    }

    private CustomerBookingDetailResponse.PaymentSummary paymentSummary(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingIdOrderByIdAsc(booking.getId());
        BigDecimal total = paymentAuthoritativeTotal(booking);
        BigDecimal paid = payments.stream().filter(item -> item.getPaymentStatus() == PaymentStatus.PAID)
            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        Payment latest = payments.isEmpty() ? null : payments.get(payments.size() - 1);
        return new CustomerBookingDetailResponse.PaymentSummary(
            latest == null || latest.getPaymentStatus() == null ? null : latest.getPaymentStatus().name(),
            total, paid, total.subtract(paid).max(BigDecimal.ZERO));
    }

    private BigDecimal paymentAuthoritativeTotal(Booking booking) {
        if (booking.getBookingType() == BookingType.PACKAGE) {
            return packageBookingSnapshotRepository.findByBookingId(booking.getId())
                .map(PackageBookingSnapshot::getFinalPrice)
                .orElseThrow(() -> new IllegalArgumentException("Historical package price is unavailable."));
        }
        Quotation quotation = booking.getQuotation();
        if (quotation != null && quotation.getStatus() == QuotationStatus.ACCEPTED && quotation.getTotal() != null) {
            return quotation.getTotal();
        }
        return BigDecimal.ZERO;
    }

    private CustomerBookingDetailResponse.QuotationSummary quotationSummary(Booking booking) {
        Quotation quotation = booking.getQuotation();
        return quotation == null ? null : new CustomerBookingDetailResponse.QuotationSummary(
            quotation.getId(), quotation.getStatus() == null ? null : quotation.getStatus().name(),
            quotation.getSubtotal(), quotation.getTotal(), quotation.getExpiresAt());
    }

    private List<CustomerBookingDetailResponse.ConsultationSummary> consultationSummaries(Booking booking) {
        if (booking.getCustomer() == null) return List.of();
        return consultationRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId()).stream()
            .map(item -> new CustomerBookingDetailResponse.ConsultationSummary(
                item.getId(), item.getStatus() == null ? null : item.getStatus().name(), item.getConsultationDate(),
                item.getStartTime(), item.getEndTime(), item.getConsultationType(), item.getPlanner()))
            .toList();
    }

    private BigDecimal remainingAmount(Booking booking) {
        return resolveEstimatedTotal(booking).subtract(paidAmount(booking)).max(BigDecimal.ZERO);
    }

    private JsonNode readCustomization(EventService eventService) {
        String payload = null;
        List<ServiceCustomization> customizations = serviceCustomizationRepository.findByEventServiceId(eventService.getId());
        if (!customizations.isEmpty()) {
            payload = customizations.get(0).getPayloadJson();
        }
        if ((payload == null || payload.isBlank()) && eventService.getCustomizationJson() != null) {
            payload = eventService.getCustomizationJson();
        }

        if (payload == null || payload.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("_raw", payload);
        }
    }

    private List<CustomerBookingDetailResponse.BookingMenuSelection> mapMenuSelections(Event event) {
        if (event == null) {
            return List.of();
        }

        return menuSelectionRepository.findByEventId(event.getId()).stream()
            .map(selection -> new CustomerBookingDetailResponse.BookingMenuSelection(
                selection.getFood() != null ? selection.getFood().getId() : null,
                selection.getFood() != null ? selection.getFood().getName() : null,
                selection.getQuantity(),
                selection.getEstimatedTotal()
            ))
            .toList();
    }

    private BigDecimal resolveEstimatedTotal(Booking booking) {
        if (booking.getQuotation() != null && booking.getQuotation().getTotal() != null) {
            return booking.getQuotation().getTotal();
        }

        PackageBookingSnapshot snapshot = packageSnapshot(booking);
        if (snapshot != null && snapshot.getFinalPrice() != null) {
            return snapshot.getFinalPrice();
        }

        Event event = booking.getEvent();
        if (event == null) {
            return BigDecimal.ZERO;
        }

        return eventServiceRepository.findByEventId(event.getId()).stream()
            .map(EventService::getEstimatedTotal)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private PackageBookingSnapshot packageSnapshot(Booking booking) {
        return booking.getBookingType() == BookingType.PACKAGE && booking.getId() != null
            ? packageBookingSnapshotRepository.findByBookingId(booking.getId()).orElse(null)
            : null;
    }

    private JsonNode packageInclusions(Booking booking) {
        PackageBookingSnapshot snapshot = packageSnapshot(booking);
        if (snapshot == null || snapshot.getInclusionsJson() == null) {
            return null;
        }
        try {
            return objectMapper.readTree(snapshot.getInclusionsJson());
        } catch (Exception ex) {
            return objectMapper.createArrayNode();
        }
    }

    private String formatBookingRef(Long id) {
        if (id == null) {
            return null;
        }
        return String.format("BK-%04d", id);
    }
}
