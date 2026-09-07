package com.blissbeyond.service;

import com.blissbeyond.dto.admin.AdminPaymentAccountRequest;
import com.blissbeyond.dto.admin.AdminPaymentAccountResponse;
import com.blissbeyond.dto.payment.PaymentAccountResponse;
import com.blissbeyond.entity.PaymentAccount;
import com.blissbeyond.exception.DuplicateResourceException;
import com.blissbeyond.exception.ResourceNotFoundException;
import com.blissbeyond.repository.PaymentAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class PaymentAccountService {
    public static final Set<String> SUPPORTED_METHODS = Set.of(
        "BANK_TRANSFER", "KBZ_BANK", "AYA_BANK", "CB_BANK", "KBZPAY", "WAVEPAY", "CASH"
    );
    private static final Set<String> ADMIN_CREATABLE_METHODS = Set.of(
        "KBZ_BANK", "AYA_BANK", "CB_BANK", "KBZPAY", "WAVEPAY", "CASH"
    );

    private final PaymentAccountRepository repository;

    public PaymentAccountService(PaymentAccountRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PaymentAccountResponse> listAvailable() {
        return repository.findByAvailableTrueOrderByDisplayOrderAscIdAsc().stream()
            .map(this::toCustomerResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminPaymentAccountResponse> listAdmin() {
        return repository.findAllByOrderByDisplayOrderAscIdAsc().stream()
            .map(this::toAdminResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public PaymentAccount requireAvailable(Long id) {
        PaymentAccount account = require(id);
        if (!account.isAvailable()) {
            throw new IllegalArgumentException("This payment destination is no longer available. Please choose another destination.");
        }
        return account;
    }

    @Transactional
    public AdminPaymentAccountResponse create(AdminPaymentAccountRequest request) {
        String key = request.accountKey().trim();
        if (repository.findByAccountKeyIgnoreCase(key).isPresent()) {
            throw new DuplicateResourceException("A payment destination with this key already exists.");
        }
        return toAdminResponse(repository.save(apply(new PaymentAccount(), request, key)));
    }

    @Transactional
    public AdminPaymentAccountResponse update(Long id, AdminPaymentAccountRequest request) {
        PaymentAccount account = require(id);
        String key = request.accountKey().trim();
        repository.findByAccountKeyIgnoreCase(key)
            .filter(other -> !other.getId().equals(id))
            .ifPresent(other -> {
                throw new DuplicateResourceException("A payment destination with this key already exists.");
            });
        return toAdminResponse(repository.save(apply(account, request, key)));
    }

    @Transactional
    public AdminPaymentAccountResponse setAvailable(Long id, boolean available) {
        PaymentAccount account = require(id);
        account.setAvailable(available);
        return toAdminResponse(repository.save(account));
    }

    private PaymentAccount apply(PaymentAccount account, AdminPaymentAccountRequest request, String key) {
        String method = normalizeMethod(request.paymentMethod());
        if (!ADMIN_CREATABLE_METHODS.contains(method)) {
            throw new IllegalArgumentException("Choose a supported payment method.");
        }
        String accountName = trimToNull(request.accountName());
        String accountNumber = trimToNull(request.accountNumber());
        String instructions = trimToNull(request.instructions());
        if (!"CASH".equals(method) && (accountName == null || accountNumber == null)) {
            throw new IllegalArgumentException("Electronic payment destinations require an account name and account number.");
        }
        if ("CASH".equals(method) && instructions == null) {
            throw new IllegalArgumentException("Cash payment destinations require payment instructions.");
        }
        account.setAccountKey(key);
        account.setPaymentMethod(method);
        account.setProviderName(request.providerName().trim());
        account.setAccountName(accountName);
        account.setAccountNumber(accountNumber);
        account.setInstructions(instructions);
        account.setAvailable(request.available());
        account.setDisplayOrder(request.displayOrder());
        return account;
    }

    private PaymentAccount require(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Payment destination not found."));
    }

    private String normalizeMethod(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private PaymentAccountResponse toCustomerResponse(PaymentAccount account) {
        return new PaymentAccountResponse(account.getId(), account.getPaymentMethod(), account.getProviderName(),
            account.getAccountName(), account.getAccountNumber(), account.getInstructions());
    }

    private AdminPaymentAccountResponse toAdminResponse(PaymentAccount account) {
        return new AdminPaymentAccountResponse(account.getId(), account.getAccountKey(), account.getPaymentMethod(),
            account.getProviderName(), account.getAccountName(), account.getAccountNumber(), account.getInstructions(),
            account.isAvailable(), account.getDisplayOrder(), account.getCreatedAt(), account.getUpdatedAt());
    }
}
