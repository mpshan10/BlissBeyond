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
    bookingType: 'ALL',
    pendingAction: null,
    payments: [],
    paymentQuery: '',
    paymentStatus: 'ALL',
    paymentType: 'ALL',
    pendingPayment: null,
    paymentAccounts: [],
    currentPaymentAccount: null,
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
    addonIncludedItems: [],
    addonIncludedAddonId: null,
    venues: [],
    venueQuery: '',
    venueType: 'ALL',
    venueAvailability: 'ALL',
    packages: [],
    packageQuery: '',
    packageCategory: 'ALL',
    consultations: [],
    consultationQuery: '',
    consultationStatus: 'ALL',
    currentConsultation: null,
    pendingConsultationAction: null
    ,notifications: []
  };
  let pendingVenueEditPhoto = null;
  let pendingVenueAddPhoto = null;
  let currentVenueEditImage = null;
  let pendingPackagePhoto = null;
  let currentPackageImage = null;
  let packagePhotoPreviewUrl = null;
  let adminNotificationLoadPromise = null;
  let adminNotificationsLoadedAt = 0;
  const ADMIN_NOTIFICATION_CACHE_TTL_MS = 30_000;

  function currentLocalPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function isTrustedNotificationPath(value) {
    const path = String(value || '').trim();
    if (!path || !path.startsWith('/prototype/') || path.startsWith('//') || path.includes('\\') || path.includes('//')) return false;
    try {
      const url = new URL(path, window.location.origin);
      return url.origin === window.location.origin && url.pathname.startsWith('/prototype/');
    } catch (error) {
      return false;
    }
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

  function isBookingFullyPaid(booking) {
    const total = Number(booking.estimatedTotal);
    const paid = Number(booking.paidAmount);
    return Number.isFinite(total) && Number.isFinite(paid) && paid >= total;
  }

  function hasBookingEnded(booking) {
    if (!booking.eventDate || !booking.endTime) return false;
    const end = new Date(`${booking.eventDate}T${booking.endTime}`);
    return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
  }

  function actionButtons(booking) {
    const id = escapeHtml(booking.bookingId);
    const buttons = [];
    buttons.push(`<button class="btn btn-outline-forest btn-sm" type="button" data-booking-view data-booking-id="${id}">View</button>`);
    if (booking.bookingStatus === 'PENDING') {
      const isPackage = String(booking.bookingType || '').toUpperCase() === 'PACKAGE';
      if (isPackage || booking.quotationStatus === 'ACCEPTED') {
        buttons.push(`<button class="btn btn-gold btn-sm" type="button" data-booking-action="approve" data-booking-id="${id}">Approve</button>`);
      } else {
        buttons.push('<span class="booking-actions-empty">Awaiting quotation acceptance</span>');
      }
    }
    const canComplete = booking.bookingStatus === 'CONFIRMED'
      && isBookingFullyPaid(booking)
      && hasBookingEnded(booking);
    if (canComplete) {
      buttons.push(`<button class="btn btn-outline-forest btn-sm" type="button" data-booking-action="complete" data-booking-id="${id}">Complete</button>`);
    }
    const paidConfirmed = booking.bookingStatus === 'CONFIRMED' && Number(booking.paidAmount || 0) > 0;
    if (['PENDING', 'AWAITING_DEPOSIT'].includes(booking.bookingStatus)
        || (booking.bookingStatus === 'CONFIRMED' && !paidConfirmed)) {
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
        && (state.status === 'ALL' || booking.bookingStatus === state.status)
        && (state.bookingType === 'ALL' || booking.bookingType === state.bookingType);
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-ink-soft">No bookings found.</td></tr>';
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
      const isPackage = String(booking.bookingType || '').toUpperCase() === 'PACKAGE';
      const formattedTotal = formatMoney(booking.estimatedTotal).replace(/^MMK\s*/, '');
      return `
        <tr>
          <td><span class="booking-cell-primary">${escapeHtml(booking.bookingReference || `BK-${booking.bookingId}`)}</span><span class="booking-cell-secondary">Created ${escapeHtml(formatDateTime(booking.createdAt))}</span>${quotation}</td>
          <td><span class="booking-cell-primary">${escapeHtml(booking.customerName || 'Customer')}</span><span class="booking-cell-secondary booking-customer-email" title="${escapeHtml(booking.customerEmail || '')}">${escapeHtml(booking.customerEmail || '')}</span></td>
          <td><span class="bb-badge">${isPackage ? 'Package' : 'Customize'}</span></td>
          <td><span>${escapeHtml(booking.eventType || 'Event')}</span><span class="booking-cell-secondary">Event #${escapeHtml(booking.eventId || '-')} | ${escapeHtml(booking.guestCount ?? '-')} guests</span></td>
          <td><span class="booking-venue">${escapeHtml(booking.venueName || 'Venue not set')}</span></td>
          <td><div class="booking-date-time"><span class="booking-date-line"><i class="bi bi-calendar3"></i>${escapeHtml(formatDate(booking.eventDate))}</span><span class="booking-time-line"><i class="bi bi-clock"></i>${escapeHtml(timeRange || 'Time not set')}</span></div></td>
          <td><span class="booking-total-currency">MMK</span><span class="booking-total-amount">${escapeHtml(formattedTotal)}</span></td>
          <td><span class="status ${statusClass(booking.paymentStatus)}">${escapeHtml(statusLabel(booking.paymentStatus || 'NOT_RECORDED'))}</span><span class="booking-cell-secondary">Paid ${escapeHtml(formatMoney(booking.paidAmount))}</span></td>
          <td><span class="status ${statusClass(booking.bookingStatus)}">${escapeHtml(statusLabel(booking.bookingStatus))}</span></td>
          <td>${actionButtons(booking)}</td>
        </tr>`;
    }).join('');
  }

  async function loadBookings() {
    setBookingMessage('');
    const tbody = document.querySelector('[data-admin-booking-rows]');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-ink-soft">Loading bookings...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/bookings', { method: 'GET' });
      state.bookings = Array.isArray(data) ? data : [];
      updateBookingStats(state.bookings);
      renderBookings();
    } catch (error) {
      setBookingMessage(error.message || 'Unable to load bookings.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-ink-soft">Unable to load bookings.</td></tr>';
    }
  }

  function renderPackageInclusions(inclusions) {
    const groups = Array.isArray(inclusions)
      ? inclusions
      : inclusions && typeof inclusions === 'object' && Array.isArray(inclusions.services)
        ? inclusions.services
        : [];
    if (!groups.length) {
      return '<div class="text-ink-soft">Package inclusion details unavailable.</div>';
    }
    return groups.map((group) => {
      const items = Array.isArray(group?.inclusions) ? group.inclusions : [];
      const inclusionList = items.length
        ? `<ul class="mb-0 ps-3">${items.map((item) => {
          const label = typeof item === 'object' ? (item?.label || item?.name || item?.title || '') : item;
          return label ? `<li>${escapeHtml(label)}</li>` : '';
        }).join('')}</ul>`
        : '<div class="small text-ink-soft">Included</div>';
      return `<div class="border rounded-3 p-3 h-100"><h6 class="mb-2">${escapeHtml(group?.serviceName || 'Included service')}</h6>${inclusionList}</div>`;
    }).join('');
  }

  function renderBookingDetail(detail) {
    const content = document.querySelector('[data-booking-detail-content]');
    const message = document.querySelector('[data-booking-detail-message]');
    const isPackage = detail.bookingType === 'PACKAGE';
    document.querySelector('[data-booking-detail="reference"]').textContent = detail.bookingReference || 'Booking';
    document.querySelector('[data-booking-detail="type"]').textContent = isPackage ? 'Package booking' : 'Customize booking';
    message.classList.add('d-none');
    const payments = detail.payments?.records || [];
    const paymentRows = payments.length ? payments.map((payment) => `<tr><td>${escapeHtml(statusLabel(payment.paymentType))}</td><td>${escapeHtml(formatMoney(payment.amount))}</td><td>${escapeHtml(statusLabel(payment.status))}</td><td>${escapeHtml(payment.method || 'Not provided')}</td><td>${escapeHtml(payment.transactionReference || 'Not provided')}</td><td>${escapeHtml(formatDateTime(payment.paidAt))}</td></tr>`).join('') : '<tr><td colspan="6">No payment records.</td></tr>';
    const packageDetails = detail.packageDetails;
    const packageBlock = isPackage && packageDetails ? `<section class="booking-detail-section border rounded-3 p-3"><div class="stat-label mb-1">Package Snapshot</div><h5 class="mb-3">${escapeHtml(packageDetails.name || 'Package')}</h5><div class="row g-3 mb-4"><div class="col-sm-4"><div class="stat-label mb-1">Event Type</div><div>${escapeHtml(packageDetails.category || 'Not recorded')}</div></div><div class="col-sm-4"><div class="stat-label mb-1">Package Price</div><div class="fw-semibold">${escapeHtml(formatMoney(packageDetails.bookedPrice))}</div></div><div class="col-sm-4"><div class="stat-label mb-1">Package Guest Limit</div><div>Up to ${escapeHtml(packageDetails.maxGuests ?? 'Not recorded')} guests</div></div><div class="col-12"><div class="stat-label mb-1">Venue</div><div>${escapeHtml(packageDetails.snapshotVenueName || 'Not recorded')}</div></div></div><div class="stat-label mb-2">Package Inclusions</div><div class="row g-3">${renderPackageInclusions(packageDetails.inclusions)}</div></section>` : '';
    const customBlock = !isPackage && detail.customizeDetails ? `<h6>Saved Service Selections</h6><ul>${(detail.customizeDetails.services || []).map((service) => `<li>${escapeHtml(service.name || 'Service')} - ${escapeHtml(formatMoney(service.price))}</li>`).join('') || '<li>No selected services recorded.</li>'}</ul><p><strong>Total:</strong> ${escapeHtml(formatMoney(detail.customizeDetails.total))}</p>` : '';
    const quotation = isPackage
      ? '<p class="text-ink-soft">Quotation not required for package bookings.</p>'
      : (detail.quotation ? `<h6>Quotation</h6><p>#${escapeHtml(detail.quotation.id)} | ${escapeHtml(statusLabel(detail.quotation.status))} | ${escapeHtml(formatMoney(detail.quotation.total))}</p>` : '<p class="text-ink-soft">Quotation not recorded.</p>');
    const consultations = (detail.consultations || []).map((item) => `<li>${escapeHtml(statusLabel(item.status))} | ${escapeHtml(item.consultationType || 'Consultation')} | ${escapeHtml(formatDate(item.consultationDate))} ${escapeHtml(formatTime(item.startTime))}</li>`).join('') || '<li>No consultation records.</li>';
    const venueName = isPackage ? (packageDetails?.snapshotVenueName || detail.venue?.name) : detail.venue?.name;
    content.innerHTML = `<div class="row g-3"><div class="col-md-6"><h6>Customer</h6><p>${escapeHtml(detail.customer?.name || 'Not recorded')}<br>${escapeHtml(detail.customer?.email || '')}<br>${escapeHtml(detail.customer?.phone || '')}</p></div><div class="col-md-6"><h6>Booking</h6><p>Status: <strong>${escapeHtml(statusLabel(detail.bookingStatus))}</strong><br>Created: ${escapeHtml(formatDateTime(detail.createdAt))}</p></div><div class="col-md-6"><h6>Event</h6><p>${escapeHtml(detail.event?.eventType || 'Not recorded')}<br>${escapeHtml(formatDate(detail.event?.eventDate))} | ${escapeHtml(formatTime(detail.event?.startTime))} - ${escapeHtml(formatTime(detail.event?.endTime))}<br>${escapeHtml(detail.event?.guestCount ?? '-')} guests</p></div><div class="col-md-6"><h6>Venue</h6><p>${escapeHtml(venueName || 'Not recorded')}<br>${escapeHtml(detail.venue?.location || '')}</p></div><div class="col-12">${packageBlock}${customBlock}</div><div class="col-12"><h6>Payments</h6><p>Paid: ${escapeHtml(formatMoney(detail.payments?.paidAmount))} | Pending: ${escapeHtml(formatMoney(detail.payments?.pendingAmount))}</p><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Method</th><th>Reference</th><th>Paid at</th></tr></thead><tbody>${paymentRows}</tbody></table></div></div><div class="col-12">${quotation}</div><div class="col-12"><h6>Consultations</h6><ul>${consultations}</ul></div></div>`;
  }

  async function openBookingDetail(bookingId) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingDetailModal'));
    const message = document.querySelector('[data-booking-detail-message]');
    const content = document.querySelector('[data-booking-detail-content]');
    message.classList.add('d-none');
    content.innerHTML = '<p class="text-ink-soft">Loading booking details...</p>';
    modal.show();
    try { renderBookingDetail(await adminFetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}`)); }
    catch (error) { message.textContent = error.message || 'Unable to load booking details.'; message.classList.remove('d-none'); content.innerHTML = ''; }
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
    document.querySelector('[data-admin-booking-type-filter]')?.addEventListener('change', (event) => {
      state.bookingType = event.target.value;
      renderBookings();
    });
    document.querySelector('[data-admin-booking-rows]')?.addEventListener('click', (event) => {
      const view = event.target.closest('[data-booking-view]');
      if (view) { openBookingDetail(view.dataset.bookingId); return; }
      const button = event.target.closest('[data-booking-action]');
      if (button) openActionConfirmation(button.dataset.bookingAction, button.dataset.bookingId);
    });
    document.querySelector('[data-booking-action-confirm]')?.addEventListener('click', performBookingAction);
    loadBookings().then(() => {
      const bookingId = new URLSearchParams(window.location.search).get('bookingId');
      if (bookingId) openBookingDetail(bookingId);
    });
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
      const destination = [payment.destinationProvider, payment.destinationAccountName, payment.destinationAccountNumber]
        .filter(Boolean)
        .join(' · ');
      const method = [payment.paymentMethod, destination, payment.transactionReference].filter(Boolean);
      const action = payment.paymentStatus === 'PENDING'
        ? `<div class="d-flex flex-wrap gap-2"><button class="btn btn-gold btn-sm" type="button" data-payment-confirm data-payment-id="${escapeHtml(payment.paymentId)}">Confirm</button><button class="btn btn-outline-danger btn-sm" type="button" data-payment-reject data-payment-id="${escapeHtml(payment.paymentId)}">Reject</button></div>`
        : '<span class="small text-ink-soft">No actions</span>';
      return `
        <tr data-payment-row="${escapeHtml(payment.paymentId)}">
          <td><strong>PAY-${String(payment.paymentId).padStart(4, '0')}</strong><div class="small text-ink-soft">ID ${escapeHtml(payment.paymentId)}</div></td>
          <td><strong>${escapeHtml(payment.bookingReference || `BK-${payment.bookingId}`)}</strong><div class="small text-ink-soft">Quotation #${escapeHtml(payment.quotationId || '-')}</div></td>
          <td><strong>${escapeHtml(payment.customerName || 'Customer')}</strong><div class="small text-ink-soft">${escapeHtml(payment.customerEmail || '')}</div></td>
          <td>${escapeHtml(payment.eventType || 'Event')}<div class="small text-ink-soft">${escapeHtml(payment.venueName || 'Venue not set')} · Booking ${escapeHtml(statusLabel(payment.bookingStatus || 'UNKNOWN'))}</div></td>
          <td><span class="bb-badge">${escapeHtml(payment.bookingType === 'PACKAGE' ? 'Package' : 'Customize')}</span><div class="small text-ink-soft">${escapeHtml(statusLabel(payment.paymentType))}</div></td>
          <td><strong class="text-gold">${escapeHtml(formatMoney(payment.amount))}</strong></td>
          <td><span class="status ${statusClass(payment.paymentStatus)}">${escapeHtml(statusLabel(payment.paymentStatus))}</span></td>
          <td>${method.length ? method.map(escapeHtml).join('<br>') : '<span class="text-ink-soft">Not provided</span>'}<div class="small text-ink-soft mt-1">${payment.submittedAt || payment.createdAt || payment.paidAt ? `Submitted ${escapeHtml(formatDateTime(payment.submittedAt || payment.createdAt || payment.paidAt))}` : 'Submitted date not recorded'}</div></td>
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
      const deepLinkId = new URLSearchParams(window.location.search).get('paymentId');
      if (deepLinkId) focusPayment(deepLinkId);
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to load payments.');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-ink-soft">Unable to load payments.</td></tr>';
    }
  }

  function openPaymentConfirmation(paymentId) {
    const payment = state.payments.find((item) => String(item.paymentId) === String(paymentId));
    if (!payment || payment.paymentStatus !== 'PENDING') return;
    state.pendingPayment = payment;
    document.querySelector('[data-payment-rejection-field]')?.classList.add('d-none');
    document.querySelector('[data-payment-confirm-submit]')?.classList.remove('d-none');
    document.querySelector('[data-payment-reject-submit]')?.classList.add('d-none');
    document.querySelector('[data-payment-modal-title]').textContent = `Confirm ${statusLabel(payment.paymentType)} Payment`;
    document.querySelector('[data-payment-modal-customer]').textContent = payment.customerName || 'Customer';
    document.querySelector('[data-payment-modal-booking]').textContent = payment.bookingReference || `Booking #${payment.bookingId}`;
    document.querySelector('[data-payment-modal-type]').textContent = `${payment.bookingType === 'PACKAGE' ? 'Package' : 'Customize'} · ${statusLabel(payment.paymentType)}`;
    document.querySelector('[data-payment-modal-amount]').textContent = formatMoney(payment.amount);
    const methodInput = document.querySelector('[data-payment-method]');
    methodInput.value = payment.paymentMethod || '';
    methodInput.readOnly = Boolean(payment.paymentAccountId);
    document.querySelector('[data-payment-reference]').value = payment.transactionReference || '';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentConfirmModal')).show();
  }

  function openPaymentRejection(paymentId) {
    const payment = state.payments.find((item) => String(item.paymentId) === String(paymentId));
    if (!payment || payment.paymentStatus !== 'PENDING') return;
    state.pendingPayment = payment;
    document.querySelector('[data-payment-modal-title]').textContent = `Reject ${statusLabel(payment.paymentType)} Payment`;
    document.querySelector('[data-payment-modal-customer]').textContent = payment.customerName || 'Customer';
    document.querySelector('[data-payment-modal-booking]').textContent = payment.bookingReference || `Booking #${payment.bookingId}`;
    document.querySelector('[data-payment-modal-type]').textContent = `${payment.bookingType === 'PACKAGE' ? 'Package' : 'Customize'} · ${statusLabel(payment.paymentType)}`;
    document.querySelector('[data-payment-modal-amount]').textContent = formatMoney(payment.amount);
    document.querySelector('[data-payment-rejection-reason]').value = '';
    document.querySelector('[data-payment-rejection-field]')?.classList.remove('d-none');
    document.querySelector('[data-payment-confirm-submit]')?.classList.add('d-none');
    document.querySelector('[data-payment-reject-submit]')?.classList.remove('d-none');
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentConfirmModal')).show();
  }

  function focusPayment(paymentId) {
    const row = document.querySelector(`[data-payment-row="${CSS.escape(String(paymentId))}"]`);
    row?.classList.add('table-warning');
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  async function rejectPayment() {
    if (!state.pendingPayment) return;
    const button = document.querySelector('[data-payment-reject-submit]');
    const reason = document.querySelector('[data-payment-rejection-reason]').value.trim();
    if (!reason) { setPaymentMessage('A rejection reason is required.'); return; }
    button.disabled = true;
    try {
      await adminFetch(`/api/admin/payments/${encodeURIComponent(state.pendingPayment.paymentId)}/reject`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
      });
      window.bootstrap.Modal.getInstance(document.getElementById('paymentConfirmModal'))?.hide();
      await loadPayments();
      setPaymentMessage('Payment rejected and customer notified.', 'success');
    } catch (error) { setPaymentMessage(error.message || 'Unable to reject this payment.'); }
    finally { button.disabled = false; state.pendingPayment = null; }
  }

  function setPaymentAccountError(message) {
    const element = document.querySelector('[data-payment-account-error]');
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('d-none', !message);
  }

  function paymentAccountMethodLabel(method) {
    return {
      KBZ_BANK: 'KBZ Bank',
      AYA_BANK: 'AYA Bank',
      CB_BANK: 'CB Bank',
      KBZPAY: 'KBZPay',
      WAVEPAY: 'WavePay',
      CASH: 'Cash',
      BANK_TRANSFER: 'Bank Transfer'
    }[method] || statusLabel(method);
  }

  function renderPaymentAccounts() {
    const list = document.querySelector('[data-payment-account-list]');
    if (!list) return;
    if (!state.paymentAccounts.length) {
      list.innerHTML = '<div class="col-12 text-center py-4"><i class="bi bi-bank fs-2 text-gold"></i><p class="text-ink-soft mt-2 mb-0">No payment destinations configured yet. Add the first destination when real account details are available.</p></div>';
      return;
    }
    list.innerHTML = state.paymentAccounts.map((account) => {
      const details = [account.accountName, account.accountNumber, account.instructions].filter(Boolean);
      return `<div class="col-md-6 col-xl-4"><article class="payment-account-card ${account.available ? '' : 'is-unavailable'}">
        <div class="d-flex justify-content-between align-items-start gap-2"><div><span class="eyebrow">${escapeHtml(paymentAccountMethodLabel(account.paymentMethod))}</span><h3 class="h5 mt-1 mb-0">${escapeHtml(account.providerName)}</h3></div><span class="status ${account.available ? 'confirmed' : 'cancelled'}">${account.available ? 'Available' : 'Disabled'}</span></div>
        <div class="payment-account-card__details">${details.length ? details.map(escapeHtml).join('<br>') : 'No additional details'}</div>
        <div class="d-flex flex-wrap gap-2 mt-auto"><button class="btn btn-outline-forest btn-sm" type="button" data-payment-account-edit="${escapeHtml(account.id)}">Edit</button><button class="btn ${account.available ? 'btn-outline-danger' : 'btn-gold'} btn-sm" type="button" data-payment-account-toggle="${escapeHtml(account.id)}">${account.available ? 'Disable' : 'Enable'}</button></div>
      </article></div>`;
    }).join('');
  }

  async function loadPaymentAccounts() {
    const list = document.querySelector('[data-payment-account-list]');
    if (!list) return;
    try {
      const accounts = await adminFetch('/api/admin/payment-accounts', { method: 'GET' });
      state.paymentAccounts = Array.isArray(accounts) ? accounts : [];
      renderPaymentAccounts();
    } catch (error) {
      list.innerHTML = '<div class="col-12 text-danger py-4 text-center">Unable to load payment destinations.</div>';
      setPaymentMessage(error.message || 'Unable to load payment destinations.');
    }
  }

  function openPaymentAccountModal(account = null) {
    state.currentPaymentAccount = account;
    setPaymentAccountError('');
    document.querySelector('[data-payment-account-modal-title]').textContent = account ? 'Edit Payment Destination' : 'Add Payment Destination';
    document.querySelector('[data-payment-account-key]').value = account?.accountKey || '';
    document.querySelector('[data-payment-account-method]').value = account?.paymentMethod || '';
    document.querySelector('[data-payment-account-provider]').value = account?.providerName || '';
    document.querySelector('[data-payment-account-name]').value = account?.accountName || '';
    document.querySelector('[data-payment-account-number]').value = account?.accountNumber || '';
    document.querySelector('[data-payment-account-instructions]').value = account?.instructions || '';
    document.querySelector('[data-payment-account-order]').value = String(account?.displayOrder ?? 0);
    document.querySelector('[data-payment-account-available]').checked = account?.available ?? true;
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentAccountModal')).show();
  }

  async function savePaymentAccount(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = form.querySelector('[data-payment-account-save]');
    const payload = {
      accountKey: form.querySelector('[data-payment-account-key]').value.trim(),
      paymentMethod: form.querySelector('[data-payment-account-method]').value,
      providerName: form.querySelector('[data-payment-account-provider]').value.trim(),
      accountName: form.querySelector('[data-payment-account-name]').value.trim() || null,
      accountNumber: form.querySelector('[data-payment-account-number]').value.trim() || null,
      instructions: form.querySelector('[data-payment-account-instructions]').value.trim() || null,
      displayOrder: Number(form.querySelector('[data-payment-account-order]').value),
      available: form.querySelector('[data-payment-account-available]').checked
    };
    button.disabled = true;
    setPaymentAccountError('');
    try {
      const path = state.currentPaymentAccount
        ? `/api/admin/payment-accounts/${encodeURIComponent(state.currentPaymentAccount.id)}`
        : '/api/admin/payment-accounts';
      await adminFetch(path, {
        method: state.currentPaymentAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.bootstrap.Modal.getInstance(document.getElementById('paymentAccountModal'))?.hide();
      await loadPaymentAccounts();
      setPaymentMessage('Payment destination saved successfully.', 'success');
    } catch (error) {
      setPaymentAccountError(error.message || 'Unable to save this payment destination.');
    } finally {
      button.disabled = false;
    }
  }

  async function togglePaymentAccount(id) {
    const account = state.paymentAccounts.find((item) => String(item.id) === String(id));
    if (!account) return;
    try {
      await adminFetch(`/api/admin/payment-accounts/${encodeURIComponent(id)}/${account.available ? 'disable' : 'enable'}`, { method: 'PATCH' });
      await loadPaymentAccounts();
      setPaymentMessage(`Payment destination ${account.available ? 'disabled' : 'enabled'} successfully.`, 'success');
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to update payment destination availability.');
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
      const rejectButton = event.target.closest('[data-payment-reject]');
      if (rejectButton) openPaymentRejection(rejectButton.dataset.paymentId);
    });
    document.querySelector('[data-payment-confirm-submit]')?.addEventListener('click', confirmPayment);
    document.querySelector('[data-payment-reject-submit]')?.addEventListener('click', rejectPayment);
    document.querySelector('[data-payment-account-add]')?.addEventListener('click', () => openPaymentAccountModal());
    document.querySelector('[data-payment-account-form]')?.addEventListener('submit', savePaymentAccount);
    document.querySelector('[data-payment-account-list]')?.addEventListener('click', (event) => {
      const edit = event.target.closest('[data-payment-account-edit]');
      if (edit) {
        const account = state.paymentAccounts.find((item) => String(item.id) === edit.dataset.paymentAccountEdit);
        if (account) openPaymentAccountModal(account);
      }
      const toggle = event.target.closest('[data-payment-account-toggle]');
      if (toggle) void togglePaymentAccount(toggle.dataset.paymentAccountToggle);
    });
    loadPaymentAccounts();
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
      const deepLinkId = new URLSearchParams(window.location.search).get('quotationId');
      if (deepLinkId) openQuotationDetail(deepLinkId);
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
    const bookingStatus = String(quotation.bookingStatus || '').toUpperCase();
    const activeBooking = bookingStatus !== 'CANCELLED' && bookingStatus !== 'COMPLETED';
    const canRevise = quotation.status === 'REJECTED' && !isPackage && activeBooking;
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
    document.querySelector('[data-quotation-revise]')?.classList.toggle('d-none', !canRevise);
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

  async function reviseQuotation() {
    const quotation = state.currentQuotation;
    if (!quotation || quotation.status !== 'REJECTED') return;
    const button = document.querySelector('[data-quotation-revise]');
    if (button) { button.disabled = true; button.textContent = 'Revising...'; }
    try {
      const revised = await adminFetch(`/api/admin/quotations/${encodeURIComponent(quotation.quotationId)}/revise`, { method: 'PATCH' });
      populateQuotationDetail(revised);
      await loadQuotations();
      setQuotationMessage('Quotation reopened as a draft for revision.', 'success');
    } catch (error) {
      setQuotationMessage(error.message || 'Unable to revise this quotation.');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Revise / Re-quote'; }
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
    document.querySelector('[data-quotation-revise]')?.addEventListener('click', reviseQuotation);
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
      if (hasConsultationEnded(consultation)) {
        buttons.push(`<button class="btn btn-gold btn-sm" type="button" data-consultation-action="complete" data-consultation-id="${id}">Complete</button>`);
      }
      buttons.push(`<button class="btn btn-outline-danger btn-sm" type="button" data-consultation-action="cancel" data-consultation-id="${id}">Cancel</button>`);
    }
    return `<div class="consultation-actions">${buttons.join('')}</div>`;
  }

  function hasConsultationEnded(consultation) {
    if (!consultation.consultationDate || !consultation.endTime) return false;
    const end = new Date(`${consultation.consultationDate}T${consultation.endTime}`);
    return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
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
      const consultationId = new URLSearchParams(window.location.search).get('consultationId');
      if (consultationId) await openConsultationDetail(consultationId);
    } catch (error) {
      setConsultationMessage(error.message || 'Unable to load consultations.');
      if (rows) rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Unable to load consultations.</td></tr>';
    }
  }

  async function loadAdminPlannerOptions() {
    const select = document.querySelector('[data-admin-consultation-schedule-planner]');
    if (!select) return;
    try {
      const planners = await adminFetch('/api/admin/consultations/planners', { method: 'GET' });
      select.replaceChildren(new Option('Select Planner', ''));
      (Array.isArray(planners) ? planners : []).forEach((planner) => {
        select.appendChild(new Option(`${planner.name} - ${planner.specialty}`, planner.name));
      });
    } catch (error) {
      select.replaceChildren(new Option('Unable to load planners', ''));
      select.disabled = true;
      setConsultationMessage('Unable to load planner options.');
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
        detailItem('Related Booking', consultation.bookingId ? `BK-${String(consultation.bookingId).padStart(4, '0')}` : 'General consultation'),
        detailItem('Booking Mode', consultation.bookingMode || 'Not linked'),
        detailItem('Event', consultation.eventType || 'Not linked'),
        detailItem('Venue', consultation.venueName || 'Not linked'),
        detailItem('Event Date', consultation.eventDate ? formatDate(consultation.eventDate) : 'Not linked'),
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
    void loadAdminPlannerOptions();
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
      const imageUrl = venue.image && String(venue.image).startsWith('/uploads/') ? window.bbApiUrl(venue.image) : venue.image;
      const image = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="" data-venue-image><span class="venue-admin-thumb-placeholder d-none"><i class="bi bi-building"></i></span>`
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

  function updateVenuePreview(path, selector = '[data-admin-venue-preview]') {
    const image = document.querySelector(selector);
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
    image.src = value.startsWith('/uploads/') ? window.bbApiUrl(value) : value;
  }

  function validateVenuePhoto(file) {
    if (!file) return 'Please choose an image.';
    if (file.size === 0) return 'The selected image is empty.';
    if (file.size > 5 * 1024 * 1024) return 'Venue image must be 5 MB or smaller.';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      return 'Venue image must be a JPG, PNG, or WebP image.';
    }
    return '';
  }

  function previewVenuePhoto(file, selector) {
    const validationMessage = validateVenuePhoto(file);
    if (validationMessage) {
      updateVenuePreview('', selector);
      setVenueMessage(validationMessage);
      return false;
    }
    const previewUrl = URL.createObjectURL(file);
    const image = document.querySelector(selector);
    if (image) {
      image.onload = () => URL.revokeObjectURL(previewUrl);
      image.src = previewUrl;
      image.classList.remove('d-none');
      image.nextElementSibling?.classList.add('d-none');
    }
    return true;
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
    pendingVenueEditPhoto = null;
    currentVenueEditImage = venue.image || null;
    const photoInput = document.querySelector('[data-admin-venue-edit-photo]');
    if (photoInput) photoInput.value = '';
    document.querySelector('[data-admin-venue-edit-website]').value = venue.websiteUrl || '';
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
          image: currentVenueEditImage,
          websiteUrl: document.querySelector('[data-admin-venue-edit-website]').value.trim(),
          available: document.querySelector('[data-admin-venue-edit-available]').value === 'true'
        })
      });
      if (pendingVenueEditPhoto) {
        await adminFetch(`/api/admin/venues/${encodeURIComponent(id)}/photo`, {
          method: 'POST',
          body: (() => { const form = new FormData(); form.append('photo', pendingVenueEditPhoto); return form; })()
        });
      }
      pendingVenueEditPhoto = null;
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
    pendingVenueAddPhoto = null;
    updateVenuePreview('', '[data-admin-venue-add-preview]');
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
      const data = await adminFetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.querySelector('[data-admin-venue-add-name]').value.trim(),
          type: document.querySelector('[data-admin-venue-add-type]').value.trim(),
          location: document.querySelector('[data-admin-venue-add-location]').value.trim(),
          description: document.querySelector('[data-admin-venue-add-description]').value.trim(),
          capacity: optionalVenueCreateNumber('[data-admin-venue-add-capacity]'),
          price: optionalVenueCreateNumber('[data-admin-venue-add-price]'),
          image: null,
          websiteUrl: document.querySelector('[data-admin-venue-add-website]').value.trim(),
          available: document.querySelector('[data-admin-venue-add-available]').value === 'true'
        })
      });
      if (pendingVenueAddPhoto && data?.id) {
        await adminFetch(`/api/admin/venues/${encodeURIComponent(data.id)}/photo`, {
          method: 'POST',
          body: (() => { const form = new FormData(); form.append('photo', pendingVenueAddPhoto); return form; })()
        });
      }
      pendingVenueAddPhoto = null;
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
    document.querySelector('[data-admin-venue-edit-photo]')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0] || null;
      if (previewVenuePhoto(file, '[data-admin-venue-preview]')) {
        pendingVenueEditPhoto = file;
        setVenueMessage('');
      } else {
        pendingVenueEditPhoto = null;
        event.target.value = '';
      }
    });
    document.querySelector('[data-admin-venue-add-photo]')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0] || null;
      if (previewVenuePhoto(file, '[data-admin-venue-add-preview]')) {
        pendingVenueAddPhoto = file;
        setVenueMessage('');
      } else {
        pendingVenueAddPhoto = null;
        event.target.value = '';
      }
    });
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

  function setPackageMessage(message, variant = 'danger') {
    const element = document.querySelector('[data-admin-package-message]');
    if (!element) return;
    element.className = `alert alert-${variant}`;
    element.textContent = message;
    element.classList.toggle('d-none', !message);
  }

  function resolveAdminImage(value) {
    const raw = String(value || '').trim();
    return raw.startsWith('/uploads/') ? window.bbApiUrl(raw) : raw;
  }

  function updatePackagePreview(value) {
    const image = document.querySelector('[data-admin-package-preview]');
    const placeholder = image?.nextElementSibling;
    if (!image || !placeholder) return;
    if (packagePhotoPreviewUrl) {
      URL.revokeObjectURL(packagePhotoPreviewUrl);
      packagePhotoPreviewUrl = null;
    }
    let source = '';
    if (value instanceof File) {
      packagePhotoPreviewUrl = URL.createObjectURL(value);
      source = packagePhotoPreviewUrl;
    } else {
      source = resolveAdminImage(value) || '/prototype/assets/img/hero.jpg';
    }
    image.onload = () => { image.classList.remove('d-none'); placeholder.classList.add('d-none'); };
    image.onerror = () => { image.classList.add('d-none'); placeholder.classList.remove('d-none'); };
    image.src = source;
  }

  function validatePackagePhoto(file) {
    if (!file) return 'Please choose an image.';
    if (file.size === 0) return 'The selected image is empty.';
    if (file.size > 5 * 1024 * 1024) return 'Package image must be 5 MB or smaller.';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      return 'Package image must be a JPG, PNG, or WebP image.';
    }
    return '';
  }

  function renderAdminPackages() {
    const rows = document.querySelector('[data-admin-package-rows]');
    if (!rows) return;
    const query = state.packageQuery.toLowerCase();
    const filtered = state.packages.filter((eventPackage) => {
      const services = (eventPackage.services || []).map((service) => service.serviceName).join(' ');
      const searchable = `${eventPackage.name || ''} ${eventPackage.slug || ''} ${eventPackage.description || ''} ${eventPackage.venue?.name || ''} ${services}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (state.packageCategory === 'ALL' || eventPackage.category === state.packageCategory);
    });
    const summary = document.querySelector('[data-admin-package-summary]');
    if (summary) summary.textContent = `${state.packages.length} packages | ${state.packages.filter((item) => item.active).length} active`;
    if (!filtered.length) {
      rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">No packages match these filters.</td></tr>';
      return;
    }
    rows.innerHTML = filtered.map((eventPackage) => {
      const services = (eventPackage.services || []).map((service) => escapeHtml(service.serviceName)).join(', ') || 'No services';
      const image = resolveAdminImage(eventPackage.image) || '/prototype/assets/img/hero.jpg';
      return `<tr><td><div class="d-flex align-items-center gap-3"><img class="package-admin-thumb" src="${escapeHtml(image)}" alt="" onerror="this.src='/prototype/assets/img/hero.jpg'"><div><strong>${escapeHtml(eventPackage.name)}</strong><br><span class="small text-ink-soft">${escapeHtml(eventPackage.slug || '')}</span></div></div></td><td>${escapeHtml(eventPackage.category || '-')}</td><td>${escapeHtml(eventPackage.venue?.name || 'Venue not set')}<br><span class="small text-ink-soft">${escapeHtml(eventPackage.venue?.location || '')}</span></td><td><strong class="text-gold">${escapeHtml(formatMoney(eventPackage.finalPrice))}</strong></td><td>${escapeHtml(eventPackage.maxGuests ?? '-')}</td><td class="small">${services}</td><td><span class="status ${eventPackage.active ? 'confirmed' : 'cancelled'}">${eventPackage.active ? 'Active' : 'Inactive'}</span></td><td><button class="btn btn-outline-forest btn-sm" type="button" data-admin-package-edit="${escapeHtml(eventPackage.id)}">Edit</button></td></tr>`;
    }).join('');
  }

  function populatePackageCategories() {
    const select = document.querySelector('[data-admin-package-category]');
    if (!select) return;
    const categories = [...new Set(state.packages.map((item) => item.category).filter(Boolean))].sort();
    select.innerHTML = '<option value="ALL">All event types</option>'
      + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  }

  function openPackageEditor(id) {
    const eventPackage = state.packages.find((item) => String(item.id) === String(id));
    if (!eventPackage) return;
    document.querySelector('[data-admin-package-mode]').value = 'edit';
    document.querySelector('[data-admin-package-modal-title]').textContent = 'Package editor';
    document.querySelector('[data-admin-package-save]').textContent = 'Save Changes';
    document.querySelector('[data-admin-package-id]').value = eventPackage.id;
    document.querySelector('[data-admin-package-name]').value = eventPackage.name || '';
    const categorySelect = document.querySelector('[data-admin-package-category-edit]');
    populatePackageCategoryEditor(categorySelect, eventPackage.category);
    categorySelect.value = eventPackage.category || '';

    populatePackageVenues(eventPackage.venue?.name || '');
    document.querySelector('[data-admin-package-venue-location]').value = eventPackage.venue?.location || '';
    document.querySelector('[data-admin-package-venue-website]').value = eventPackage.venue?.websiteUrl || '';
    document.querySelector('[data-admin-package-price]').value = eventPackage.finalPrice ?? '';
    document.querySelector('[data-admin-package-guests]').value = eventPackage.maxGuests ?? '';
    document.querySelector('[data-admin-package-active]').value = String(Boolean(eventPackage.active));
    document.querySelector('[data-admin-package-description]').value = eventPackage.description || '';
    pendingPackagePhoto = null;
    currentPackageImage = eventPackage.image || null;
    const photoInput = document.querySelector('[data-admin-package-photo]');
    if (photoInput) photoInput.value = '';
    updatePackagePreview(currentPackageImage);
    renderPackageServiceEditor(eventPackage.services || []);
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('pkgAdmin')).show();
  }

  function populatePackageCategoryEditor(select, selected = '') {
    if (!select) return;
    const categories = [...new Set(state.packages.map((item) => item.category).filter(Boolean))].sort();
    select.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    select.value = selected;
  }

  function syncPackageVenueDetails() {
    const select = document.querySelector('[data-admin-package-venue-name]');
    const venue = state.venues.find((item) => item.name === select?.value);
    const location = document.querySelector('[data-admin-package-venue-location]');
    const capacity = document.querySelector('[data-admin-package-venue-capacity]');
    const website = document.querySelector('[data-admin-package-venue-website]');
    const guests = document.querySelector('[data-admin-package-guests]');
    const help = document.querySelector('[data-admin-package-capacity-help]');
    if (location) location.value = venue?.location || '';
    if (capacity) capacity.value = venue?.capacity == null ? 'Not configured' : `${Number(venue.capacity).toLocaleString()} guests`;
    if (website) website.value = venue?.websiteUrl || '';
    if (guests) {
      if (venue?.capacity != null) {
        guests.max = String(venue.capacity);
        guests.setCustomValidity(Number(guests.value || 0) > Number(venue.capacity)
          ? `Package guest limit cannot exceed the selected venue capacity of ${venue.capacity} guests.` : '');
      } else {
        guests.removeAttribute('max');
        guests.setCustomValidity('');
      }
    }
    if (help) help.textContent = venue?.capacity == null
      ? 'This venue needs a configured capacity before packages can be limited safely.'
      : `Venue capacity: ${Number(venue.capacity).toLocaleString()} guests.`;
  }

  function populatePackageVenues(selected = '') {
    const select = document.querySelector('[data-admin-package-venue-name]');
    if (!select) return;
    select.innerHTML = '<option value="">Select an existing venue</option>'
      + state.venues.map((venue) => `<option value="${escapeHtml(venue.name)}">${escapeHtml(venue.name)}</option>`).join('');
    select.value = selected;
    syncPackageVenueDetails();
  }

  function renderPackageServiceEditor(services) {
    const serviceEditor = document.querySelector('[data-admin-package-services]');
    if (!serviceEditor) return;
    serviceEditor.innerHTML = services.map((service) => `
      <div class="col-md-6">
        <label class="form-label" for="adminPackageService-${escapeHtml(service.serviceId || service.id)}">${escapeHtml(service.serviceName || service.name)}</label>
        <textarea class="form-control" rows="4" data-admin-package-service-inclusions data-service-name="${escapeHtml(service.serviceName || service.name)}" id="adminPackageService-${escapeHtml(service.serviceId || service.id)}">${escapeHtml((service.inclusions || []).join('\n'))}</textarea>
        <div class="form-text">Enter one inclusion per line.</div>
      </div>`).join('') || '<div class="small text-ink-soft">No service catalog available.</div>';
  }

  function openNewPackageEditor() {
    document.querySelector('[data-admin-package-mode]').value = 'create';
    document.querySelector('[data-admin-package-modal-title]').textContent = 'Create New Package';
    document.querySelector('[data-admin-package-save]').textContent = 'Create Package';
    document.querySelector('[data-admin-package-id]').value = '';
    document.querySelector('[data-admin-package-name]').value = '';
    populatePackageCategoryEditor(document.querySelector('[data-admin-package-category-edit]'));
    populatePackageVenues();
    document.querySelector('[data-admin-package-venue-location]').value = '';
    document.querySelector('[data-admin-package-venue-website]').value = '';
    document.querySelector('[data-admin-package-price]').value = '';
    document.querySelector('[data-admin-package-guests]').value = '';
    document.querySelector('[data-admin-package-active]').value = 'true';
    document.querySelector('[data-admin-package-description]').value = '';
    pendingPackagePhoto = null;
    currentPackageImage = null;
    const photoInput = document.querySelector('[data-admin-package-photo]');
    if (photoInput) photoInput.value = '';
    updatePackagePreview('');
    syncPackageVenueDetails();
    renderPackageServiceEditor(state.services);
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('pkgAdmin')).show();
  }

  async function loadAdminPackages() {
    const rows = document.querySelector('[data-admin-package-rows]');
    if (rows) rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Loading packages...</td></tr>';
    try {
      const data = await adminFetch('/api/admin/packages', { method: 'GET' });
      state.packages = Array.isArray(data) ? data : [];
      populatePackageCategories();
      renderAdminPackages();
    } catch (error) {
      setPackageMessage(error.message || 'Unable to load packages.');
      if (rows) rows.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-ink-soft">Unable to load packages.</td></tr>';
    }
  }

  async function loadAdminPackageEditorServices() {
    state.services = await adminFetch('/api/admin/services', { method: 'GET' });
  }

  async function submitPackageEdit(event) {
    event.preventDefault();
    const button = document.querySelector('[data-admin-package-save]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    setPackageMessage('');
    try {
      const id = document.querySelector('[data-admin-package-id]').value;
      const creating = document.querySelector('[data-admin-package-mode]').value === 'create';
      const serviceInclusions = {};
      document.querySelectorAll('[data-admin-package-service-inclusions]').forEach((field) => {
        serviceInclusions[field.dataset.serviceName] = field.value.split(/\r?\n/);
      });
      const savedPackage = await adminFetch(creating ? '/api/admin/packages' : `/api/admin/packages/${encodeURIComponent(id)}`, {
        method: creating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.querySelector('[data-admin-package-name]').value.trim(),
          category: document.querySelector('[data-admin-package-category-edit]').value,
          venueName: document.querySelector('[data-admin-package-venue-name]').value.trim(),
          venueLocation: document.querySelector('[data-admin-package-venue-location]').value.trim(),
          description: document.querySelector('[data-admin-package-description]').value.trim(),
          maxGuests: Number(document.querySelector('[data-admin-package-guests]').value),
          finalPrice: Number(document.querySelector('[data-admin-package-price]').value),
          image: currentPackageImage,
          active: document.querySelector('[data-admin-package-active]').value === 'true',
          websiteUrl: document.querySelector('[data-admin-package-venue-website]').value.trim(),
          serviceInclusions
        })
      });
      if (pendingPackagePhoto) {
        const packageId = creating ? savedPackage?.id : id;
        if (!packageId) throw new Error('The package was saved but its image could not be uploaded.');
        const uploaded = await adminFetch(`/api/admin/packages/${encodeURIComponent(packageId)}/photo`, {
          method: 'POST',
          body: (() => { const form = new FormData(); form.append('photo', pendingPackagePhoto); return form; })()
        });
        currentPackageImage = uploaded?.image || currentPackageImage;
      }
      window.bootstrap.Modal.getInstance(document.getElementById('pkgAdmin'))?.hide();
      await loadAdminPackages();
      setPackageMessage(creating ? 'Package created successfully.' : 'Package updated successfully.', 'success');
    } catch (error) {
      setPackageMessage(error.message || 'Unable to update this package.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function initPackagesPage() {
    if (!document.querySelector('[data-admin-packages-page]')) return;
    document.querySelector('[data-admin-package-search]')?.addEventListener('input', (event) => { state.packageQuery = event.target.value.trim(); renderAdminPackages(); });
    document.querySelector('[data-admin-package-category]')?.addEventListener('change', (event) => { state.packageCategory = event.target.value; renderAdminPackages(); });
    document.querySelector('[data-admin-package-add]')?.addEventListener('click', openNewPackageEditor);
    document.querySelector('[data-admin-package-rows]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-admin-package-edit]');
      if (button) openPackageEditor(button.dataset.adminPackageEdit);
    });
    document.querySelector('[data-admin-package-form]')?.addEventListener('submit', submitPackageEdit);
    document.querySelector('[data-admin-package-photo]')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0] || null;
      const validationMessage = validatePackagePhoto(file);
      if (validationMessage) {
        pendingPackagePhoto = null;
        event.target.value = '';
        updatePackagePreview(currentPackageImage);
        setPackageMessage(validationMessage);
        return;
      }
      pendingPackagePhoto = file;
      updatePackagePreview(file);
      setPackageMessage('');
    });
    document.getElementById('pkgAdmin')?.addEventListener('hidden.bs.modal', () => {
      pendingPackagePhoto = null;
      currentPackageImage = null;
      if (packagePhotoPreviewUrl) URL.revokeObjectURL(packagePhotoPreviewUrl);
      packagePhotoPreviewUrl = null;
    });
    document.querySelector('[data-admin-package-venue-name]')?.addEventListener('change', syncPackageVenueDetails);
    document.querySelector('[data-admin-package-guests]')?.addEventListener('input', syncPackageVenueDetails);
    Promise.all([loadAdminVenues(), loadAdminPackageEditorServices()])
      .then(() => loadAdminPackages())
      .catch(() => loadAdminPackages());
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
        <td class="catalog-actions"><div class="d-flex gap-1"><button class="btn btn-outline-forest btn-sm" type="button" data-service-edit="${escapeHtml(service.id)}">Edit</button>${service.id === 1 ? '' : `<button class="btn btn-gold btn-sm" type="button" data-service-manage="${escapeHtml(service.id)}">Manage</button>`}</div></td>
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
        <td class="catalog-actions"><div class="d-flex gap-1"><button class="btn btn-outline-forest btn-sm" type="button" data-dining-style-edit="${escapeHtml(style.id)}">Edit</button><button class="btn btn-gold btn-sm" type="button" data-dining-style-manage="${escapeHtml(style.id)}">Manage Menu</button></div></td>
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
        <td class="catalog-actions"><div class="d-flex gap-1"><button class="btn btn-outline-forest btn-sm" type="button" data-addon-edit="${escapeHtml(addOn.id)}">Edit</button><button class="btn btn-gold btn-sm" type="button" data-addon-manage-included="${escapeHtml(addOn.id)}">Manage Included Items</button></div></td>
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

  function resetServiceOptionForm() {
    const form = document.querySelector('[data-service-options-form]');
    if (form) form.reset();
    document.querySelector('[data-service-options-option-id]').value = '';
    document.querySelector('[data-service-option-type]').value = 'PACKAGE';
    document.querySelector('[data-service-option-billing]').value = 'FLAT';
    document.querySelector('[data-service-option-available]').value = 'true';
    document.querySelector('[data-service-option-order]').value = '0';
    document.querySelector('[data-service-option-editor-title]').textContent = 'Add New Option';
    document.querySelector('[data-service-option-submit]').textContent = 'Add Option';
    document.querySelector('[data-service-option-editor]').classList.add('d-none');
  }

  function prepareServiceOptionAdd() {
    resetServiceOptionForm();
    document.querySelector('[data-service-option-editor]').classList.remove('d-none');
  }

  async function openServiceOptions(id) {
    const service = state.services.find((item) => String(item.id) === String(id));
    if (!service) return;
    const options = await adminFetch(`/api/admin/services/${encodeURIComponent(id)}/options`, { method: 'GET' });
    document.querySelector('[data-service-options-service-id]').value = service.id;
    resetServiceOptionForm();
    document.querySelector('[data-service-options-service-id]').value = service.id;
    document.querySelector('[data-service-options-title]').textContent = `${service.name} Options`;
    const rows = document.querySelector('[data-service-options-rows]');
    rows.innerHTML = options.map((option) => `<tr><td><strong>${escapeHtml(option.name)}</strong><div class="small text-ink-soft"><code>${escapeHtml(option.optionKey)}</code></div></td><td>${escapeHtml(option.optionType)}</td><td>${escapeHtml(formatMoney(option.price))}</td><td>${option.available ? 'Enabled' : 'Disabled'}</td><td><button class="btn btn-sm btn-outline-forest" type="button" data-service-option-edit="${escapeHtml(option.id)}">Edit</button></td></tr>`).join('');
    rows.querySelectorAll('[data-service-option-edit]').forEach((button) => button.addEventListener('click', () => {
      const option = options.find((item) => String(item.id) === button.dataset.serviceOptionEdit); if (!option) return;
      document.querySelector('[data-service-options-option-id]').value = option.id; document.querySelector('[data-service-option-type]').value = option.optionType; document.querySelector('[data-service-option-key]').value = option.optionKey; document.querySelector('[data-service-option-name]').value = option.name; document.querySelector('[data-service-option-price]').value = option.price; document.querySelector('[data-service-option-order]').value = option.displayOrder; document.querySelector('[data-service-option-description]').value = option.description || ''; document.querySelector('[data-service-option-billing]').value = option.billingType || 'FLAT'; document.querySelector('[data-service-option-available]').value = String(Boolean(option.available));
      document.querySelector('[data-service-option-editor-title]').textContent = 'Edit Option';
      document.querySelector('[data-service-option-submit]').textContent = 'Save Changes';
      document.querySelector('[data-service-option-editor]').classList.remove('d-none');
    }));
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('serviceOptionsModal')).show();
  }

  async function submitServiceOption(event) {
    event.preventDefault(); const serviceId = document.querySelector('[data-service-options-service-id]').value; const optionId = document.querySelector('[data-service-options-option-id]').value;
    const payload = { optionType: document.querySelector('[data-service-option-type]').value.trim(), optionKey: document.querySelector('[data-service-option-key]').value.trim(), name: document.querySelector('[data-service-option-name]').value.trim(), description: document.querySelector('[data-service-option-description]').value.trim(), price: Number(document.querySelector('[data-service-option-price]').value), billingType: document.querySelector('[data-service-option-billing]').value, available: document.querySelector('[data-service-option-available]').value === 'true', displayOrder: Number(document.querySelector('[data-service-option-order]').value), metadataJson: '{}' };
    const submit = document.querySelector('[data-service-option-submit]');
    submit.disabled = true;
    try {
      await adminFetch(optionId ? `/api/admin/service-options/${optionId}` : `/api/admin/services/${serviceId}/options`, { method: optionId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await openServiceOptions(serviceId); setCatalogMessage(optionId ? 'Catalog option updated successfully.' : 'Catalog option added successfully.', 'success');
    } catch (error) {
      setCatalogMessage(error.message || 'Unable to save this catalog option.');
    } finally {
      submit.disabled = false;
    }
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

  let diningStyleMenuStyleId = null;
  let diningStyleMenuState = null;

  function renderDiningStyleMenu() {
    const container = document.querySelector('[data-dining-style-menu-categories]');
    if (!container) return;
    const categories = diningStyleMenuState?.categories || [];
    container.innerHTML = categories.length ? categories.map((category) => `
      <section class="border rounded-3 p-3 mb-3" data-menu-category="${escapeHtml(category.id)}">
        <form class="row g-2 align-items-end mb-3" data-menu-category-form data-category-id="${escapeHtml(category.id)}">
          <div class="col-md-5"><label class="form-label small">Category</label><input class="form-control form-control-sm" name="name" maxlength="120" required value="${escapeHtml(category.name)}"></div>
          <div class="col-md-2"><label class="form-label small">Order</label><input class="form-control form-control-sm" name="displayOrder" type="number" min="0" value="${escapeHtml(category.displayOrder)}"></div>
          <div class="col-md-2"><label class="form-label small">Status</label><select class="form-select form-select-sm" name="available"><option value="true" ${category.available ? 'selected' : ''}>Enabled</option><option value="false" ${category.available ? '' : 'selected'}>Disabled</option></select></div>
          <div class="col-md-3 d-flex gap-2"><button class="btn btn-outline-forest btn-sm" type="submit">Save Category</button><button class="btn btn-outline-secondary btn-sm" type="button" data-menu-add-item="${escapeHtml(category.id)}">Add Item</button></div>
        </form>
        <div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Item</th><th style="width:120px">Order</th><th style="width:140px">Status</th><th style="width:140px"></th></tr></thead><tbody>${(category.items || []).map((item) => `
          <tr><td colspan="4"><form class="row g-2 align-items-end" data-menu-item-form data-item-id="${escapeHtml(item.id)}"><div class="col-md-6"><input class="form-control form-control-sm" name="name" maxlength="160" required value="${escapeHtml(item.name)}"></div><div class="col-md-2"><input class="form-control form-control-sm" name="displayOrder" type="number" min="0" value="${escapeHtml(item.displayOrder)}"></div><div class="col-md-2"><select class="form-select form-select-sm" name="available"><option value="true" ${item.available ? 'selected' : ''}>Enabled</option><option value="false" ${item.available ? '' : 'selected'}>Disabled</option></select></div><div class="col-md-2"><button class="btn btn-outline-forest btn-sm w-100" type="submit">Save</button></div></form></td></tr>`).join('')}</tbody></table></div>
      </section>`).join('') : '<div class="catalog-empty">No menu categories yet.</div>';
  }

  async function loadDiningStyleMenu(styleId) {
    diningStyleMenuStyleId = styleId;
    diningStyleMenuState = await adminFetch(`/api/admin/dining-styles/${encodeURIComponent(styleId)}/menu`, { method: 'GET' });
    const style = state.diningStyles.find((item) => String(item.id) === String(styleId));
    document.querySelector('[data-dining-style-menu-title]').textContent = `${style?.name || 'Dining Style'} Menu`;
    renderDiningStyleMenu();
  }

  function openDiningStyleMenu(id) {
    loadDiningStyleMenu(id).then(() => window.bootstrap.Modal.getOrCreateInstance(document.getElementById('diningStyleMenuModal')).show()).catch((error) => setCatalogMessage(error.message || 'Unable to load this menu.'));
  }

  async function submitDiningStyleMenuForm(event) {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const categoryId = form.dataset.categoryId;
    const itemId = form.dataset.itemId;
    const payload = { name: String(data.get('name') || '').trim(), displayOrder: Number(data.get('displayOrder') || 0), available: data.get('available') === 'true' };
    if (!payload.name) return;
    const path = itemId ? `/api/admin/dining-style-menu-items/${encodeURIComponent(itemId)}` : `/api/admin/dining-style-menu-categories/${encodeURIComponent(categoryId)}`;
    await adminFetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await loadDiningStyleMenu(diningStyleMenuStyleId);
  }

  async function addDiningStyleCategory() {
    const name = window.prompt('Category name');
    if (!name?.trim() || !diningStyleMenuStyleId) return;
    await adminFetch(`/api/admin/dining-styles/${encodeURIComponent(diningStyleMenuStyleId)}/menu-categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), displayOrder: (diningStyleMenuState?.categories || []).length, available: true }) });
    await loadDiningStyleMenu(diningStyleMenuStyleId);
  }

  async function addDiningStyleItem(categoryId) {
    const name = window.prompt('Menu item name');
    if (!name?.trim()) return;
    const category = diningStyleMenuState?.categories?.find((item) => String(item.id) === String(categoryId));
    await adminFetch(`/api/admin/dining-style-menu-categories/${encodeURIComponent(categoryId)}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), displayOrder: (category?.items || []).length, available: true }) });
    await loadDiningStyleMenu(diningStyleMenuStyleId);
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

  async function loadAddonIncludedItems(addonId) {
    const addOn = state.addOns.find((item) => String(item.id) === String(addonId));
    if (!addOn) return;
    state.addonIncludedAddonId = addOn.id;
    document.querySelector('[data-addon-included-title]').textContent = `Manage Included Items: ${addOn.name}`;
    document.querySelector('[data-addon-included-message]').textContent = 'Loading included items...';
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('addonIncludedItemsModal')).show();
    state.addonIncludedItems = await adminFetch(`/api/admin/addons/${encodeURIComponent(addOn.id)}/included-items`, { method: 'GET' });
    renderAddonIncludedItems();
  }

  function renderAddonIncludedItems() {
    const container = document.querySelector('[data-addon-included-items]');
    if (!container) return;
    document.querySelector('[data-addon-included-message]').textContent = `${state.addonIncludedItems.length} item(s) configured.`;
    container.innerHTML = state.addonIncludedItems.length ? state.addonIncludedItems.map((item) => `
      <form class="border rounded-3 p-3" data-addon-included-form data-item-id="${escapeHtml(item.id)}">
        <div class="row g-2 align-items-end"><div class="col-md-6"><label class="form-label small">Name</label><input class="form-control" required maxlength="160" data-addon-included-name value="${escapeHtml(item.name)}"></div><div class="col-md-2"><label class="form-label small">Order</label><input class="form-control" type="number" min="0" data-addon-included-order value="${escapeHtml(item.displayOrder ?? 0)}"></div><div class="col-md-2"><label class="form-label small">Status</label><select class="form-select" data-addon-included-available><option value="true" ${item.available ? 'selected' : ''}>Enabled</option><option value="false" ${!item.available ? 'selected' : ''}>Disabled</option></select></div><div class="col-md-2"><button class="btn btn-outline-forest w-100" type="submit">Save</button></div></div>
      </form>`).join('') : '<div class="catalog-empty">No included items configured.</div>';
  }

  async function saveAddonIncludedItem(event) {
    event.preventDefault();
    const form = event.target.closest('[data-addon-included-form]');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await adminFetch(`/api/admin/addon-included-items/${encodeURIComponent(form.dataset.itemId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.querySelector('[data-addon-included-name]').value.trim(), displayOrder: Number(form.querySelector('[data-addon-included-order]').value || 0), available: form.querySelector('[data-addon-included-available]').value === 'true' })
      });
      await loadAddonIncludedItems(state.addonIncludedAddonId);
    } finally { button.disabled = false; }
  }

  async function addAddonIncludedItem() {
    const name = window.prompt('Included item name');
    if (!name?.trim() || !state.addonIncludedAddonId) return;
    await adminFetch(`/api/admin/addons/${encodeURIComponent(state.addonIncludedAddonId)}/included-items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), displayOrder: state.addonIncludedItems.length, available: true })
    });
    await loadAddonIncludedItems(state.addonIncludedAddonId);
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
    document.querySelector('[data-service-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-service-manage]'); if (button) openServiceOptions(button.dataset.serviceManage).catch((error) => setCatalogMessage(error.message)); });
    document.querySelector('[data-service-option-add]')?.addEventListener('click', prepareServiceOptionAdd);
    document.querySelector('[data-service-option-cancel]')?.addEventListener('click', resetServiceOptionForm);
    document.getElementById('serviceOptionsModal')?.addEventListener('hidden.bs.modal', resetServiceOptionForm);
    document.querySelector('[data-dining-style-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-dining-style-edit]'); if (button) openDiningStyleEditor(button.dataset.diningStyleEdit); const manage = event.target.closest('[data-dining-style-manage]'); if (manage) openDiningStyleMenu(manage.dataset.diningStyleManage); });
    document.querySelector('[data-dining-style-menu-categories]')?.addEventListener('submit', (event) => submitDiningStyleMenuForm(event).catch((error) => setCatalogMessage(error.message || 'Unable to save menu changes.')));
    document.querySelector('[data-dining-style-menu-categories]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-menu-add-item]'); if (button) addDiningStyleItem(button.dataset.menuAddItem).catch((error) => setCatalogMessage(error.message || 'Unable to add menu item.')); });
    document.querySelector('[data-dining-style-menu-add-category]')?.addEventListener('click', () => addDiningStyleCategory().catch((error) => setCatalogMessage(error.message || 'Unable to add menu category.')));
    document.querySelector('[data-addon-rows]')?.addEventListener('click', (event) => { const button = event.target.closest('[data-addon-edit]'); if (button) openAddOnEditor(button.dataset.addonEdit); const manage = event.target.closest('[data-addon-manage-included]'); if (manage) loadAddonIncludedItems(manage.dataset.addonManageIncluded).catch((error) => setCatalogMessage(error.message || 'Unable to load included items.')); });
    document.querySelector('[data-addon-included-items]')?.addEventListener('submit', (event) => saveAddonIncludedItem(event).catch((error) => setCatalogMessage(error.message || 'Unable to save included item.')));
    document.querySelector('[data-addon-included-add]')?.addEventListener('click', () => addAddonIncludedItem().catch((error) => setCatalogMessage(error.message || 'Unable to add included item.')));

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
    document.querySelector('[data-service-options-form]')?.addEventListener('submit', submitServiceOption);

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
            <td><a href="/prototype/admin/bookings.html?bookingId=${encodeURIComponent(booking.bookingId)}"><strong>${escapeHtml(booking.eventType || 'Event')}</strong></a><div class="small text-ink-soft">${escapeHtml(booking.bookingReference || '')}</div></td>
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
            <td><a href="/prototype/admin/bookings.html?bookingId=${encodeURIComponent(booking.bookingId)}"><strong>${escapeHtml(booking.bookingReference || `BK-${booking.bookingId}`)}</strong></a></td>
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

  function renderDashboardPayments(payments) {
    const count = (status) => payments.filter((payment) => payment.paymentStatus === status).length;
    ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].forEach((status) => {
      const element = document.querySelector(`[data-admin-payment-summary-count="${status}"]`);
      if (element) element.textContent = String(count(status));
    });
    const total = document.querySelector('[data-admin-payment-summary-total]');
    if (total) total.textContent = `${payments.length} payment records`;
    const rows = document.querySelector('[data-admin-recent-payment-rows]');
    if (!rows) return;
    const recent = payments.slice(0, 5);
    rows.innerHTML = recent.length
      ? recent.map((payment) => `<tr><td><a href="/prototype/admin/payments.html?paymentId=${encodeURIComponent(payment.paymentId)}">PAY-${String(payment.paymentId).padStart(4, '0')}</a><div class="small text-ink-soft">${escapeHtml(statusLabel(payment.paymentType || 'PAYMENT'))}</div></td><td><a href="/prototype/admin/bookings.html?bookingId=${encodeURIComponent(payment.bookingId)}">${escapeHtml(payment.bookingReference || `BK-${payment.bookingId}`)}</a><div class="small text-ink-soft">${escapeHtml(payment.customerName || 'Customer')}</div></td><td>${escapeHtml(formatMoney(payment.amount))}<div class="small text-ink-soft">${escapeHtml(payment.paymentMethod || 'Method not recorded')}</div></td><td><span class="status ${statusClass(payment.paymentStatus)}">${escapeHtml(statusLabel(payment.paymentStatus || 'UNKNOWN'))}</span><div class="small text-ink-soft">${escapeHtml(formatDateTime(payment.paidAt || payment.submittedAt || payment.createdAt))}</div></td></tr>`).join('')
      : '<tr><td colspan="4" class="text-center py-4 text-ink-soft">No recent payments.</td></tr>';
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
        name: 'payments',
        path: '/api/admin/payments',
        success: renderDashboardPayments,
        failure: () => {
          const total = document.querySelector('[data-admin-payment-summary-total]');
          const rows = document.querySelector('[data-admin-recent-payment-rows]');
          if (total) total.textContent = 'Payment data is unavailable.';
          if (rows) rows.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-ink-soft">Unable to load payments.</td></tr>';
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

  function reportValue(path, fallback = 0) {
    const report = state.reportSummary;
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], report) ?? fallback;
  }

  function setReportValue(path, value) {
    document.querySelectorAll(`[data-report-value="${path}"]`).forEach((element) => {
      element.textContent = String(value ?? 0);
    });
  }

  function renderReportList(selector, items, emptyText, label = 'Bookings') {
    const tbody = document.querySelector(selector);
    if (!tbody) return;
    tbody.innerHTML = items.length
      ? items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.bookingCount)}</td></tr>`).join('')
      : `<tr><td colspan="2" class="text-center text-ink-soft">${escapeHtml(emptyText)}</td></tr>`;
  }

  function renderBookingTrend(items) {
    const container = document.querySelector('[data-report-booking-trend]');
    if (!container) return;
    if (!items.length || items.every((item) => Number(item.bookings) === 0)) {
      container.innerHTML = '<div class="text-ink-soft">No booking data available</div>';
      return;
    }
    const max = Math.max(...items.map((item) => Number(item.bookings) || 0), 1);
    container.innerHTML = items.map((item) => {
      const count = Number(item.bookings) || 0;
      const height = Math.max(4, Math.round((count / max) * 100));
      return `<div class="flex-fill text-center d-flex flex-column justify-content-end h-100"><div class="small text-ink-soft mb-1">${count}</div><div style="height:${height}%;background:#5B6F8C;border-radius:6px 6px 0 0" title="${escapeHtml(item.month)}: ${count} bookings"></div><span class="small text-ink-soft mt-1">${escapeHtml(item.month)}</span></div>`;
    }).join('');
  }

  function renderReportSummary(summary) {
    state.reportSummary = summary || {};
    const bookings = summary.bookings || {};
    const resources = summary.resources || {};
    const consultations = summary.consultations || {};
    const quotations = summary.quotations || {};
    const financial = summary.financial || {};
    setReportValue('bookings.total', bookings.total);
    setReportValue('bookings.confirmed', bookings.confirmed);
    setReportValue('resources.customers', resources.customers);
    setReportValue('totalPaidRevenue', formatMoney(summary.totalPaidRevenue));
    ['depositPaid', 'balancePaid', 'outstandingAmount', 'refundedAmount', 'packagePaid', 'customizePaid']
      .forEach((key) => setReportValue(`financial.${key}`, formatMoney(financial[key])));
    setReportValue('resources.packages', resources.packages);
    setReportValue('resources.venues', resources.venues);
    setReportValue('consultations.total', consultations.total);
    setReportValue('quotations.total', quotations.total);
    document.querySelector('[data-report-detail="bookings.statuses"]').textContent = `${bookings.pending || 0} pending | ${bookings.awaitingDeposit || 0} awaiting deposit`;
    document.querySelector('[data-report-detail="resources.packages"]').textContent = `${resources.activePackages || 0} active / ${resources.inactivePackages || 0} inactive`;
    document.querySelector('[data-report-detail="consultations.statuses"]').textContent = `${consultations.requested || 0} requested / ${consultations.scheduled || 0} scheduled`;
    document.querySelector('[data-report-detail="quotations.statuses"]').textContent = `${quotations.sent || 0} sent / ${quotations.accepted || 0} accepted`;

    const statusRows = [
      ['Pending', bookings.pending], ['Awaiting deposit', bookings.awaitingDeposit], ['Confirmed', bookings.confirmed],
      ['Completed', bookings.completed], ['Cancelled', bookings.cancelled]
    ].map(([name, bookingCount]) => ({ name, bookingCount: bookingCount || 0 }));
    renderReportList('[data-report-booking-statuses]', statusRows, 'No booking data available');
    renderReportList('[data-report-booking-types]', summary.bookingTypes || [], 'No booking data available');
    renderReportList('[data-report-event-categories]', summary.eventCategories || [], 'No booking data available');
    renderEventTypeChart(summary.eventCategories || []);
    renderReportList('[data-report-top-venues]', summary.topVenues || [], 'No venue data available');
    renderReportList('[data-report-top-packages]', summary.topPackages || [], 'No package data available');
    renderBookingTrend(summary.bookingTrend || []);
    const period = document.querySelector('[data-report-period]');
    if (period) period.textContent = summary.from || summary.to
      ? `Reporting period: ${summary.from || 'Any date'} to ${summary.to || 'Any date'}. Metric dates follow the definitions below.`
      : 'All available records; metric dates follow the definitions below.';
  }

  function renderEventTypeChart(items) {
    const chart = document.querySelector('[data-report-event-doughnut]');
    const legend = document.querySelector('[data-report-event-legend]');
    if (!chart || !legend) return;
    const colors = ['#b98b3d', '#235447', '#8f5f4a', '#7b8f84', '#d2aa67', '#435b72'];
    const validItems = items.filter((item) => Number(item.bookingCount) > 0);
    const total = validItems.reduce((sum, item) => sum + Number(item.bookingCount), 0);
    if (!total) {
      chart.style.background = '#eee';
      legend.innerHTML = '<span class="text-ink-soft">No event type data available.</span>';
      return;
    }
    let cursor = 0;
    const segments = validItems.map((item, index) => {
      const start = cursor;
      cursor += (Number(item.bookingCount) / total) * 360;
      return `${colors[index % colors.length]} ${start}deg ${cursor}deg`;
    });
    chart.style.background = `conic-gradient(${segments.join(', ')})`;
    legend.innerHTML = validItems.map((item, index) => {
      const count = Number(item.bookingCount);
      const percent = Math.round((count / total) * 100);
      return `<div class="report-event-legend-item" title="${escapeHtml(item.name)}: ${count} events (${percent}%)"><span class="report-event-legend-swatch" style="background:${colors[index % colors.length]}"></span><span>${escapeHtml(item.name)}</span><strong class="ms-auto">${count}</strong></div>`;
    }).join('');
  }

  async function initReportsPage() {
    if (!document.querySelector('[data-admin-reports-page]')) return;
    const loading = document.querySelector('[data-admin-report-loading]');
    const content = document.querySelector('[data-admin-report-content]');
    const message = document.querySelector('[data-admin-report-message]');
    const loadReport = async () => {
      message?.classList.add('d-none');
      loading?.classList.remove('d-none');
      content?.classList.add('d-none');
      try {
        const summary = await adminFetch('/api/admin/reports/summary', { method: 'GET' });
      renderReportSummary(summary);
      loading?.classList.add('d-none');
      content?.classList.remove('d-none');
      } catch (error) {
      loading?.classList.add('d-none');
      content?.classList.add('d-none');
      if (message) {
        message.textContent = error.message || 'Unable to load report data.';
        message.classList.remove('d-none');
      }
      }
    };
    void loadReport();
  }

  function renderAdminNotifications(list) {
    if (!list) return;
    list.innerHTML = state.notifications.length
      ? state.notifications.map((notification) => `<li><button type="button" class="w-100 text-start border-0 bg-transparent p-2 rounded ${notification.read ? '' : 'bg-light border-start border-3 border-gold'}" data-admin-notification-id="${escapeHtml(notification.id)}"><strong>${escapeHtml(notification.title || 'Notification')}</strong><br><span class="small text-ink-soft">${escapeHtml(notification.message || '')}</span></button></li>`).join('')
      : '<li class="text-ink-soft">You\'re all caught up.</li>';
  }

  async function loadAdminNotifications(list, badge) {
    if (adminNotificationLoadPromise) return adminNotificationLoadPromise;
    if (adminNotificationsLoadedAt && Date.now() - adminNotificationsLoadedAt < ADMIN_NOTIFICATION_CACHE_TTL_MS) {
      renderAdminNotifications(list);
      return;
    }

    if (list) list.innerHTML = '<li class="text-ink-soft">Loading notifications...</li>';
    const request = (async () => {
      try {
        const [data, unreadCount] = await Promise.all([
          adminFetch('/api/notifications?limit=20', { method: 'GET' }),
          adminFetch('/api/notifications/unread-count', { method: 'GET' })
        ]);
        state.notifications = Array.isArray(data) ? data : [];
        const unread = Number(unreadCount) || 0;
        badge.textContent = unread > 99 ? '99+' : unread > 0 ? String(unread) : '';
        badge.hidden = unread === 0;
        adminNotificationsLoadedAt = Date.now();
        renderAdminNotifications(list);
      } catch (error) {
        state.notifications = [];
        badge.hidden = true;
        if (list) list.innerHTML = '<li class="text-ink-soft">Unable to load notifications.</li>';
      }
    })();
    adminNotificationLoadPromise = request;
    try {
      await request;
    } finally {
      if (adminNotificationLoadPromise === request) adminNotificationLoadPromise = null;
    }
  }

  function initAdminNotifications() {
    const actions = document.querySelector('.bb-nav .container-fluid > .d-flex');
    if (!actions || document.querySelector('[data-admin-notification-bell]')) return;
    actions.insertAdjacentHTML('afterbegin', '<button class="btn btn-outline-forest btn-sm bb-notification-bell" type="button" data-admin-notification-bell data-bs-toggle="modal" data-bs-target="#adminNotifyModal"><i class="bi bi-bell"></i><span class="bb-notification-count" data-admin-notification-count hidden></span><span class="visually-hidden">Notifications</span></button>');
    document.body.insertAdjacentHTML('beforeend', '<div class="modal fade" id="adminNotifyModal" tabindex="-1" aria-labelledby="adminNotifyModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="adminNotifyModalTitle">Notifications</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><ul class="list-unstyled d-grid gap-2 mb-0" data-admin-notification-list></ul></div></div></div></div>');
    const list = document.querySelector('[data-admin-notification-list]');
    const badge = document.querySelector('[data-admin-notification-count]');
    document.querySelector('[data-admin-notification-bell]').addEventListener('click', () => { void loadAdminNotifications(list, badge); });
    list.addEventListener('click', async (event) => {
      const item = event.target.closest('[data-admin-notification-id]');
      if (!item) return;
      const notification = state.notifications.find((entry) => String(entry.id) === String(item.dataset.adminNotificationId));
      if (!notification) return;
      try {
        await adminFetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: 'PATCH' });
        notification.read = true;
        const unread = state.notifications.filter((entry) => !entry.read).length;
        badge.textContent = unread > 99 ? '99+' : unread > 0 ? String(unread) : '';
        badge.hidden = unread === 0;
        renderAdminNotifications(list);
        const path = String(notification.actionUrl || '');
        if (isTrustedNotificationPath(path)) window.location.href = path;
      } catch (error) {
        list.insertAdjacentHTML('afterbegin', '<li class="text-danger small">Unable to mark notification as read.</li>');
      }
    });
    const markAll = document.createElement('button');
    markAll.type = 'button';
    markAll.className = 'btn btn-link btn-sm px-0 mt-3';
    markAll.textContent = 'Mark all as read';
    markAll.addEventListener('click', async () => {
      try {
        await adminFetch('/api/notifications/read-all', { method: 'PATCH' });
        state.notifications.forEach((notification) => { notification.read = true; });
        badge.textContent = '';
        badge.hidden = true;
        renderAdminNotifications(list);
      } catch (error) {
        list.insertAdjacentHTML('afterbegin', '<li class="text-danger small">Unable to mark notifications as read.</li>');
      }
    });
    document.querySelector('#adminNotifyModal .modal-body')?.appendChild(markAll);
    void loadAdminNotifications(list, badge);
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
    initPackagesPage();
    initServicesPage();
    initDashboardPage();
    initReportsPage();
    initAdminNotifications();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
