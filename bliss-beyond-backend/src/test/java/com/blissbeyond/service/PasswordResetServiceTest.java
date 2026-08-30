package com.blissbeyond.service;

import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpRequest;
import com.blissbeyond.dto.auth.ForgotPasswordResetRequest;
import com.blissbeyond.dto.auth.ForgotPasswordVerifyOtpRequest;
import com.blissbeyond.entity.PasswordResetRequest;
import com.blissbeyond.entity.Role;
import com.blissbeyond.entity.RoleName;
import com.blissbeyond.entity.User;
import com.blissbeyond.repository.PasswordResetRequestRepository;
import com.blissbeyond.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PasswordResetServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetRequestRepository passwordResetRequestRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Map<String, User> usersByEmail = new HashMap<>();
    private final List<PasswordResetRequest> requests = new ArrayList<>();
    private final CapturingMailService mailService = new CapturingMailService();

    private PasswordResetService service;
    private long nextRequestId = 1L;

    @BeforeEach
    void setUp() {
        PasswordResetRequestDeliveryService deliveryService = new PasswordResetRequestDeliveryService(
            passwordResetRequestRepository,
            passwordEncoder,
            mailService
        );
        service = new PasswordResetService(
            userRepository,
            passwordResetRequestRepository,
            passwordEncoder,
            mailService,
            new AuthenticationThrottleService(),
            deliveryService
        );

        when(userRepository.findByEmail(anyString())).thenAnswer(invocation ->
            Optional.ofNullable(usersByEmail.get(((String) invocation.getArgument(0)).toLowerCase()))
        );

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            usersByEmail.put(user.getEmail().toLowerCase(), user);
            return user;
        });
        when(userRepository.incrementSecurityVersion(any())).thenReturn(1);

        when(passwordResetRequestRepository.findByEmailAndInvalidatedAtIsNullAndUsedAtIsNullOrderByCreatedAtDesc(anyString()))
            .thenAnswer(invocation -> {
                String email = ((String) invocation.getArgument(0)).toLowerCase();
                return requests.stream()
                    .filter(item -> email.equals(item.getEmail()))
                    .filter(item -> item.getInvalidatedAt() == null)
                    .filter(item -> item.getUsedAt() == null)
                    .sorted(Comparator.comparing(PasswordResetRequest::getCreatedAt).reversed())
                    .toList();
            });

        when(passwordResetRequestRepository.findByResetTokenHashAndInvalidatedAtIsNullAndUsedAtIsNull(anyString()))
            .thenAnswer(invocation -> {
                String hash = (String) invocation.getArgument(0);
                return requests.stream()
                    .filter(item -> hash.equals(item.getResetTokenHash()))
                    .filter(item -> item.getInvalidatedAt() == null)
                    .filter(item -> item.getUsedAt() == null)
                    .findFirst();
            });

        doAnswer(invocation -> {
            PasswordResetRequest request = invocation.getArgument(0);
            if (request.getId() == null) {
                request.setId(nextRequestId++);
            }
            LocalDateTime now = LocalDateTime.now();
            if (request.getCreatedAt() == null) {
                setField(request, "createdAt", now);
            }
            setField(request, "updatedAt", now);
            requests.removeIf(item -> item.getId().equals(request.getId()));
            requests.add(request);
            return request;
        }).when(passwordResetRequestRepository).save(any(PasswordResetRequest.class));

        doAnswer(invocation -> {
            Iterable<PasswordResetRequest> items = invocation.getArgument(0);
            for (PasswordResetRequest request : items) {
                passwordResetRequestRepository.save(request);
            }
            return null;
        }).when(passwordResetRequestRepository).saveAll(any());
    }

    @Test
    void requestOtpUsesGenericResponseForKnownAndUnknownEmails() {
        User user = createUser("maya@bliss.test", "OldPass1!");
        usersByEmail.put(user.getEmail(), user);

        var known = service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));
        String firstOtp = mailService.lastOtp;

        var unknown = service.requestOtp(new ForgotPasswordRequestOtpRequest("missing@example.com"));

        assertEquals("If an account exists for that email, password reset instructions will be sent.", known.message());
        assertEquals("If an account exists for that email, password reset instructions will be sent.", unknown.message());
        assertEquals(1, mailService.sendCount);
        assertEquals("maya@bliss.test", mailService.lastEmail);
        assertNotNull(firstOtp);
    }

    @Test
    void verifyOtpProducesResetTokenAndResetPasswordWorks() {
        User user = createUser("maya@bliss.test", "OldPass1!");
        usersByEmail.put(user.getEmail(), user);

        service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));
        String otp = mailService.lastOtp;

        var verifyResponse = service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", otp));
        assertNotNull(verifyResponse.resetToken());
        assertNotNull(verifyResponse.resetTokenExpiresAt());

        var resetResponse = service.resetPassword(new ForgotPasswordResetRequest(
            "maya@bliss.test",
            verifyResponse.resetToken(),
            "NewPass1!",
            "NewPass1!"
        ));

        assertEquals("Password updated successfully.", resetResponse.message());
        assertTrue(passwordEncoder.matches("NewPass1!", usersByEmail.get("maya@bliss.test").getPassword()));
    }

    @Test
    void wrongOtpLocksAfterFiveAttempts() {
        User user = createUser("maya@bliss.test", "OldPass1!");
        usersByEmail.put(user.getEmail(), user);

        service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));

        for (int i = 0; i < 4; i++) {
            assertThrows(RuntimeException.class, () ->
                service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", "000000")));
        }

        RuntimeException locked = assertThrows(RuntimeException.class, () ->
            service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", "000000")));
        assertTrue(locked.getMessage().toLowerCase().contains("locked"));
    }

    @Test
    void resendInvalidatesOldOtp() {
        User user = createUser("maya@bliss.test", "OldPass1!");
        usersByEmail.put(user.getEmail(), user);

        service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));
        String firstOtp = mailService.lastOtp;

        service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));
        String secondOtp = mailService.lastOtp;

        assertThrows(RuntimeException.class, () ->
            service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", firstOtp)));
        assertDoesNotThrow(() ->
            service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", secondOtp)));
    }

    @Test
    void resetRejectsTokenReuseAndPasswordMismatch() {
        User user = createUser("maya@bliss.test", "OldPass1!");
        usersByEmail.put(user.getEmail(), user);

        service.requestOtp(new ForgotPasswordRequestOtpRequest("maya@bliss.test"));
        String otp = mailService.lastOtp;
        var verifyResponse = service.verifyOtp(new ForgotPasswordVerifyOtpRequest("maya@bliss.test", otp));

        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(new ForgotPasswordResetRequest(
            "maya@bliss.test",
            verifyResponse.resetToken(),
            "NewPass1!",
            "Mismatch1!"
        )));

        service.resetPassword(new ForgotPasswordResetRequest(
            "maya@bliss.test",
            verifyResponse.resetToken(),
            "NewPass1!",
            "NewPass1!"
        ));

        assertThrows(RuntimeException.class, () -> service.resetPassword(new ForgotPasswordResetRequest(
            "maya@bliss.test",
            verifyResponse.resetToken(),
            "Another1!",
            "Another1!"
        )));
    }

    private User createUser(String email, String password) {
        User user = new User();
        user.setEmail(email.toLowerCase());
        user.setFirstName("Maya");
        user.setLastName("Fernando");
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRoles(new java.util.HashSet<>(java.util.Set.of(new Role(RoleName.ROLE_CUSTOMER))));
        return user;
    }

    private void setField(PasswordResetRequest request, String field, LocalDateTime value) {
        switch (field) {
            case "createdAt" -> {
                try {
                    var declaredField = PasswordResetRequest.class.getDeclaredField("createdAt");
                    declaredField.setAccessible(true);
                    declaredField.set(request, value);
                } catch (ReflectiveOperationException ex) {
                    throw new IllegalStateException(ex);
                }
            }
            case "updatedAt" -> {
                try {
                    var declaredField = PasswordResetRequest.class.getDeclaredField("updatedAt");
                    declaredField.setAccessible(true);
                    declaredField.set(request, value);
                } catch (ReflectiveOperationException ex) {
                    throw new IllegalStateException(ex);
                }
            }
            default -> throw new IllegalArgumentException("Unsupported field: " + field);
        }
    }

    private static final class CapturingMailService extends PasswordResetEmailService {
        private String lastEmail = "";
        private String lastOtp = "";
        private int sendCount = 0;

        CapturingMailService() {
            super(new NoOpMailSender(), "sender@bliss.test", "smtp.bliss.test", 587,
                "sender@bliss.test", "test-only-password", true);
        }

        @Override
        public void sendOtp(String email, String otp) {
            this.lastEmail = email;
            this.lastOtp = otp;
            this.sendCount++;
        }
    }

    private static final class NoOpMailSender implements JavaMailSender {
        @Override
        public MimeMessage createMimeMessage() {
            return null;
        }

        @Override
        public MimeMessage createMimeMessage(java.io.InputStream contentStream) {
            return null;
        }

        @Override
        public void send(MimeMessage mimeMessage) {
        }

        @Override
        public void send(MimeMessage... mimeMessages) {
        }

        @Override
        public void send(SimpleMailMessage simpleMessage) {
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) {
        }
    }
}
