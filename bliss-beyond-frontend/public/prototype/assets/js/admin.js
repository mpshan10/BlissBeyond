(function () {
  'use strict';

  const API_BASE = window.BB_API_BASE_URL;
  const ADMIN_ROLE = 'ROLE_ADMIN';
  const LOGIN_URL = '/prototype/login.html';
  const CUSTOMER_DASHBOARD_URL = '/prototype/customer/dashboard.html';
  const state = {
    bookings: [],
    query: '',
    status: 'ALL',
    pendingAction: null,
    payments: [],
    paymentQuery: '',
    paymentStatus: 'ALL',
    paymentType: 'ALL',
    pendingPayment: null,
    quotations: [],
    quotationQuery: '',
    quotationStatus: 'ALL',
    currentQuotation: null,
    customers: [],
    customerQuery: '',
    customerStatus: 'ALL',
    currentCustomer: null,
    pendingCustomerAction: null,
    services: [],
    serviceQuery: '',
    serviceAvailability: 'ALL',
    diningStyles: [],
    diningStyleQuery: '',
    diningStyleAvailability: 'ALL',
    addOns: [],
    addOnQuery: '',
    addOnBillingType: 'ALL',
    addOnAvailability: 'ALL',
    venues: [],
    venueQuery: '',
    venueType: 'ALL',
    venueAvailability: 'ALL',
    consultations: [],
    consultationQuery: '',
    consultationStatus: 'ALL',
    currentConsultation: null,
    pendingConsultationAction: null
  };

  function currentLocalPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function redirectToLogin() {
    const returnUrl = currentLocalPath();
    window.bbSetAuthReturnUrl?.(returnUrl);
    window.location.replace(`${LOGIN_URL}?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  function requireAdmin() {
    const auth = window.bbGetAuth?.();
    if (!auth?.token) {
      redirectToLogin();
      return false;
    }

    const roles = Array.isArray(auth.user?.roles) ? auth.user.roles : [];
    if (!roles.includes(ADMIN_ROLE)) {
      window.location.replace(CUSTOMER_DASHBOARD_URL);
      return false;
    }

    document.documentElement.classList.add('bb-admin-authorized');
    return true;
  }

  if (!requireAdmin()) return;

  function cleanDisplayText(value) {
    return String(value ?? '')
      .replaceAll('\u00e2\u0080\u0093', '-')
      .replaceAll('\u00e2\u0080\u0094', '-')
      .replaceAll('\u00e2\u0080\u0099', "'")
      .replaceAll('\u00c2\u00b7', ' | ')
      .replaceAll('\u00c3\u00a8', 'e')
      .replaceAll('\u00c3\u00a9', 'e');
  }

  function escapeHtml(value) {
    return cleanDisplayText(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Price on request';
    return `MMK ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)}`;
  }

  function formatDate(value) {
    if (!value) return 'Date not set';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function formatTime(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{2}):(\d{2})/);
    if (!match) return String(value);
    const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return 'Not paid';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function statusLabel(status) {
    return String(status || 'UNKNOWN').replaceAll('_', ' ');
  }

  function statusClass(status) {
    return {
      PENDING: 'pending',
      AWAITING_DEPOSIT: 'pending',
      PAID: 'confirmed',
      FAILED: 'cancelled',
      REFUNDED: 'cancelled',
      CONFIRMED: 'confirmed',
      SCHEDULED: 'confirmed',
      REQUESTED: 'pending',
      CANCELLED: 'cancelled',
      COMPLETED: 'completed'
    }[status] || 'pending';
  }

  async function adminFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: window.bbAuthHeaders?.({
        Accept: 'application/json',
        ...(options.headers || {})
      }) || options.headers
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      window.bbClearAuth?.();
      redirectToLogin();
      throw new Error('Your admin session has expired.');
    }
    if (response.status === 403) {
      window.location.replace(CUSTOMER_DASHBOARD_URL);
      throw new Error('Administrator access is required.');
    }
    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}.`);
    }
    return data;
  }

  function updateAdminIdentity() {
    const user = window.bbGetAuthUser?.();
    const label = user?.fullName || user?.email || 'Administrator';
    document.querySelectorAll('[data-admin-display], .bb-nav .dropdown .dropdown-toggle').forEach((element) => {
      element.textContent = `Admin - ${label}`;
    });
  }

  function initSignOut() {
    document.querySelectorAll('[data-admin-sign-out], a[href="/prototype/login.html"]').forEach((link) => {
      if (!link.hasAttribute('data-admin-sign-out')
          && !(link.textContent || '').trim().toLowerCase().includes('sign out')) return;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.bbClearAuth?.();
        window.bbClearAuthReturnUrl?.();
        window.location.replace(LOGIN_URL);
      });
    });
  }

  function setBookingMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-booking-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function updateBookingStats(bookings) {
    const count = (statuses) => bookings.filter((booking) => statuses.includes(booking.bookingStatus)).length;
    const values = {
      active: count(['PENDING', 'AWAITING_DEPOSIT', 'CONFIRMED']),
      pending: count(['PENDING']),
      completed: count(['COMPLETED']),
      cancelled: count(['CANCELLED'])
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-booking-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
    const summary = document.querySelector('[data-admin-booking-summary]');
    if (summary) {
      summary.textContent = `${bookings.length} total bookings | ${values.pending} pending approval`;
    }
  }

  function actionButtons(booking) {
    const id = escapeHtml(booking.bookingId);
    const buttons = [];
    if (booking.bookingStatus === 'PENDING') {
      buttons.push(`<button class="btn btn-gold btn-sm" type="button" data-booking-action="approve" data-booking-id="${id}">Approve</button>`);
    }
    if (booking.bookingStatus === 'CONFIRMED') {
      buttons.push(`<button class="btn btn-outline-forest btn-sm" type="button" data-booking-action="complete" data-booking-id="${id}">Complete</button>`);
    }
    if (['PENDING', 'AWAITING_DEPOSIT', 'CONFIRMED'].includes(booking.bookingStatus)) {
      buttons.push(`<button class="btn btn-outline-danger btn-sm" type="button" data-booking-action="cancel" data-booking-id="${id}">Cancel</button>`);
    }
    if (!buttons.length) return '<span class="booking-actions-empty">No actions</span>';
    return `<div class="booking-actions">${buttons.join('')}</div>`;
  }

  function renderBookings() {
    const tbody = document.querySelector('[data-admin-booking-rows]');
    if (!tbody) return;
    const query = state.query.toLowerCase();
    const filtered = state.bookings.filter((booking) => {
      const searchable = [
        booking.bookingReference,
        booking.customerName,
        booking.customerEmail,
        booking.venueName
      ].join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (state.status === 'ALL' || booking.bookingStatus === state.status);
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">No bookings found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((booking) => {
      const timeRange = [formatTime(booking.startTime), formatTime(booking.endTime)].filter(Boolean).join(' - ');
      const quotation = booking.quotationId
        ? `<div class="booking-quotation"><span class="booking-cell-secondary mt-0">Quotation #${escapeHtml(booking.quotationId)}</span>${booking.quotationStatus ? `<span class="status ${statusClass(booking.quotationStatus)}">${escapeHtml(statusLabel(booking.quotationStatus))}</span>` : ''}</div>`
        : '';
      const packageLine = String(booking.bookingType || '').toUpperCase() === 'PACKAGE'
        ? `<span class="booking-cell-secondary mt-0">PACKAGE · ${escapeHtml(booking.packageName || 'Package booking')}</span>`
        : '<span class="booking-cell-secondary mt-0">CUSTOM</span>';
      const formattedTotal = formatMoney(booking.estimatedTotal).replace(/^MMK\s*/, '');
      return `
        <tr>
          <td><span class="booking-cell-primary">${escapeHtml(booking.bookingReference || `BK-${booking.bookingId}`)}</span>${packageLine}${quotation}</td>
          <td><span class="booking-cell-primary">${escapeHtml(booking.customerName || 'Customer')}</span><span class="booking-cell-secondary booking-customer-email" title="${escapeHtml(booking.customerEmail || '')}">${escapeHtml(booking.customerEmail || '')}</span></td>
          <td><span>${escapeHtml(booking.eventType || 'Event')}</span><span class="booking-cell-secondary">Event #${escapeHtml(booking.eventId || '-')}</span></td>
          <td><span class="booking-venue">${escapeHtml(booking.venueName || 'Venue not set')}</span></td>
          <td><div class="booking-date-time"><span class="booking-date-line"><i class="bi bi-calendar3"></i>${escapeHtml(formatDate(booking.eventDate))}</span><span class="booking-time-line"><i class="bi bi-clock"></i>${escapeHtml(timeRange || 'Time not set')}</span></div></td>
          <td>${escapeHtml(booking.guestCount ?? '-')}</td>
          <td><span class="booking-total-currency">MMK</span><span class="booking-total-amount">${escapeHtml(formattedTotal)}</span></td>
          <td><span class="status ${statusClass(booking.bookingStatus)}">${escapeHtml(statusLabel(booking.bookingStatus))}</span></td>
          <td>${actionButtons(booking)}</td>
        </tr>`;
    }).join('');
  }

  async function loadBookings() {
    setBookingMessage('');
    const tbody = document.querySelector('[data-admin-booking-rows]');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Loading bookings...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/bookings', { method: 'GET' });
      state.bookings = Array.isArray(data) ? data : [];
      updateBookingStats(state.bookings);
      renderBookings();
    } catch (error) {
      setBookingMessage(error.message || 'Unable to load bookings.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Unable to load bookings.</td></tr>';
    }
  }

  function openActionConfirmation(action, bookingId) {
    const booking = state.bookings.find((item) => String(item.bookingId) === String(bookingId));
    if (!booking) return;
    const config = {
      approve: {
        title: 'Approve this booking?',
        body: 'This will move the booking to Awaiting Deposit.',
        button: 'Approve Booking',
        className: 'btn btn-gold'
      },
      cancel: {
        title: 'Cancel this booking?',
        body: 'The booking will remain in history with a Cancelled status.',
        button: 'Cancel Booking',
        className: 'btn btn-danger'
      },
      complete: {
        title: 'Complete this booking?',
        body: 'This will mark the confirmed booking as Completed.',
        button: 'Complete Booking',
        className: 'btn btn-forest'
      }
    }[action];
    if (!config) return;

    state.pendingAction = { action, bookingId };
    document.querySelector('[data-booking-action-title]').textContent = config.title;
    document.querySelector('[data-booking-action-body]').textContent = config.body;
    const confirmButton = document.querySelector('[data-booking-action-confirm]');
    confirmButton.textContent = config.button;
    confirmButton.className = config.className;
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingActionModal')).show();
  }

  async function performBookingAction() {
    if (!state.pendingAction) return;
    const { action, bookingId } = state.pendingAction;
    const button = document.querySelector('[data-booking-action-confirm]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Updating...';
    try {
      await adminFetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/${action}`, { method: 'PATCH' });
      window.bootstrap.Modal.getInstance(document.getElementById('bookingActionModal'))?.hide();
      await loadBookings();
      setBookingMessage('Booking status updated successfully.', 'success');
    } catch (error) {
      setBookingMessage(error.message || 'Unable to update this booking.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
      state.pendingAction = null;
    }
  }

  function initBookingsPage() {
    if (!document.querySelector('[data-admin-bookings-page]')) return;
    document.querySelector('[data-admin-booking-search]')?.addEventListener('input', (event) => {
      state.query = event.target.value.trim();
      renderBookings();
    });
    document.querySelector('[data-admin-booking-status-filter]')?.addEventListener('change', (event) => {
      state.status = event.target.value;
      renderBookings();
    });
    document.querySelector('[data-admin-booking-rows]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-booking-action]');
      if (button) openActionConfirmation(button.dataset.bookingAction, button.dataset.bookingId);
    });
    document.querySelector('[data-booking-action-confirm]')?.addEventListener('click', performBookingAction);
    loadBookings();
  }

  function setPaymentMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-payment-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function updatePaymentStats(payments) {
    const count = (status) => payments.filter((payment) => payment.paymentStatus === status).length;
    const paidTotal = payments
      .filter((payment) => payment.paymentStatus === 'PAID')
      .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const values = {
      total: payments.length,
      pending: count('PENDING'),
      paid: count('PAID')
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-payment-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
    const collected = document.querySelector('[data-admin-payment-collected]');
    if (collected) collected.textContent = formatMoney(paidTotal);
    const summary = document.querySelector('[data-admin-payment-summary]');
    if (summary) summary.textContent = `${payments.length} payments | ${values.pending} pending verification`;
  }

  function renderPayments() {
    const tbody = document.querySelector('[data-admin-payment-rows]');
    if (!tbody) return;
    const query = state.paymentQuery.toLowerCase();
    const filtered = state.payments.filter((payment) => {
      const searchable = [
        payment.paymentId,
        payment.bookingReference,
        payment.customerName,
        payment.customerEmail,
        payment.transactionReference
      ].join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (state.paymentStatus === 'ALL' || payment.paymentStatus === state.paymentStatus)
        && (state.paymentType === 'ALL' || payment.paymentType === state.paymentType);
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">No payments found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((payment) => {
      const method = [payment.paymentMethod, payment.transactionReference].filter(Boolean);
      const action = payment.paymentStatus === 'PENDING'
        ? `<button class="btn btn-gold btn-sm" type="button" data-payment-confirm data-payment-id="${escapeHtml(payment.paymentId)}">Confirm Payment</button>`
        : '<span class="small text-ink-soft">No actions</span>';
      return `
        <tr>
          <td><strong>PAY-${String(payment.paymentId).padStart(4, '0')}</strong><div class="small text-ink-soft">ID ${escapeHtml(payment.paymentId)}</div></td>
          <td><strong>${escapeHtml(payment.bookingReference || `BK-${payment.bookingId}`)}</strong><div class="small text-ink-soft">Quotation #${escapeHtml(payment.quotationId || '-')}</div></td>
          <td><strong>${escapeHtml(payment.customerName || 'Customer')}</strong><div class="small text-ink-soft">${escapeHtml(payment.customerEmail || '')}</div></td>
          <td>${escapeHtml(payment.eventType || 'Event')}<div class="small text-ink-soft">${escapeHtml(payment.venueName || 'Venue not set')}</div></td>
          <td><span class="bb-badge">${escapeHtml(statusLabel(payment.paymentType))}</span></td>
          <td><strong class="text-gold">${escapeHtml(formatMoney(payment.amount))}</strong></td>
          <td><span class="status ${statusClass(payment.paymentStatus)}">${escapeHtml(statusLabel(payment.paymentStatus))}</span></td>
          <td>${method.length ? method.map(escapeHtml).join('<br>') : '<span class="text-ink-soft">Not provided</span>'}<div class="small text-ink-soft mt-1">${escapeHtml(formatDateTime(payment.paidAt))}</div></td>
          <td>${action}</td>
        </tr>`;
    }).join('');
  }

  async function loadPayments() {
    setPaymentMessage('');
    const tbody = document.querySelector('[data-admin-payment-rows]');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Loading payments...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/payments', { method: 'GET' });
      state.payments = Array.isArray(data) ? data : [];
      updatePaymentStats(state.payments);
      renderPayments();
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to load payments.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Unable to load payments.</td></tr>';
    }
  }

  function openPaymentConfirmation(paymentId) {
    const payment = state.payments.find((item) => String(item.paymentId) === String(paymentId));
    if (!payment || payment.paymentStatus !== 'PENDING') return;
    state.pendingPayment = payment;
    document.querySelector('[data-payment-modal-title]').textContent = `Confirm ${statusLabel(payment.paymentType)} Payment`;
    document.querySelector('[data-payment-modal-customer]').textContent = payment.customerName || 'Customer';
    document.querySelector('[data-payment-modal-booking]').textContent = payment.bookingReference || `Booking #${payment.bookingId}`;
    document.querySelector('[data-payment-modal-type]').textContent = statusLabel(payment.paymentType);
    document.querySelector('[data-payment-modal-amount]').textContent = formatMoney(payment.amount);
    document.querySelector('[data-payment-method]').value = payment.paymentMethod || '';
    document.querySelector('[data-payment-reference]').value = payment.transactionReference || '';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentConfirmModal')).show();
  }

  async function confirmPayment() {
    if (!state.pendingPayment) return;
    const button = document.querySelector('[data-payment-confirm-submit]');
    button.disabled = true;
    button.textContent = 'Confirming...';
    try {
      const paymentMethod = document.querySelector('[data-payment-method]').value.trim();
      const transactionReference = document.querySelector('[data-payment-reference]').value.trim();
      await adminFetch(`/api/admin/payments/${encodeURIComponent(state.pendingPayment.paymentId)}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod, transactionReference })
      });
      window.bootstrap.Modal.getInstance(document.getElementById('paymentConfirmModal'))?.hide();
      await loadPayments();
      setPaymentMessage('Payment confirmed successfully.', 'success');
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to confirm this payment.');
    } finally {
      button.disabled = false;
      button.textContent = 'Confirm Payment';
      state.pendingPayment = null;
    }
  }

  function initPaymentsPage() {
    if (!document.querySelector('[data-admin-payments-page]')) return;
    document.querySelector('[data-admin-payment-search]')?.addEventListener('input', (event) => {
      state.paymentQuery = event.target.value.trim();
      renderPayments();
    });
    document.querySelector('[data-admin-payment-status-filter]')?.addEventListener('change', (event) => {
      state.paymentStatus = event.target.value;
      renderPayments();
    });
    document.querySelector('[data-admin-payment-type-filter]')?.addEventListener('change', (event) => {
      state.paymentType = event.target.value;
      renderPayments();
    });
    document.querySelector('[data-admin-payment-rows]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-payment-confirm]');
      if (button) openPaymentConfirmation(button.dataset.paymentId);
    });
    document.querySelector('[data-payment-confirm-submit]')?.addEventListener('click', confirmPayment);
    loadPayments();
  }

  function setQuotationMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-quotation-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function updateQuotationStats(quotations) {
    const count = (status) => quotations.filter((quotation) => quotation.status === status).length;
    const values = { total: quotations.length, draft: count('DRAFT'), sent: count('SENT'), accepted: count('ACCEPTED') };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-quotation-page-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
    const summary = document.querySelector('[data-admin-quotation-page-summary]');
    if (summary) summary.textContent = `${quotations.length} quotations | ${values.draft} drafts awaiting review`;
  }

  function renderQuotations() {
    const tbody = document.querySelector('[data-admin-quotation-rows]');
    if (!tbody) return;
    const query = state.quotationQuery.toLowerCase();
    const filtered = state.quotations.filter((quotation) => {
      const searchable = [
        quotation.quotationId,
        quotation.customerName,
        quotation.customerEmail,
        quotation.eventType,
        quotation.venueName,
        quotation.bookingReference
      ].join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (state.quotationStatus === 'ALL' || quotation.status === state.quotationStatus);
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">No quotations found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((quotation) => `
      <tr>
        <td><strong>QT-${String(quotation.quotationId).padStart(4, '0')}</strong>${quotation.bookingReference ? `<div class="small text-ink-soft">${escapeHtml(quotation.bookingReference)}</div>` : ''}</td>
        <td><strong>${escapeHtml(quotation.customerName || 'Customer')}</strong><div class="small text-ink-soft">${escapeHtml(quotation.customerEmail || '')}</div></td>
        <td>${escapeHtml(quotation.bookingType === 'PACKAGE' ? `PACKAGE · ${quotation.packageName || quotation.eventType || 'Package'}` : (quotation.eventType || 'Event'))}<div class="small text-ink-soft">${escapeHtml(formatDate(quotation.eventDate))}</div></td>
        <td>${escapeHtml(quotation.venueName || 'Venue not set')}</td>
        <td>${escapeHtml(formatMoney(quotation.subtotal))}</td>
        <td><strong class="text-gold">${escapeHtml(formatMoney(quotation.total))}</strong></td>
        <td><span class="status ${statusClass(quotation.status)}">${escapeHtml(statusLabel(quotation.status))}</span></td>
        <td>${escapeHtml(formatDateTime(quotation.expiresAt))}</td>
        <td><button class="btn btn-outline-forest btn-sm" type="button" data-quotation-view data-quotation-id="${escapeHtml(quotation.quotationId)}">${quotation.status === 'DRAFT' ? 'Review / Edit' : 'View'}</button></td>
      </tr>`).join('');
  }

  async function loadQuotations() {
    setQuotationMessage('');
    const tbody = document.querySelector('[data-admin-quotation-rows]');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Loading quotations...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/quotations', { method: 'GET' });
      state.quotations = Array.isArray(data) ? data : [];
      updateQuotationStats(state.quotations);
      renderQuotations();
    } catch (error) {
      setQuotationMessage(error.message || 'Unable to load quotations.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Unable to load quotations.</td></tr>';
    }
  }

  function setQuotationText(key, value) {
    const element = document.querySelector(`[data-quotation-detail="${key}"]`);
    if (element) element.textContent = value ?? '-';
  }

  function populateQuotationDetail(quotation) {
    state.currentQuotation = quotation;
    const draft = quotation.status === 'DRAFT';
    const isPackage = String(quotation.bookingType || '').toUpperCase() === 'PACKAGE';
    setQuotationText('reference', `QT-${String(quotation.quotationId).padStart(4, '0')}`);
    setQuotationText('status', statusLabel(quotation.status));
    setQuotationText('customer', quotation.customerName || 'Customer');
    setQuotationText('customerEmail', quotation.customerEmail || '');
    setQuotationText('event', isPackage ? `PACKAGE · ${quotation.packageName || quotation.eventType || 'Package'}` : (quotation.eventType || 'Event'));
    setQuotationText('eventMeta', `${formatDate(quotation.eventDate)} | ${quotation.guestCount ?? '-'} guests`);
    setQuotationText('venue', quotation.venueName || 'Venue not set');
    setQuotationText('venueLocation', quotation.venueLocation || '');
    setQuotationText('venueHire', isPackage ? 'Included in package' : formatMoney(quotation.venueHire));
    setQuotationText('serviceSubtotal', formatMoney(quotation.serviceSubtotal));
    setQuotationText('subtotal', formatMoney(isPackage ? (quotation.packageSnapshotPrice ?? quotation.subtotal) : quotation.subtotal));
    setQuotationText('total', formatMoney(quotation.total));
    setQuotationText('createdAt', formatDateTime(quotation.createdAt));
    setQuotationText('booking', quotation.bookingReference
      ? `${quotation.bookingReference} | ${statusLabel(quotation.bookingStatus)}`
      : 'No booking linked');

    const services = document.querySelector('[data-quotation-service-lines]');
    if (services) {
      const inclusions = Array.isArray(quotation.packageInclusions) ? quotation.packageInclusions : [];
      services.innerHTML = isPackage
        ? `<div class="fw-semibold text-forest">PACKAGE INCLUSIONS</div>${inclusions.length ? inclusions.map((group) => `<div><strong>${escapeHtml(group.serviceName || 'Included service')}</strong><ul class="mb-0">${(Array.isArray(group.inclusions) ? group.inclusions : []).map((item) => `<li>${escapeHtml(typeof item === 'object' ? (item.label || item.name || item.title || '') : item)}</li>`).join('')}</ul></div>`).join('') : '<span class="text-ink-soft">Package inclusions are not available.</span>'}`
        : Array.isArray(quotation.services) && quotation.services.length
        ? quotation.services.map((service) => `<div class="d-flex justify-content-between gap-3"><span>${escapeHtml(service.serviceName || 'Service')}</span><strong>${escapeHtml(formatMoney(service.estimatedTotal))}</strong></div>`).join('')
        : '<span class="text-ink-soft">No selected services.</span>';
    }

    const venueRow = document.querySelector('[data-quotation-detail="venueHire"]')?.closest('.d-flex');
    const serviceRow = document.querySelector('[data-quotation-detail="serviceSubtotal"]')?.closest('.d-flex');
    venueRow?.classList.toggle('d-none', isPackage);
    serviceRow?.classList.toggle('d-none', isPackage);
    const subtotalLabel = document.querySelector('[data-quotation-detail="subtotal"]')?.parentElement?.querySelector('span');
    if (subtotalLabel) subtotalLabel.textContent = isPackage ? 'Package price' : 'Persisted base subtotal';

    const discount = document.querySelector('[data-quotation-discount]');
    const charges = document.querySelector('[data-quotation-charges]');
    const notes = document.querySelector('[data-quotation-notes]');
    const expires = document.querySelector('[data-quotation-expires]');
    if (discount) { discount.value = Number(quotation.discount || 0).toFixed(2); discount.disabled = !draft; }
    if (charges) { charges.value = Number(quotation.additionalCharges || 0).toFixed(2); charges.disabled = !draft; }
    if (notes) { notes.value = quotation.notes || ''; notes.disabled = !draft; }
    if (expires) { expires.value = quotation.expiresAt ? String(quotation.expiresAt).slice(0, 16) : ''; expires.disabled = !draft; }
    document.querySelector('[data-quotation-save]')?.classList.toggle('d-none', !draft);
    document.querySelector('[data-quotation-send]')?.classList.toggle('d-none', !draft);
    document.querySelector('[data-quotation-locked]')?.classList.toggle('d-none', draft);
  }

  async function openQuotationDetail(quotationId) {
    setQuotationMessage('');
    try {
      const quotation = await adminFetch(`/api/admin/quotations/${encodeURIComponent(quotationId)}`, { method: 'GET' });
      populateQuotationDetail(quotation);
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById('quotationDetailModal')).show();
    } catch (error) {
      setQuotationMessage(error.message || 'Unable to load quotation details.');
    }
  }

  async function saveQuotationDraft() {
    const quotation = state.currentQuotation;
    if (!quotation || quotation.status !== 'DRAFT') return;
    const button = document.querySelector('[data-quotation-save]');
    button.disabled = true;
    button.textContent = 'Saving...';
    try {
      const payload = {
        discount: Number(document.querySelector('[data-quotation-discount]').value),
        additionalCharges: Number(document.querySelector('[data-quotation-charges]').value),
        notes: document.querySelector('[data-quotation-notes]').value.trim(),
        expiresAt: document.querySelector('[data-quotation-expires]').value
      };
      const updated = await adminFetch(`/api/admin/quotations/${encodeURIComponent(quotation.quotationId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      populateQuotationDetail(updated);
      await loadQuotations();
      setQuotationMessage('Draft quotation saved. The total was recalculated by the backend.', 'success');
    } catch (error) {
      setQuotationMessage(error.message || 'Unable to save this draft.');
    } finally {
      button.disabled = false;
      button.textContent = 'Save Draft';
    }
  }

  function openQuotationSendConfirmation() {
    const quotation = state.currentQuotation;
    if (!quotation || quotation.status !== 'DRAFT') return;
    document.querySelector('[data-quotation-send-reference]').textContent = `QT-${String(quotation.quotationId).padStart(4, '0')}`;
    window.bootstrap.Modal.getInstance(document.getElementById('quotationDetailModal'))?.hide();
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('quotationSendModal')).show();
  }

  async function sendQuotation() {
    const quotation = state.currentQuotation;
    if (!quotation || quotation.status !== 'DRAFT') return;
    const button = document.querySelector('[data-quotation-send-confirm]');
    button.disabled = true;
    button.textContent = 'Sending...';
    try {
      await adminFetch(`/api/admin/quotations/${encodeURIComponent(quotation.quotationId)}/send`, { method: 'PATCH' });
      window.bootstrap.Modal.getInstance(document.getElementById('quotationSendModal'))?.hide();
      state.currentQuotation = null;
      await loadQuotations();
      setQuotationMessage('Quotation sent to the customer and locked for editing.', 'success');
    } catch (error) {
      setQuotationMessage(error.message || 'Unable to send this quotation.');
    } finally {
      button.disabled = false;
      button.textContent = 'Send Quotation';
    }
  }

  function initQuotationsPage() {
    if (!document.querySelector('[data-admin-quotations-page]')) return;
    document.querySelector('[data-admin-quotation-search]')?.addEventListener('input', (event) => {
      state.quotationQuery = event.target.value.trim();
      renderQuotations();
    });
    document.querySelector('[data-admin-quotation-status-filter]')?.addEventListener('change', (event) => {
      state.quotationStatus = event.target.value;
      renderQuotations();
    });
    document.querySelector('[data-admin-quotation-rows]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quotation-view]');
      if (button) openQuotationDetail(button.dataset.quotationId);
    });
    document.querySelector('[data-quotation-save]')?.addEventListener('click', saveQuotationDraft);
    document.querySelector('[data-quotation-send]')?.addEventListener('click', openQuotationSendConfirmation);
    document.querySelector('[data-quotation-send-confirm]')?.addEventListener('click', sendQuotation);
    loadQuotations();
  }

  function setCustomerMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-customer-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function customerName(customer) {
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer';
  }

  function updateCustomerStats(customers) {
    const active = customers.filter((customer) => customer.enabled).length;
    const disabled = customers.length - active;
    const values = { total: customers.length, active, disabled };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-customer-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
    const summary = document.querySelector('[data-admin-customer-summary]');
    if (summary) summary.textContent = `${customers.length} registered customers | ${active} active`;
  }

  function customerActionButtons(customer) {
    const id = escapeHtml(customer.id);
    const accountAction = customer.enabled
      ? `<button class="btn btn-outline-danger btn-sm" type="button" data-customer-account-action="disable" data-customer-id="${id}">Disable</button>`
      : `<button class="btn btn-gold btn-sm" type="button" data-customer-account-action="enable" data-customer-id="${id}">Enable</button>`;
    return `<div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-forest btn-sm" type="button" data-customer-view data-customer-id="${id}">View</button>${accountAction}</div>`;
  }

  function renderCustomers() {
    const tbody = document.querySelector('[data-admin-customer-rows]');
    if (!tbody) return;
    const query = state.customerQuery.toLowerCase();
    const filtered = state.customers.filter((customer) => {
      const searchable = [customer.firstName, customer.lastName, customer.email, customer.phone].join(' ').toLowerCase();
      const statusMatch = state.customerStatus === 'ALL'
        || (state.customerStatus === 'ACTIVE' && customer.enabled)
        || (state.customerStatus === 'DISABLED' && !customer.enabled);
      return (!query || searchable.includes(query)) && statusMatch;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">No customers found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((customer) => `
      <tr>
        <td><strong>${escapeHtml(customerName(customer))}</strong><div class="small text-ink-soft">CU-${String(customer.id).padStart(4, '0')}</div></td>
        <td>${escapeHtml(customer.email || '-')}</td>
        <td>${escapeHtml(customer.phone || 'Not provided')}</td>
        <td>${escapeHtml(customer.bookingCount ?? 0)}</td>
        <td>${escapeHtml(customer.quotationCount ?? 0)}</td>
        <td>${escapeHtml(customer.paymentCount ?? 0)}</td>
        <td><span class="status ${customer.enabled ? 'confirmed' : 'cancelled'}">${customer.enabled ? 'Active' : 'Disabled'}</span></td>
        <td>${customerActionButtons(customer)}</td>
      </tr>`).join('');
  }

  async function loadCustomers() {
    setCustomerMessage('');
    const tbody = document.querySelector('[data-admin-customer-rows]');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Loading customers...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/customers', { method: 'GET' });
      state.customers = Array.isArray(data) ? data : [];
      updateCustomerStats(state.customers);
      renderCustomers();
    } catch (error) {
      setCustomerMessage(error.message || 'Unable to load customers.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Unable to load customers.</td></tr>';
    }
  }

  function setCustomerDetail(key, value) {
    const element = document.querySelector(`[data-customer-detail="${key}"]`);
    if (element) element.textContent = value ?? '-';
  }

  function populateCustomerDetail(customer) {
    state.currentCustomer = customer;
    setCustomerDetail('name', customerName(customer));
    setCustomerDetail('id', `CU-${String(customer.id).padStart(4, '0')}`);
    setCustomerDetail('email', customer.email || 'Not provided');
    setCustomerDetail('phone', customer.phone || 'Not provided');
    setCustomerDetail('address', customer.address || 'Not provided');
    setCustomerDetail('status', customer.enabled ? 'Active' : 'Disabled');
    setCustomerDetail('bookings', customer.totalBookings ?? 0);
    setCustomerDetail('pending', customer.pendingBookings ?? 0);
    setCustomerDetail('awaitingDeposit', customer.awaitingDepositBookings ?? 0);
    setCustomerDetail('confirmed', customer.confirmedBookings ?? 0);
    setCustomerDetail('cancelled', customer.cancelledBookings ?? 0);
    setCustomerDetail('completed', customer.completedBookings ?? 0);
    setCustomerDetail('quotations', customer.quotations ?? 0);
    setCustomerDetail('payments', customer.payments ?? 0);
    setCustomerDetail('paidAmount', formatMoney(customer.paidAmount || 0));

    const rows = document.querySelector('[data-customer-recent-bookings]');
    if (rows) {
      rows.innerHTML = Array.isArray(customer.recentBookings) && customer.recentBookings.length
        ? customer.recentBookings.map((booking) => `
          <tr><td><strong>${escapeHtml(booking.bookingReference || `BK-${booking.bookingId}`)}</strong></td><td>${escapeHtml(booking.eventType || 'Event')}</td><td>${escapeHtml(booking.venueName || 'Venue not set')}</td><td>${escapeHtml(formatDate(booking.eventDate))}</td><td><span class="status ${statusClass(booking.status)}">${escapeHtml(statusLabel(booking.status))}</span></td></tr>`).join('')
        : '<tr><td colspan="5" class="text-center py-4 text-ink-soft">No bookings for this customer.</td></tr>';
    }

    const action = document.querySelector('[data-customer-detail-account-action]');
    if (action) {
      action.dataset.customerAccountAction = customer.enabled ? 'disable' : 'enable';
      action.dataset.customerId = customer.id;
      action.textContent = customer.enabled ? 'Disable Account' : 'Enable Account';
      action.className = customer.enabled ? 'btn btn-outline-danger' : 'btn btn-gold';
    }
  }

  async function openCustomerDetail(customerId) {
    setCustomerMessage('');
    try {
      const customer = await adminFetch(`/api/admin/customers/${encodeURIComponent(customerId)}`, { method: 'GET' });
      populateCustomerDetail(customer);
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById('customerDetailModal')).show();
    } catch (error) {
      setCustomerMessage(error.message || 'Unable to load customer details.');
    }
  }

  function requestCustomerAccountAction(customerId, action) {
    const customer = state.customers.find((item) => String(item.id) === String(customerId))
      || (String(state.currentCustomer?.id) === String(customerId) ? state.currentCustomer : null);
    if (!customer) return;
    if (action === 'enable') {
      performCustomerAccountAction(customerId, 'enable');
      return;
    }
    if (action !== 'disable') return;
    state.pendingCustomerAction = { customerId, action };
    document.querySelector('[data-customer-disable-name]').textContent = customerName(customer);
    window.bootstrap.Modal.getInstance(document.getElementById('customerDetailModal'))?.hide();
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('customerDisableModal')).show();
  }

  async function performCustomerAccountAction(customerId, action) {
    const confirmButton = document.querySelector('[data-customer-disable-confirm]');
    if (confirmButton && action === 'disable') {
      confirmButton.disabled = true;
      confirmButton.textContent = 'Disabling...';
    }
    try {
      await adminFetch(`/api/admin/customers/${encodeURIComponent(customerId)}/${action}`, { method: 'PATCH' });
      window.bootstrap.Modal.getInstance(document.getElementById('customerDisableModal'))?.hide();
      window.bootstrap.Modal.getInstance(document.getElementById('customerDetailModal'))?.hide();
      state.currentCustomer = null;
      await loadCustomers();
      setCustomerMessage(`Customer account ${action === 'disable' ? 'disabled' : 'enabled'} successfully.`, 'success');
    } catch (error) {
      setCustomerMessage(error.message || `Unable to ${action} this customer account.`);
    } finally {
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Disable Account';
      }
      state.pendingCustomerAction = null;
    }
  }

  function initCustomersPage() {
    if (!document.querySelector('[data-admin-customers-page]')) return;
    document.querySelector('[data-admin-customer-search]')?.addEventListener('input', (event) => {
      state.customerQuery = event.target.value.trim();
      renderCustomers();
    });
    document.querySelector('[data-admin-customer-status-filter]')?.addEventListener('change', (event) => {
      state.customerStatus = event.target.value;
      renderCustomers();
    });
    document.querySelector('[data-admin-customer-rows]')?.addEventListener('click', (event) => {
      const view = event.target.closest('[data-customer-view]');
      const action = event.target.closest('[data-customer-account-action]');
      if (view) openCustomerDetail(view.dataset.customerId);
      if (action) requestCustomerAccountAction(action.dataset.customerId, action.dataset.customerAccountAction);
    });
    document.querySelector('[data-customer-detail-account-action]')?.addEventListener('click', (event) => {
      requestCustomerAccountAction(event.currentTarget.dataset.customerId, event.currentTarget.dataset.customerAccountAction);
    });
    document.querySelector('[data-customer-disable-confirm]')?.addEventListener('click', () => {
      if (state.pendingCustomerAction) performCustomerAccountAction(state.pendingCustomerAction.customerId, 'disable');
    });
    loadCustomers();
  }

  function setConsultationMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-consultation-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function updateConsultationStats() {
    const count = (status) => state.consultations.filter((item) => item.status === status).length;
    const values = {
      total: state.consultations.length,
      requested: count('REQUESTED'),
      scheduled: count('SCHEDULED'),
      completed: count('COMPLETED')
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-consultation-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
    const summary = document.querySelector('[data-admin-consultation-summary]');
    if (summary) summary.textContent = `${values.total} total consultations | ${count('CANCELLED')} cancelled`;
  }

  function consultationActionButtons(consultation) {
    const id = escapeHtml(consultation.id);
    const buttons = [`<button class="btn btn-outline-forest btn-sm" type="button" data-consultation-view="${id}">View</button>`];
    if (consultation.status === 'REQUESTED') {
      buttons.push(`<button class="btn btn-gold btn-sm" type="button" data-consultation-schedule="${id}">Schedule</button>`);
      buttons.push(`<button class="btn btn-outline-danger btn-sm" type="button" data-consultation-action="cancel" data-consultation-id="${id}">Cancel</button>`);
    } else if (consultation.status === 'SCHEDULED') {
      buttons.push(`<button class="btn btn-gold btn-sm" type="button" data-consultation-action="complete" data-consultation-id="${id}">Complete</button>`);
      buttons.push(`<button class="btn btn-outline-danger btn-sm" type="button" data-consultation-action="cancel" data-consultation-id="${id}">Cancel</button>`);
    }
    return `<div class="consultation-actions">${buttons.join('')}</div>`;
  }

  function renderConsultations() {
    const rows = document.querySelector('[data-admin-consultation-rows]');
    if (!rows) return;
    const query = state.consultationQuery.toLowerCase();
    const filtered = state.consultations.filter((consultation) => {
      const searchable = [
        consultation.id,
        consultation.customerName,
        consultation.customerEmail,
        consultation.consultationType,
        consultation.planner
      ].join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (state.consultationStatus === 'ALL' || consultation.status === state.consultationStatus);
    });

    rows.innerHTML = filtered.length ? filtered.map((consultation) => {
      const planner = consultation.planner || 'Unassigned';
      const time = [formatTime(consultation.startTime), formatTime(consultation.endTime)].filter(Boolean).join(' - ');
      return `<tr>
        <td><strong>CS-${escapeHtml(consultation.id)}</strong></td>
        <td><strong>${escapeHtml(consultation.customerName || `Customer #${consultation.customerId || '-'}`)}</strong><div class="small text-ink-soft">${escapeHtml(consultation.customerEmail || 'Email unavailable')}</div></td>
        <td>${escapeHtml(consultation.consultationType || 'Consultation')}</td>
        <td>${escapeHtml(formatDate(consultation.consultationDate))}</td>
        <td>${escapeHtml(time || 'Time not set')}</td>
        <td>${escapeHtml(planner)}</td>
        <td><span class="status ${statusClass(consultation.status)}">${escapeHtml(statusLabel(consultation.status))}</span></td>
        <td>${consultationActionButtons(consultation)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="text-center py-5 text-ink-soft">No consultations match these filters.</td></tr>';
  }

  async function loadAdminConsultations() {
    setConsultationMessage('');
    const rows = document.querySelector('[data-admin-consultation-rows]');
    if (rows) rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Loading consultations...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/consultations', { method: 'GET' });
      state.consultations = Array.isArray(data) ? data : [];
      updateConsultationStats();
      renderConsultations();
    } catch (error) {
      setConsultationMessage(error.message || 'Unable to load consultations.');
      if (rows) rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Unable to load consultations.</td></tr>';
    }
  }

  function detailItem(label, value, wide = false) {
    return `<div class="consultation-detail-item${wide ? ' wide' : ''}"><div class="consultation-detail-label">${escapeHtml(label)}</div><div>${escapeHtml(value || 'Not provided')}</div></div>`;
  }

  async function openConsultationDetail(id) {
    const detail = document.querySelector('[data-admin-consultation-detail]');
    if (detail) detail.innerHTML = '<div class="text-center py-4 text-ink-soft">Loading details...</div>';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('consultationDetailModal')).show();
    try {
      const consultation = await adminFetch(`/api/admin/consultations/${encodeURIComponent(id)}`, { method: 'GET' });
      document.querySelector('[data-admin-consultation-detail-title]').textContent = `Consultation CS-${consultation.id}`;
      const time = [formatTime(consultation.startTime), formatTime(consultation.endTime)].filter(Boolean).join(' - ');
      detail.innerHTML = [
        detailItem('Customer', consultation.customerName || `Customer #${consultation.customerId || '-'}`),
        detailItem('Email', consultation.customerEmail || 'Email unavailable'),
        detailItem('Consultation Type', consultation.consultationType),
        detailItem('Date', formatDate(consultation.consultationDate)),
        detailItem('Time', time || 'Time not set'),
        detailItem('Planner', consultation.planner || 'Unassigned'),
        detailItem('Status', statusLabel(consultation.status)),
        detailItem('Created', formatDateTime(consultation.createdAt)),
        detailItem('Notes', consultation.notes || 'No notes provided.', true)
      ].join('');
    } catch (error) {
      detail.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(error.message || 'Unable to load consultation details.')}</div>`;
    }
  }

  function localDateValue(date = new Date()) {
    const adjusted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return adjusted.toISOString().slice(0, 10);
  }

  async function openConsultationSchedule(id) {
    setConsultationMessage('');
    try {
      const consultation = await adminFetch(`/api/admin/consultations/${encodeURIComponent(id)}`, { method: 'GET' });
      state.currentConsultation = consultation;
      document.querySelector('[data-admin-consultation-schedule-id]').value = consultation.id;
      document.querySelector('[data-admin-consultation-schedule-date]').value = consultation.consultationDate || '';
      document.querySelector('[data-admin-consultation-schedule-date]').min = localDateValue();
      document.querySelector('[data-admin-consultation-schedule-start]').value = String(consultation.startTime || '').slice(0, 5);
      document.querySelector('[data-admin-consultation-schedule-end]').value = String(consultation.endTime || '').slice(0, 5);
      document.querySelector('[data-admin-consultation-schedule-planner]').value = consultation.planner || '';
      document.querySelector('[data-admin-consultation-schedule-customer]').textContent = `${consultation.customerName || `Customer #${consultation.customerId || '-'}`} | ${consultation.consultationType || 'Consultation'}`;
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById('consultationScheduleModal')).show();
    } catch (error) {
      setConsultationMessage(error.message || 'Unable to load this consultation.');
    }
  }

  async function submitConsultationSchedule(event) {
    event.preventDefault();
    const current = state.currentConsultation;
    const startTime = document.querySelector('[data-admin-consultation-schedule-start]').value;
    const endTime = document.querySelector('[data-admin-consultation-schedule-end]').value;
    if (!current || !startTime || !endTime || startTime >= endTime) {
      setConsultationMessage('Consultation start time must be before end time.');
      return;
    }
    const button = document.querySelector('[data-admin-consultation-schedule-save]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    setConsultationMessage('');
    try {
      await adminFetch(`/api/admin/consultations/${encodeURIComponent(current.id)}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationDate: document.querySelector('[data-admin-consultation-schedule-date]').value,
          startTime,
          endTime,
          consultationType: current.consultationType,
          planner: document.querySelector('[data-admin-consultation-schedule-planner]').value.trim(),
          notes: current.notes
        })
      });
      window.bootstrap.Modal.getInstance(document.getElementById('consultationScheduleModal'))?.hide();
      state.currentConsultation = null;
      await loadAdminConsultations();
      setConsultationMessage('Consultation scheduled successfully.', 'success');
    } catch (error) {
      setConsultationMessage(error.message || 'Unable to schedule this consultation.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function openConsultationAction(id, action) {
    const consultation = state.consultations.find((item) => String(item.id) === String(id));
    if (!consultation) return;
    state.pendingConsultationAction = { id: consultation.id, action };
    const complete = action === 'complete';
    document.querySelector('[data-admin-consultation-action-title]').textContent = complete ? 'Complete Consultation' : 'Cancel Consultation';
    document.querySelector('[data-admin-consultation-action-message]').textContent = complete
      ? 'Mark this consultation as completed?'
      : 'Cancel this consultation? The record will remain in consultation history.';
    const confirm = document.querySelector('[data-admin-consultation-action-confirm]');
    confirm.textContent = complete ? 'Mark Completed' : 'Cancel Consultation';
    confirm.className = complete ? 'btn btn-gold' : 'btn btn-danger';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('consultationActionModal')).show();
  }

  async function confirmConsultationAction() {
    const pending = state.pendingConsultationAction;
    if (!pending) return;
    const button = document.querySelector('[data-admin-consultation-action-confirm]');
    button.disabled = true;
    setConsultationMessage('');
    try {
      await adminFetch(`/api/admin/consultations/${encodeURIComponent(pending.id)}/${pending.action}`, { method: 'PATCH' });
      window.bootstrap.Modal.getInstance(document.getElementById('consultationActionModal'))?.hide();
      state.pendingConsultationAction = null;
      await loadAdminConsultations();
      setConsultationMessage(`Consultation ${pending.action === 'complete' ? 'completed' : 'cancelled'} successfully.`, 'success');
    } catch (error) {
      setConsultationMessage(error.message || 'Unable to update this consultation.');
    } finally {
      button.disabled = false;
    }
  }

  function initConsultationsPage() {
    if (!document.querySelector('[data-admin-consultations-page]')) return;
    document.querySelector('[data-admin-consultation-search]')?.addEventListener('input', (event) => { state.consultationQuery = event.target.value.trim(); renderConsultations(); });
    document.querySelector('[data-admin-consultation-status]')?.addEventListener('change', (event) => { state.consultationStatus = event.target.value; renderConsultations(); });
    document.querySelector('[data-admin-consultation-rows]')?.addEventListener('click', (event) => {
      const view = event.target.closest('[data-consultation-view]');
      const schedule = event.target.closest('[data-consultation-schedule]');
      const action = event.target.closest('[data-consultation-action]');
      if (view) openConsultationDetail(view.dataset.consultationView);
      else if (schedule) openConsultationSchedule(schedule.dataset.consultationSchedule);
      else if (action) openConsultationAction(action.dataset.consultationId, action.dataset.consultationAction);
    });
    document.querySelector('[data-admin-consultation-schedule-form]')?.addEventListener('submit', submitConsultationSchedule);
    document.querySelector('[data-admin-consultation-action-confirm]')?.addEventListener('click', confirmConsultationAction);
    loadAdminConsultations();
  }

  function setVenueMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-venue-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function updateVenueStats() {
    const available = state.venues.filter((venue) => venue.available).length;
    const values = { total: state.venues.length, available, disabled: state.venues.length - available };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-admin-venue-count="${key}"]`);
      if (element) element.textContent = String(value);
    });
  }

  function populateVenueTypes() {
    const select = document.querySelector('[data-admin-venue-type]');
    if (!select) return;
    const types = [...new Set(state.venues.map((venue) => venue.type).filter(Boolean))].sort();
    select.innerHTML = '<option value="ALL">All venue types</option>'
      + types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
    select.value = types.includes(state.venueType) ? state.venueType : 'ALL';
    state.venueType = select.value;
  }

  function attachVenueImageFallbacks(container) {
    container?.querySelectorAll('[data-venue-image]').forEach((image) => {
      const showFallback = () => {
        image.classList.add('d-none');
        image.nextElementSibling?.classList.remove('d-none');
      };
      image.addEventListener('error', showFallback, { once: true });
      if (image.complete && !image.naturalWidth) showFallback();
    });
  }

  function renderAdminVenues() {
    const rows = document.querySelector('[data-admin-venue-rows]');
    if (!rows) return;
    const query = state.venueQuery.toLowerCase();
    const filtered = state.venues.filter((venue) => {
      const searchable = `${venue.name || ''} ${venue.type || ''} ${venue.location || ''}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (state.venueType === 'ALL' || venue.type === state.venueType)
        && (state.venueAvailability === 'ALL'
          || (state.venueAvailability === 'AVAILABLE' && venue.available)
          || (state.venueAvailability === 'DISABLED' && !venue.available));
    });
    rows.innerHTML = filtered.length ? filtered.map((venue) => {
      const image = venue.image
        ? `<img src="${escapeHtml(venue.image)}" alt="" data-venue-image><span class="venue-admin-thumb-placeholder d-none"><i class="bi bi-building"></i></span>`
        : '<span class="venue-admin-thumb-placeholder"><i class="bi bi-building"></i></span>';
      const capacity = venue.capacity == null ? 'Not specified' : `${Number(venue.capacity).toLocaleString()} guests`;
      return `<tr>
        <td><div class="d-flex align-items-center gap-3"><span class="venue-admin-thumb">${image}</span><div><strong>${escapeHtml(venue.name)}</strong><div class="small text-ink-soft">Venue #${escapeHtml(venue.id)}</div></div></div></td>
        <td>${escapeHtml(venue.type)}</td>
        <td><span class="venue-admin-location">${escapeHtml(venue.location)}</span></td>
        <td>${escapeHtml(capacity)}</td>
        <td>${venue.price == null ? '<span class="text-ink-soft">Price on request</span>' : `<span class="venue-admin-price">${escapeHtml(formatMoney(venue.price))}</span>`}</td>
        <td><span class="status ${venue.available ? 'confirmed' : 'cancelled'}">${venue.available ? 'Available' : 'Disabled'}</span></td>
        <td><button class="btn btn-outline-forest btn-sm" type="button" data-admin-venue-edit="${escapeHtml(venue.id)}">Edit</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center py-5 text-ink-soft">No venues match these filters.</td></tr>';
    attachVenueImageFallbacks(rows);
  }

  async function loadAdminVenues() {
    setVenueMessage('');
    const rows = document.querySelector('[data-admin-venue-rows]');
    if (rows) rows.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-ink-soft">Loading venues...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/venues', { method: 'GET' });
      state.venues = Array.isArray(data) ? data : [];
      updateVenueStats();
      populateVenueTypes();
      renderAdminVenues();
    } catch (error) {
      setVenueMessage(error.message || 'Unable to load venues.');
      if (rows) rows.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-ink-soft">Unable to load venues.</td></tr>';
    }
  }

  function updateVenuePreview(path) {
    const image = document.querySelector('[data-admin-venue-preview]');
    const placeholder = image?.nextElementSibling;
    if (!image || !placeholder) return;
    const value = String(path || '').trim();
    if (!value) {
      image.removeAttribute('src');
      image.classList.add('d-none');
      placeholder.classList.remove('d-none');
      return;
    }
    image.onload = () => { image.classList.remove('d-none'); placeholder.classList.add('d-none'); };
    image.onerror = () => { image.classList.add('d-none'); placeholder.classList.remove('d-none'); };
    image.src = value;
  }

  function openVenueEditor(id) {
    const venue = state.venues.find((item) => String(item.id) === String(id));
    if (!venue) return;
    document.querySelector('[data-admin-venue-edit-id]').value = venue.id;
    document.querySelector('[data-admin-venue-edit-name]').value = venue.name || '';
    document.querySelector('[data-admin-venue-edit-type]').value = venue.type || '';
    document.querySelector('[data-admin-venue-edit-location]').value = venue.location || '';
    document.querySelector('[data-admin-venue-edit-description]').value = venue.description || '';
    document.querySelector('[data-admin-venue-edit-capacity]').value = venue.capacity ?? '';
    document.querySelector('[data-admin-venue-edit-price]').value = venue.price ?? '';
    document.querySelector('[data-admin-venue-edit-image]').value = venue.image || '';
    document.querySelector('[data-admin-venue-edit-available]').value = String(Boolean(venue.available));
    updateVenuePreview(venue.image);
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('venueEditModal')).show();
  }

  function optionalVenueNumber(selector) {
    const value = document.querySelector(selector).value.trim();
    return value === '' ? null : Number(value);
  }

  async function submitVenueEdit(event) {
    event.preventDefault();
    const id = document.querySelector('[data-admin-venue-edit-id]').value;
    const button = document.querySelector('[data-admin-venue-edit-save]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    setVenueMessage('');
    try {
      await adminFetch(`/api/admin/venues/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.querySelector('[data-admin-venue-edit-name]').value.trim(),
          type: document.querySelector('[data-admin-venue-edit-type]').value.trim(),
          location: document.querySelector('[data-admin-venue-edit-location]').value.trim(),
          description: document.querySelector('[data-admin-venue-edit-description]').value.trim(),
          capacity: optionalVenueNumber('[data-admin-venue-edit-capacity]'),
          price: optionalVenueNumber('[data-admin-venue-edit-price]'),
          image: document.querySelector('[data-admin-venue-edit-image]').value.trim(),
          available: document.querySelector('[data-admin-venue-edit-available]').value === 'true'
        })
      });
      window.bootstrap.Modal.getInstance(document.getElementById('venueEditModal'))?.hide();
      await loadAdminVenues();
      setVenueMessage('Venue updated successfully.', 'success');
    } catch (error) {
      setVenueMessage(error.message || 'Unable to update this venue.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function openVenueCreator() {
    const form = document.querySelector('[data-admin-venue-add-form]');
    form?.reset();
    document.querySelector('[data-admin-venue-add-available]').value = 'true';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('venueAddModal')).show();
  }

  function optionalVenueCreateNumber(selector) {
    const value = document.querySelector(selector).value.trim();
    return value === '' ? null : Number(value);
  }

  async function submitVenueCreate(event) {
    event.preventDefault();
    const button = document.querySelector('[data-admin-venue-add-save]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Adding...';
    setVenueMessage('');
    try {
      await adminFetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.querySelector('[data-admin-venue-add-name]').value.trim(),
          type: document.querySelector('[data-admin-venue-add-type]').value.trim(),
          location: document.querySelector('[data-admin-venue-add-location]').value.trim(),
          description: document.querySelector('[data-admin-venue-add-description]').value.trim(),
          capacity: optionalVenueCreateNumber('[data-admin-venue-add-capacity]'),
          price: optionalVenueCreateNumber('[data-admin-venue-add-price]'),
          image: document.querySelector('[data-admin-venue-add-image]').value.trim(),
          available: document.querySelector('[data-admin-venue-add-available]').value === 'true'
        })
      });
      window.bootstrap.Modal.getInstance(document.getElementById('venueAddModal'))?.hide();
      await loadAdminVenues();
      setVenueMessage('Venue added successfully.', 'success');
    } catch (error) {
      setVenueMessage(error.message || 'Unable to add this venue.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function initVenuesPage() {
    if (!document.querySelector('[data-admin-venues-page]')) return;
    document.querySelector('[data-admin-venue-search]')?.addEventListener('input', (event) => { state.venueQuery = event.target.value.trim(); renderAdminVenues(); });
    document.querySelector('[data-admin-venue-type]')?.addEventListener('change', (event) => { state.venueType = event.target.value; renderAdminVenues(); });
    document.querySelector('[data-admin-venue-availability]')?.addEventListener('change', (event) => { state.venueAvailability = event.target.value; renderAdminVenues(); });
    document.querySelector('[data-admin-venue-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-admin-venue-edit]'); if (button) openVenueEditor(button.dataset.adminVenueEdit); });
    document.querySelector('[data-admin-venue-add]')?.addEventListener('click', openVenueCreator);
    document.querySelector('[data-admin-venue-add-form]')?.addEventListener('submit', submitVenueCreate);
    document.querySelector('[data-admin-venue-edit-image]')?.addEventListener('input', (event) => updateVenuePreview(event.target.value));
    document.querySelector('[data-admin-venue-edit-form]')?.addEventListener('submit', submitVenueEdit);
    loadAdminVenues();
  }

  function setCatalogMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-catalog-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function catalogAvailabilityBadge(available) {
    return `<span class="status ${available ? 'confirmed' : 'cancelled'}">${available ? 'Available' : 'Unavailable'}</span>`;
  }

  function matchesAvailability(item, filter) {
    return filter === 'ALL'
      || (filter === 'AVAILABLE' && item.available)
      || (filter === 'UNAVAILABLE' && !item.available);
  }

  function billingTypeLabel(value) {
    return statusLabel(value).toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  }

  function renderServicesCatalog() {
    const rows = document.querySelector('[data-service-rows]');
    if (!rows) return;
    const query = state.serviceQuery.toLowerCase();
    const filtered = state.services.filter((service) => {
      const searchable = `${service.name || ''} ${service.description || ''}`.toLowerCase();
      return (!query || searchable.includes(query)) && matchesAvailability(service, state.serviceAvailability);
    });
    document.querySelector('[data-service-count]').textContent = String(state.services.length);
    rows.innerHTML = filtered.length ? filtered.map((service) => `
      <tr>
        <td><strong>${escapeHtml(service.name)}</strong><div class="small text-ink-soft">Service #${escapeHtml(service.id)}</div></td>
        <td><span class="catalog-description">${escapeHtml(service.description || 'No description')}</span></td>
        <td><strong class="text-gold">${escapeHtml(formatMoney(service.basePrice))}</strong></td>
        <td>${catalogAvailabilityBadge(service.available)}</td>
        <td class="catalog-actions"><button class="btn btn-outline-forest btn-sm" type="button" data-service-edit="${escapeHtml(service.id)}">Edit</button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="catalog-empty">No services match these filters.</td></tr>';
  }

  function renderDiningStylesCatalog() {
    const rows = document.querySelector('[data-dining-style-rows]');
    if (!rows) return;
    const query = state.diningStyleQuery.toLowerCase();
    const filtered = state.diningStyles.filter((style) => {
      const searchable = `${style.key || ''} ${style.name || ''} ${style.description || ''}`.toLowerCase();
      return (!query || searchable.includes(query)) && matchesAvailability(style, state.diningStyleAvailability);
    });
    document.querySelector('[data-dining-style-count]').textContent = String(state.diningStyles.length);
    rows.innerHTML = filtered.length ? filtered.map((style) => `
      <tr>
        <td><strong>${escapeHtml(style.name)}</strong><div class="small text-ink-soft catalog-description">${escapeHtml(style.description || 'No description')}</div></td>
        <td><code>${escapeHtml(style.key)}</code></td>
        <td><strong class="text-gold">${escapeHtml(formatMoney(style.pricePerGuest))}</strong></td>
        <td>${catalogAvailabilityBadge(style.available)}</td>
        <td class="catalog-actions"><button class="btn btn-outline-forest btn-sm" type="button" data-dining-style-edit="${escapeHtml(style.id)}">Edit</button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="catalog-empty">No dining styles match these filters.</td></tr>';
  }

  function renderAddOnsCatalog() {
    const rows = document.querySelector('[data-addon-rows]');
    if (!rows) return;
    const query = state.addOnQuery.toLowerCase();
    const filtered = state.addOns.filter((addOn) => {
      const searchable = `${addOn.name || ''} ${addOn.description || ''}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (state.addOnBillingType === 'ALL' || addOn.billingType === state.addOnBillingType)
        && matchesAvailability(addOn, state.addOnAvailability);
    });
    document.querySelector('[data-addon-count]').textContent = String(state.addOns.length);
    rows.innerHTML = filtered.length ? filtered.map((addOn) => `
      <tr>
        <td><strong>${escapeHtml(addOn.name)}</strong><div class="small text-ink-soft catalog-description">${escapeHtml(addOn.description || 'No description')}</div></td>
        <td>${escapeHtml(billingTypeLabel(addOn.billingType))}</td>
        <td><strong class="text-gold">${escapeHtml(formatMoney(addOn.price))}</strong></td>
        <td>${catalogAvailabilityBadge(addOn.available)}</td>
        <td class="catalog-actions"><button class="btn btn-outline-forest btn-sm" type="button" data-addon-edit="${escapeHtml(addOn.id)}">Edit</button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="catalog-empty">No add-ons match these filters.</td></tr>';
  }

  async function loadServicesCatalog() {
    state.services = await adminFetch('/api/admin/services', { method: 'GET' });
    renderServicesCatalog();
  }

  async function loadDiningStylesCatalog() {
    state.diningStyles = await adminFetch('/api/admin/dining-styles', { method: 'GET' });
    renderDiningStylesCatalog();
  }

  async function loadAddOnsCatalog() {
    state.addOns = await adminFetch('/api/admin/addons', { method: 'GET' });
    renderAddOnsCatalog();
  }

  function openServiceEditor(id) {
    const service = state.services.find((item) => String(item.id) === String(id));
    if (!service) return;
    document.querySelector('[data-service-edit-id]').value = service.id;
    document.querySelector('[data-service-edit-name]').value = service.name || '';
    document.querySelector('[data-service-edit-description]').value = service.description || '';
    document.querySelector('[data-service-edit-price]').value = service.basePrice ?? '';
    document.querySelector('[data-service-edit-available]').value = String(Boolean(service.available));
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('serviceEditModal')).show();
  }

  function openDiningStyleEditor(id) {
    const style = state.diningStyles.find((item) => String(item.id) === String(id));
    if (!style) return;
    document.querySelector('[data-dining-style-edit-id]').value = style.id;
    document.querySelector('[data-dining-style-edit-key]').value = style.key || '';
    document.querySelector('[data-dining-style-edit-name]').value = style.name || '';
    document.querySelector('[data-dining-style-edit-description]').value = style.description || '';
    document.querySelector('[data-dining-style-edit-price]').value = style.pricePerGuest ?? '';
    document.querySelector('[data-dining-style-edit-available]').value = String(Boolean(style.available));
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('diningStyleEditModal')).show();
  }

  function openAddOnEditor(id) {
    const addOn = state.addOns.find((item) => String(item.id) === String(id));
    if (!addOn) return;
    document.querySelector('[data-addon-edit-id]').value = addOn.id;
    document.querySelector('[data-addon-edit-name]').value = addOn.name || '';
    document.querySelector('[data-addon-edit-description]').value = addOn.description || '';
    document.querySelector('[data-addon-edit-billing]').value = addOn.billingType || 'PER_GUEST';
    document.querySelector('[data-addon-edit-price]').value = addOn.price ?? '';
    document.querySelector('[data-addon-edit-available]').value = String(Boolean(addOn.available));
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('addOnEditModal')).show();
  }

  async function submitCatalogEdit(event, config) {
    event.preventDefault();
    const button = document.querySelector(config.buttonSelector);
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    setCatalogMessage('');
    try {
      const id = document.querySelector(config.idSelector).value;
      await adminFetch(`${config.path}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.payload())
      });
      window.bootstrap.Modal.getInstance(document.getElementById(config.modalId))?.hide();
      await config.reload();
      setCatalogMessage(`${config.label} updated successfully.`, 'success');
    } catch (error) {
      setCatalogMessage(error.message || `Unable to update this ${config.label.toLowerCase()}.`);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function initServicesPage() {
    if (!document.querySelector('[data-admin-services-page]')) return;
    document.querySelector('[data-service-search]')?.addEventListener('input', (event) => { state.serviceQuery = event.target.value.trim(); renderServicesCatalog(); });
    document.querySelector('[data-service-availability]')?.addEventListener('change', (event) => { state.serviceAvailability = event.target.value; renderServicesCatalog(); });
    document.querySelector('[data-dining-style-search]')?.addEventListener('input', (event) => { state.diningStyleQuery = event.target.value.trim(); renderDiningStylesCatalog(); });
    document.querySelector('[data-dining-style-availability]')?.addEventListener('change', (event) => { state.diningStyleAvailability = event.target.value; renderDiningStylesCatalog(); });
    document.querySelector('[data-addon-search]')?.addEventListener('input', (event) => { state.addOnQuery = event.target.value.trim(); renderAddOnsCatalog(); });
    document.querySelector('[data-addon-billing-type]')?.addEventListener('change', (event) => { state.addOnBillingType = event.target.value; renderAddOnsCatalog(); });
    document.querySelector('[data-addon-availability]')?.addEventListener('change', (event) => { state.addOnAvailability = event.target.value; renderAddOnsCatalog(); });

    document.querySelector('[data-service-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-service-edit]'); if (button) openServiceEditor(button.dataset.serviceEdit); });
    document.querySelector('[data-dining-style-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-dining-style-edit]'); if (button) openDiningStyleEditor(button.dataset.diningStyleEdit); });
    document.querySelector('[data-addon-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-addon-edit]'); if (button) openAddOnEditor(button.dataset.addonEdit); });

    document.querySelector('[data-service-edit-form]')?.addEventListener('submit', (event) => submitCatalogEdit(event, {
      path: '/api/admin/services', idSelector: '[data-service-edit-id]', buttonSelector: '[data-service-edit-save]', modalId: 'serviceEditModal', label: 'Service', reload: loadServicesCatalog,
      payload: () => ({ name: document.querySelector('[data-service-edit-name]').value.trim(), description: document.querySelector('[data-service-edit-description]').value.trim(), basePrice: Number(document.querySelector('[data-service-edit-price]').value), available: document.querySelector('[data-service-edit-available]').value === 'true' })
    }));
    document.querySelector('[data-dining-style-edit-form]')?.addEventListener('submit', (event) => submitCatalogEdit(event, {
      path: '/api/admin/dining-styles', idSelector: '[data-dining-style-edit-id]', buttonSelector: '[data-dining-style-edit-save]', modalId: 'diningStyleEditModal', label: 'Dining style', reload: loadDiningStylesCatalog,
      payload: () => ({ name: document.querySelector('[data-dining-style-edit-name]').value.trim(), description: document.querySelector('[data-dining-style-edit-description]').value.trim(), pricePerGuest: Number(document.querySelector('[data-dining-style-edit-price]').value), available: document.querySelector('[data-dining-style-edit-available]').value === 'true' })
    }));
    document.querySelector('[data-addon-edit-form]')?.addEventListener('submit', (event) => submitCatalogEdit(event, {
      path: '/api/admin/addons', idSelector: '[data-addon-edit-id]', buttonSelector: '[data-addon-edit-save]', modalId: 'addOnEditModal', label: 'Add-on', reload: loadAddOnsCatalog,
      payload: () => ({ name: document.querySelector('[data-addon-edit-name]').value.trim(), description: document.querySelector('[data-addon-edit-description]').value.trim(), billingType: document.querySelector('[data-addon-edit-billing]').value, price: Number(document.querySelector('[data-addon-edit-price]').value), available: document.querySelector('[data-addon-edit-available]').value === 'true' })
    }));

    Promise.allSettled([loadServicesCatalog(), loadDiningStylesCatalog(), loadAddOnsCatalog()]).then((results) => {
      if (results.some((result) => result.status === 'rejected')) setCatalogMessage('Some catalog data could not be loaded. Please try again.');
    });
  }

  function setDashboardCount(key, value) {
    const element = document.querySelector(`[data-admin-dashboard-count="${key}"]`);
    if (element) element.textContent = String(value);
  }

  function setDashboardMessage(message) {
    const element = document.querySelector('[data-admin-dashboard-message]');
    if (!element) return;
    element.className = 'alert alert-warning';
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function renderDashboardBookings(bookings) {
    const count = (status) => bookings.filter((booking) => booking.bookingStatus === status).length;
    setDashboardCount('bookings', bookings.length);
    setDashboardCount('pending', count('PENDING'));
    setDashboardCount('awaitingDeposit', count('AWAITING_DEPOSIT'));
    setDashboardCount('confirmed', count('CONFIRMED'));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = bookings
      .filter((booking) => {
        if (!booking.eventDate || ['CANCELLED', 'COMPLETED'].includes(booking.bookingStatus)) return false;
        const eventDate = new Date(`${booking.eventDate}T00:00:00`);
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today;
      })
      .sort((left, right) => String(left.eventDate).localeCompare(String(right.eventDate)))
      .slice(0, 5);

    const upcomingRows = document.querySelector('[data-admin-upcoming-rows]');
    if (upcomingRows) {
      upcomingRows.innerHTML = upcoming.length
        ? upcoming.map((booking) => `
          <tr>
            <td><strong>${escapeHtml(booking.eventType || 'Event')}</strong><div class="small text-ink-soft">${escapeHtml(booking.bookingReference || '')}</div></td>
            <td>${escapeHtml(booking.customerName || 'Customer')}</td>
            <td>${escapeHtml(booking.venueName || 'Venue not set')}</td>
            <td>${escapeHtml(formatDate(booking.eventDate))}</td>
            <td><span class="status ${statusClass(booking.bookingStatus)}">${escapeHtml(statusLabel(booking.bookingStatus))}</span></td>
          </tr>`).join('')
        : '<tr><td colspan="5" class="text-center py-4 text-ink-soft">No upcoming events.</td></tr>';
    }

    const recent = bookings.slice(0, 5);
    const recentRows = document.querySelector('[data-admin-recent-booking-rows]');
    if (recentRows) {
      recentRows.innerHTML = recent.length
        ? recent.map((booking) => `
          <tr>
            <td><strong>${escapeHtml(booking.bookingReference || `BK-${booking.bookingId}`)}</strong></td>
            <td>${escapeHtml(booking.customerName || 'Customer')}</td>
            <td>${escapeHtml(booking.eventType || 'Event')}</td>
            <td>${escapeHtml(booking.venueName || 'Venue not set')}</td>
            <td>${escapeHtml(formatDate(booking.eventDate))}</td>
            <td><span class="status ${statusClass(booking.bookingStatus)}">${escapeHtml(statusLabel(booking.bookingStatus))}</span></td>
          </tr>`).join('')
        : '<tr><td colspan="6" class="text-center py-4 text-ink-soft">No recent bookings.</td></tr>';
    }
  }

  function renderDashboardQuotations(quotations) {
    const count = (status) => quotations.filter((quotation) => quotation.status === status).length;
    setDashboardCount('quotations', quotations.length);
    ['DRAFT', 'SENT', 'ACCEPTED'].forEach((status) => {
      const element = document.querySelector(`[data-admin-quotation-count="${status}"]`);
      if (element) element.textContent = String(count(status));
    });
    const secondary = document.querySelector('[data-admin-quotation-secondary]');
    if (secondary) {
      secondary.textContent = `Rejected: ${count('REJECTED')} | Expired: ${count('EXPIRED')}`;
    }
  }

  function renderDashboardConsultations(consultations) {
    const activeStatuses = ['REQUESTED', 'SCHEDULED'];
    const active = consultations
      .filter((consultation) => activeStatuses.includes(consultation.status))
      .sort((left, right) => `${left.consultationDate || ''}T${left.startTime || ''}`
        .localeCompare(`${right.consultationDate || ''}T${right.startTime || ''}`));
    const requested = active.filter((consultation) => consultation.status === 'REQUESTED').length;
    const scheduled = active.filter((consultation) => consultation.status === 'SCHEDULED').length;

    const activeCount = document.querySelector('[data-admin-consultation-active]');
    if (activeCount) activeCount.textContent = String(active.length);
    const summary = document.querySelector('[data-admin-consultation-summary]');
    if (summary) summary.textContent = `Requested: ${requested} | Scheduled: ${scheduled}`;

    const list = document.querySelector('[data-admin-consultation-list]');
    if (!list) return;
    list.innerHTML = active.length
      ? active.slice(0, 3).map((consultation) => {
        const time = formatTime(consultation.startTime);
        const planner = consultation.planner ? ` | ${escapeHtml(consultation.planner)}` : '';
        return `<li><strong>${escapeHtml(formatDate(consultation.consultationDate))}${time ? ` at ${escapeHtml(time)}` : ''}</strong><br><span class="small text-ink-soft">${escapeHtml(consultation.consultationType || 'Consultation')} | Customer #${escapeHtml(consultation.customerId || '-')}${planner}</span></li>`;
      }).join('')
      : '<li><span class="text-ink-soft">No active consultations.</span></li>';
  }

  function setDashboardTableError(selector, colspan, message) {
    const element = document.querySelector(selector);
    if (element) element.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4 text-ink-soft">${escapeHtml(message)}</td></tr>`;
  }

  async function initDashboardPage() {
    if (!document.querySelector('[data-admin-dashboard-page]')) return;
    const failures = [];
    const loaders = [
      {
        name: 'bookings',
        path: '/api/admin/bookings',
        success: renderDashboardBookings,
        failure: () => {
          setDashboardTableError('[data-admin-upcoming-rows]', 5, 'Upcoming events are unavailable.');
          setDashboardTableError('[data-admin-recent-booking-rows]', 6, 'Recent bookings are unavailable.');
        }
      },
      {
        name: 'customers',
        path: '/api/admin/customers',
        success: (users) => setDashboardCount('customers', users.length)
      },
      {
        name: 'venues',
        path: '/api/admin/venues',
        success: (venues) => setDashboardCount('venues', venues.length)
      },
      {
        name: 'services',
        path: '/api/admin/services',
        success: (services) => setDashboardCount('services', services.length)
      },
      {
        name: 'quotations',
        path: '/api/admin/quotations',
        success: renderDashboardQuotations,
        failure: () => {
          const secondary = document.querySelector('[data-admin-quotation-secondary]');
          if (secondary) secondary.textContent = 'Quotation summary is unavailable.';
        }
      },
      {
        name: 'consultations',
        path: '/api/admin/consultations',
        success: renderDashboardConsultations,
        failure: () => {
          const summary = document.querySelector('[data-admin-consultation-summary]');
          const list = document.querySelector('[data-admin-consultation-list]');
          if (summary) summary.textContent = 'Consultation summary is unavailable.';
          if (list) list.innerHTML = '';
        }
      }
    ];

    await Promise.all(loaders.map(async (loader) => {
      try {
        const data = await adminFetch(loader.path, { method: 'GET' });
        loader.success(Array.isArray(data) ? data : []);
      } catch (error) {
        failures.push(loader.name);
        loader.failure?.();
      }
    }));

    setDashboardMessage(failures.length
      ? `Some dashboard data could not be loaded: ${failures.join(', ')}.`
      : '');
  }

  function init() {
    updateAdminIdentity();
    initSignOut();
    initBookingsPage();
    initPaymentsPage();
    initQuotationsPage();
    initCustomersPage();
    initConsultationsPage();
    initVenuesPage();
    initServicesPage();
    initDashboardPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
