package com.blissbeyond.service;

import com.blissbeyond.dto.booking.BookingServiceSelectionRequest;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.DiningStyle;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.EventService;
import com.blissbeyond.entity.Food;
import com.blissbeyond.entity.MenuSelection;
import com.blissbeyond.entity.ServiceEntity;
import com.blissbeyond.entity.User;
import com.blissbeyond.repository.AddOnRepository;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.ConsultationRepository;
import com.blissbeyond.repository.DiningStyleRepository;
import com.blissbeyond.repository.EventRepository;
import com.blissbeyond.repository.EventServiceRepository;
import com.blissbeyond.repository.FoodRepository;
import com.blissbeyond.repository.MenuSelectionRepository;
import com.blissbeyond.repository.PackageBookingSnapshotRepository;
import com.blissbeyond.repository.PaymentRepository;
import com.blissbeyond.repository.ServiceCustomizationRepository;
import com.blissbeyond.repository.ServiceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceCateringTest {
    @Mock BookingRepository bookingRepository;
    @Mock EventRepository eventRepository;
    @Mock CurrentUserService currentUserService;
    @Mock ServiceRepository serviceRepository;
    @Mock EventServiceRepository eventServiceRepository;
    @Mock ServiceCustomizationRepository serviceCustomizationRepository;
    @Mock MenuSelectionRepository menuSelectionRepository;
    @Mock FoodRepository foodRepository;
    @Mock DiningStyleRepository diningStyleRepository;
    @Mock AddOnRepository addOnRepository;
    @Mock VenueService venueService;
    @Mock PackageBookingSnapshotRepository packageBookingSnapshotRepository;
    @Mock NotificationService notificationService;
    @Mock PaymentRepository paymentRepository;
    @Mock ConsultationRepository consultationRepository;

    private final ObjectMapper mapper = new ObjectMapper();
    private BookingService service;
    private User customer;

    @BeforeEach
    void setUp() {
        service = new BookingService(
            bookingRepository, eventRepository, currentUserService, serviceRepository,
            eventServiceRepository, serviceCustomizationRepository, menuSelectionRepository,
            foodRepository, diningStyleRepository, addOnRepository, mapper, venueService,
            packageBookingSnapshotRepository, notificationService, paymentRepository,
            consultationRepository, new CustomizeServicePricing()
        );

        customer = new User();
        customer.setId(7L);
        customer.setFirstName("Test");
        customer.setLastName("Customer");
        when(currentUserService.requireCurrentUser()).thenReturn(customer);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(20L);
            return booking;
        });
        when(eventServiceRepository.findByEventId(any())).thenReturn(List.of());
        org.mockito.Mockito.lenient().when(eventServiceRepository.save(any(EventService.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ServiceEntity catering = new ServiceEntity();
        catering.setId(1L);
        catering.setName("Catering");
        catering.setAvailable(true);
        when(serviceRepository.findByNameIgnoreCase("Catering")).thenReturn(Optional.of(catering));

        DiningStyle style = new DiningStyle();
        style.setId(1L);
        style.setName("Buffet");
        style.setPricePerGuest(new BigDecimal("5000"));
        style.setAvailable(true);
        when(diningStyleRepository.findById(1L)).thenReturn(Optional.of(style));
    }

    @Test
    void includesAuthoritativeFoodPriceAndIgnoresSubmittedTotals() throws Exception {
        Food food = food(10L, "1000");
        when(foodRepository.findById(10L)).thenReturn(Optional.of(food));

        createBooking(10, mapper.readTree("""
            {"guestCount":10,"estimatedTotal":1,
             "style":{"backendDiningStyleId":1,"pricePerGuest":1},
             "foods":[{"backendFoodId":10,"pricePerGuest":1,"quantity":999}],"addons":[]}
            """));

        ArgumentCaptor<EventService> serviceCaptor = ArgumentCaptor.forClass(EventService.class);
        verify(eventServiceRepository).save(serviceCaptor.capture());
        assertEquals(new BigDecimal("60000"), serviceCaptor.getValue().getEstimatedTotal());

        ArgumentCaptor<MenuSelection> menuCaptor = ArgumentCaptor.forClass(MenuSelection.class);
        verify(menuSelectionRepository).save(menuCaptor.capture());
        assertEquals(10, menuCaptor.getValue().getQuantity());
        assertEquals(new BigDecimal("10000"), menuCaptor.getValue().getEstimatedTotal());
    }

    @Test
    void recalculatesPerGuestFoodAndDiningPricesWhenGuestCountChanges() throws Exception {
        when(foodRepository.findById(10L)).thenReturn(Optional.of(food(10L, "1000")));

        createBooking(20, mapper.readTree("""
            {"guestCount":20,"style":{"backendDiningStyleId":1},
             "foods":[{"backendFoodId":10}],"addons":[]}
            """));

        ArgumentCaptor<EventService> captor = ArgumentCaptor.forClass(EventService.class);
        verify(eventServiceRepository).save(captor.capture());
        assertEquals(new BigDecimal("120000"), captor.getValue().getEstimatedTotal());
    }

    @Test
    void rejectsUnknownFoodId() throws Exception {
        when(foodRepository.findById(999L)).thenReturn(Optional.empty());
        JsonNode payload = mapper.readTree("""
            {"guestCount":10,"style":{"backendDiningStyleId":1},
             "foods":[{"backendFoodId":999}],"addons":[]}
            """);

        assertThrows(IllegalArgumentException.class, () -> createBooking(10, payload));
    }

    @Test
    void rejectsDuplicateFoodId() throws Exception {
        when(foodRepository.findById(10L)).thenReturn(Optional.of(food(10L, "1000")));
        JsonNode payload = mapper.readTree("""
            {"guestCount":10,"style":{"backendDiningStyleId":1},
             "foods":[{"backendFoodId":10},{"backendFoodId":10}],"addons":[]}
            """);

        assertThrows(IllegalArgumentException.class, () -> createBooking(10, payload));
    }

    private Booking createBooking(int guestCount, JsonNode customization) {
        Event event = new Event();
        event.setId(30L);
        event.setCustomer(customer);
        event.setEventType("Wedding");
        event.setEventDate(LocalDate.now().plusMonths(2));
        event.setGuestCount(guestCount);

        return service.create(event, null, LocalTime.of(10, 0), LocalTime.of(12, 0), List.of(
            new BookingServiceSelectionRequest(1L, "catering", BigDecimal.ONE, customization)
        ));
    }

    private Food food(long id, String pricePerGuest) {
        Food food = new Food();
        food.setId(id);
        food.setName("Test Food");
        food.setPricePerGuest(new BigDecimal(pricePerGuest));
        food.setAvailable(true);
        return food;
    }
}
