package com.blissbeyond.service;

import com.blissbeyond.entity.Notification;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.repository.NotificationRepository;
import com.blissbeyond.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock CurrentUserService currentUserService;

    private NotificationService service;
    private User customer;
    private User adminA;
    private User adminB;

    @BeforeEach
    void setUp() {
        service = new NotificationService(notificationRepository, userRepository, currentUserService);
        customer = user(10L);
        adminA = user(20L);
        adminB = user(21L);
    }

    @Test
    void broadcastsOneIndependentNotificationPerAdmin() {
        when(userRepository.findDistinctByRolesName(RoleName.ROLE_ADMIN)).thenReturn(List.of(adminA, adminB));
        service.notifyAdmins(customer, "BOOKING_CREATED", "New Booking Request", "A booking was submitted.",
            "BOOKING", 42L, "/prototype/admin/bookings.html", "BOOKING_CREATED:42");

        ArgumentCaptor<Long> recipientCaptor = ArgumentCaptor.forClass(Long.class);
        verify(notificationRepository, times(2)).insertIfAbsent(recipientCaptor.capture(), eq(10L),
            eq("BOOKING_CREATED"), eq("New Booking Request"), eq("A booking was submitted."),
            eq("BOOKING"), eq(42L), eq("/prototype/admin/bookings.html"), anyString(), any());
        assertEquals(List.of(20L, 21L), recipientCaptor.getAllValues());
    }

    @Test
    void duplicateEventForSameRecipientIsIgnored() {
        service.notifyOnce(customer, adminA, "BOOKING_CONFIRMED", "Booking Confirmed", "Confirmed.",
            "BOOKING", 42L, "/prototype/customer/booking-status.html?id=42", "BOOKING_CONFIRMED:42");

        verify(notificationRepository).insertIfAbsent(eq(10L), eq(20L), eq("BOOKING_CONFIRMED"),
            eq("Booking Confirmed"), eq("Confirmed."), eq("BOOKING"), eq(42L),
            eq("/prototype/customer/booking-status.html?id=42"), anyString(), any());
    }

    @Test
    void markingReadUsesAuthenticatedRecipientOwnership() {
        Notification notification = new Notification();
        notification.setRecipient(customer);
        notification.setTitle("Booking Confirmed");
        notification.setMessage("Confirmed.");
        notification.setType("BOOKING_CONFIRMED");
        notification.setDedupeKey("a".repeat(64));
        when(currentUserService.requireCurrentUser()).thenReturn(customer);
        when(notificationRepository.findByIdAndRecipientId(5L, 10L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(notification)).thenReturn(notification);

        service.markRead(5L);

        verify(notificationRepository).findByIdAndRecipientId(5L, 10L);
        verify(notificationRepository).save(notification);
    }

    @Test
    void anotherUsersNotificationCannotBeMarkedRead() {
        when(currentUserService.requireCurrentUser()).thenReturn(customer);
        when(notificationRepository.findByIdAndRecipientId(9L, 10L)).thenReturn(Optional.empty());

        assertThrows(com.blissbeyond.exception.ResourceNotFoundException.class, () -> service.markRead(9L));
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void markAllReadUsesBulkUpdateForAuthenticatedRecipient() {
        when(currentUserService.requireCurrentUser()).thenReturn(adminA);
        when(notificationRepository.markAllUnreadAsRead(eq(20L), any())).thenReturn(3);

        assertEquals(3, service.markAllRead());

        verify(notificationRepository).markAllUnreadAsRead(eq(20L), any());
        verify(notificationRepository, never()).findByRecipientIdOrderByCreatedAtDesc(anyLong());
        verify(notificationRepository, never()).saveAll(any());
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
