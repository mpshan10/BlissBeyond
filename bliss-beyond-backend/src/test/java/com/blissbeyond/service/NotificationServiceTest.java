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
        when(notificationRepository.existsByRecipientIdAndDedupeKey(anyLong(), anyString())).thenReturn(false);

        service.notifyAdmins(customer, "BOOKING_CREATED", "New Booking Request", "A booking was submitted.",
            "BOOKING", 42L, "/prototype/admin/bookings.html", "BOOKING_CREATED:42");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).save(captor.capture());
        assertEquals(List.of(20L, 21L), captor.getAllValues().stream()
            .map(item -> item.getRecipient().getId()).toList());
        assertEquals(2, captor.getAllValues().stream().map(Notification::getDedupeKey).distinct().count());
    }

    @Test
    void duplicateEventForSameRecipientIsIgnored() {
        when(notificationRepository.existsByRecipientIdAndDedupeKey(anyLong(), anyString())).thenReturn(true);

        service.notifyOnce(customer, adminA, "BOOKING_CONFIRMED", "Booking Confirmed", "Confirmed.",
            "BOOKING", 42L, "/prototype/customer/booking-status.html?id=42", "BOOKING_CONFIRMED:42");

        verify(notificationRepository, never()).save(any(Notification.class));
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
    void markAllReadOnlyLoadsTheAuthenticatedRecipientStream() {
        when(currentUserService.requireCurrentUser()).thenReturn(adminA);
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(20L)).thenReturn(List.of());

        service.markAllRead();

        verify(notificationRepository).findByRecipientIdOrderByCreatedAtDesc(20L);
        verify(notificationRepository).saveAll(List.of());
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
