package com.blissbeyond.controller;

import com.blissbeyond.dto.booking.BookingCreateRequest;
import com.blissbeyond.entity.Booking;
import com.blissbeyond.entity.Event;
import com.blissbeyond.entity.Quotation;
import com.blissbeyond.entity.User;
import com.blissbeyond.repository.BookingRepository;
import com.blissbeyond.repository.QuotationRepository;
import com.blissbeyond.service.BookingService;
import com.blissbeyond.service.EventService;
import com.blissbeyond.service.QuotationService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingControllerQuotationHandoffTest {
    @Test
    void createsAndAttachesServerDerivedDraftForCustomizeBooking() {
        BookingService bookingService = mock(BookingService.class);
        EventService eventService = mock(EventService.class);
        QuotationRepository quotationRepository = mock(QuotationRepository.class);
        BookingRepository bookingRepository = mock(BookingRepository.class);
        QuotationService quotationService = mock(QuotationService.class);
        BookingController controller = new BookingController(
            bookingService, eventService, quotationRepository, bookingRepository, quotationService
        );

        User customer = new User();
        customer.setId(7L);
        Event event = new Event();
        event.setId(30L);
        Booking booking = new Booking();
        booking.setId(20L);
        booking.setCustomer(customer);
        booking.setEvent(event);
        Quotation draft = new Quotation();
        draft.setId(40L);

        when(eventService.requireOwnedEvent(30L)).thenReturn(event);
        when(bookingService.create(any(), any(), any(), any(), any())).thenReturn(booking);
        when(quotationService.createDraft(event, BigDecimal.ZERO, BigDecimal.ZERO, null)).thenReturn(draft);
        when(bookingRepository.save(booking)).thenReturn(booking);

        var response = controller.create(new BookingCreateRequest(30L, null, "10:00", "12:00", List.of()));

        assertEquals(201, response.getStatusCode().value());
        assertSame(draft, booking.getQuotation());
        assertEquals(40L, response.getBody().quotationId());
        verify(quotationService).createDraft(event, BigDecimal.ZERO, BigDecimal.ZERO, null);
        verify(bookingRepository).save(booking);
    }
}
