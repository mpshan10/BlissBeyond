// Bliss & Beyond shared prototype interactions (ES6, no backend)
const configuredApiBaseUrl = "__BB_API_BASE_URL__";
const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const localApiBaseUrl = `http://${window.location.hostname}:8081`;
const BB_API_BASE_URL = isLocalFrontend
  ? localApiBaseUrl
  : !configuredApiBaseUrl.startsWith("__")
    ? configuredApiBaseUrl.replace(/\/+$/, "")
    : "https://blissbeyond.onrender.com";

window.BB_API_BASE_URL = BB_API_BASE_URL;
window.bbApiUrl = (path) => `${BB_API_BASE_URL}${path}`;

const bbNativeFetch = window.fetch.bind(window);
window.bbApiFetch = async (input, options = {}) => {
  const requestUrl = typeof input === 'string' ? input : input?.url || '';
  const method = String(options.method || input?.method || 'GET').toUpperCase();
  const isBackendRequest = requestUrl.startsWith(`${BB_API_BASE_URL}/api/`);
  const isReadOnlyMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const maxAttempts = isBackendRequest && isReadOnlyMethod && !isLocalFrontend ? 2 : 1;
  const uncertainMutationError = (status) => {
    const error = new Error("We couldn't confirm whether this request completed. Please refresh and check the current status before trying again.");
    if (status) error.status = status;
    error.mutationOutcomeUnknown = true;
    return error;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await bbNativeFetch(input, options);
      const retryableStatus = [502, 503, 504].includes(response.status);
      if (!retryableStatus) return response;
      if (!isReadOnlyMethod) throw uncertainMutationError(response.status);
      if (attempt === maxAttempts) return response;
    } catch (error) {
      if (error?.mutationOutcomeUnknown) throw error;
      if (!isBackendRequest || isReadOnlyMethod) {
        if (attempt === maxAttempts) throw error;
      } else {
        throw uncertainMutationError();
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }

  throw new TypeError('Unable to reach the API.');
};
window.fetch = window.bbApiFetch;
const BB_STATE_KEYS = {
  venue: 'bb_selected_venue',
  event: 'bb_event_context',
  services: 'bb_selected_services',
  serviceData: 'bb_service_customizations',
  catering: 'bb_catering_selection',
  packagePlan: 'bb_package_plan',
  bookingMode: 'bb_booking_mode'
};

const BB_AUTH_KEYS = {
  token: 'bb_auth_token',
  user: 'bb_auth_user',
  mode: 'bb_auth_mode',
  returnUrl: 'bb_auth_return_url'
};

const BB_PASSWORD_RESET_KEYS = {
  flow: 'bb_password_reset_flow',
  cooldownUntil: 'bb_password_reset_cooldown_until'
};

let bbNotificationState = [];

function bbRead(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function bbWrite(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function bbMoney(value) {
  return 'MMK' + Math.round(Number(value || 0)).toLocaleString();
}

function bbPluralGuests(value) {
  const count = Number(value || 0);
  return `${count.toLocaleString()} Guest${count === 1 ? '' : 's'}`;
}

function bbGetVenue() {
  return bbRead(BB_STATE_KEYS.venue);
}

function bbSetVenue(venue) {
  bbWrite(BB_STATE_KEYS.venue, venue);
}

function bbGetEventContext() {
  return bbRead(BB_STATE_KEYS.event) || {
    eventType: 'Wedding',
    eventDate: '20 December 2026',
    eventTime: '6:00 PM',
    guests: 150
  };
}

function bbGetMinimumBookingDate() {
  const today = new Date();
  const targetMonth = today.getMonth() + 1;
  const targetYear = today.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const lastDay = new Date(targetYear, month + 1, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return `${targetYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function bbIsValidBookingDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    && String(value) >= bbGetMinimumBookingDate();
}

function bbSetEventContext(context) {
  const current = bbGetEventContext();
  bbWrite(BB_STATE_KEYS.event, { ...current, ...context });
}

function bbGetSelectedServices() {
  return bbRead(BB_STATE_KEYS.services) || [];
}

function bbSetSelectedServices(services) {
  bbWrite(BB_STATE_KEYS.services, services);
}

function bbGetServiceData() {
  return bbRead(BB_STATE_KEYS.serviceData) || {};
}

function bbSetServiceData(serviceId, data) {
  const current = bbGetServiceData();
  current[serviceId] = data;
  bbWrite(BB_STATE_KEYS.serviceData, current);
}

function bbGetCatering() {
  return bbRead(BB_STATE_KEYS.catering);
}

function bbSetCatering(data) {
  bbWrite(BB_STATE_KEYS.catering, data);
}

function bbGetPackagePlan() {
  return bbRead(BB_STATE_KEYS.packagePlan) || {};
}

function bbSetPackagePlan(plan) {
  const current = bbGetPackagePlan();
  const next = { ...current, ...plan };
  if (Object.prototype.hasOwnProperty.call(plan, 'packageAvailable')
    && !Object.prototype.hasOwnProperty.call(plan, 'available')) {
    next.available = Boolean(plan.packageAvailable);
  }
  if (Object.prototype.hasOwnProperty.call(plan, 'available')
    && !Object.prototype.hasOwnProperty.call(plan, 'packageAvailable')) {
    next.packageAvailable = Boolean(plan.available);
  }
  bbWrite(BB_STATE_KEYS.packagePlan, next);
  bbSetBookingMode('PACKAGE');
}

function bbGetBookingMode() {
  const mode = String(bbRead(BB_STATE_KEYS.bookingMode) || '').toUpperCase();
  return mode === 'PACKAGE' || mode === 'CUSTOM' ? mode : '';
}

function bbSetBookingMode(mode) {
  const normalized = String(mode || '').toUpperCase();
  if (normalized !== 'PACKAGE' && normalized !== 'CUSTOM') return false;
  return bbWrite(BB_STATE_KEYS.bookingMode, normalized);
}

function bbRemoveStateKeys(keys) {
  keys.forEach((key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      // Storage may be unavailable; the in-memory flow can still continue.
    }
  });
}

function bbRemoveCustomizeStorageKeys(keys) {
  bbRemoveStateKeys(keys);
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // Storage may be unavailable; the in-memory flow can still continue.
    }
  });
}

function clearCustomizeBookingDraft() {
  bbRemoveCustomizeStorageKeys([
    BB_STATE_KEYS.venue,
    BB_STATE_KEYS.event,
    BB_STATE_KEYS.services,
    BB_STATE_KEYS.serviceData,
    BB_STATE_KEYS.catering,
    BB_STATE_KEYS.bookingMode,
    'bbVenueEventDetails',
    'bbEventContext',
    'bbEventType',
    'bbEventDate',
    'bbEventGuests',
    'bbCateringGuests',
    'bbEstimatedPhotographyPrice',
    'bbPendingDiningStyle',
    'bbPendingAddon',
    'bbPendingDecorationTheme'
  ]);
}

function clearPackageBookingDraft() {
  bbRemoveStateKeys([BB_STATE_KEYS.packagePlan]);
  if (bbGetBookingMode() === 'PACKAGE') {
    bbRemoveStateKeys([BB_STATE_KEYS.bookingMode]);
  }
}

function bbReadAuthFromStorage(storage) {
  try {
    const token = storage.getItem(BB_AUTH_KEYS.token);
    if (!token) return null;
    const userRaw = storage.getItem(BB_AUTH_KEYS.user);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return {
      token,
      user,
      mode: storage === window.localStorage ? 'localStorage' : 'sessionStorage'
    };
  } catch (error) {
    return null;
  }
}

function bbGetAuth() {
  return bbReadAuthFromStorage(window.localStorage) || bbReadAuthFromStorage(window.sessionStorage);
}

function bbGetAuthToken() {
  return bbGetAuth()?.token || '';
}

function bbGetAuthUser() {
  return bbGetAuth()?.user || null;
}

function bbAuthTokenIsExpired(token) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number.isFinite(payload.exp) && payload.exp * 1000 <= Date.now();
  } catch (error) {
    return false;
  }
}

function bbRenderPublicAuthNav(auth, profile = null) {
  const loginLink = document.querySelector('.bb-nav a[href="/prototype/login.html"]');
  const authActions = loginLink?.closest('.d-flex');
  if (!authActions) return;

  const user = auth?.user || {};
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const label = profile
    ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email)
    : (user.fullName || user.email || 'My Account');
  const homeCta = document.querySelector('[data-home-auth-cta]');

  if (!auth) {
    authActions.innerHTML = '<a class="btn btn-outline-forest btn-sm" href="/prototype/login.html">Login</a><a class="btn btn-gold btn-sm" href="/prototype/register.html">Get Started</a>';
    if (homeCta) {
      homeCta.href = '/prototype/register.html';
      homeCta.textContent = 'Create free account';
    }
    return;
  }

  const portalUrl = isAdmin ? '/prototype/admin/dashboard.html' : '/prototype/customer/dashboard.html';
  if (homeCta) {
    homeCta.href = portalUrl;
    homeCta.textContent = isAdmin ? 'Go to Admin Panel' : 'Go to Customer Portal';
  }
  const accountLinks = isAdmin
    ? `<li><a class="dropdown-item" href="${portalUrl}">Dashboard</a></li>`
    : `<li><a class="dropdown-item" href="${portalUrl}">Dashboard</a></li>
       <li><a class="dropdown-item" href="/prototype/customer/profile.html">My Profile</a></li>
       <li><a class="dropdown-item" href="/prototype/customer/booking-history.html">Booking History</a></li>
       <li><a class="dropdown-item" href="/prototype/customer/quotation.html">Quotations</a></li>`;

  authActions.innerHTML = `<div class="dropdown">
      <button class="btn btn-gold btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">${bbEscapeHtml(label)}</button>
      <ul class="dropdown-menu dropdown-menu-end">
        ${accountLinks}
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" type="button" data-public-signout>Sign Out</button></li>
      </ul>
    </div>`;

  authActions.querySelector('[data-public-signout]')?.addEventListener('click', () => {
    bbClearAuth();
    bbClearAuthReturnUrl();
    window.location.href = '/prototype/index.html';
  });
}

async function bbRefreshPublicAuthNav() {
  if (window.location.pathname.startsWith('/prototype/customer/')
    || window.location.pathname.startsWith('/prototype/admin/')) return;

  const auth = bbGetAuth();
  if (!auth || bbAuthTokenIsExpired(auth.token)) {
    if (auth) bbClearAuth();
    bbRenderPublicAuthNav(null);
    return;
  }

  const roles = Array.isArray(auth.user?.roles) ? auth.user.roles : [];
  if (roles.includes('ROLE_ADMIN')) {
    bbRenderPublicAuthNav(auth);
    return;
  }

  try {
    const profile = await bbFetchJson(window.bbApiUrl('/api/customer/me'), { method: 'GET' });
    bbRenderPublicAuthNav(auth, profile);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      bbClearAuth();
      bbRenderPublicAuthNav(null);
      return;
    }
    bbRenderPublicAuthNav(auth);
  }
}

function bbUpdateAuthDisplay() {
  const user = bbGetAuthUser();
  const label = user?.fullName || user?.email || '';
  if (!label) return;
  document.querySelectorAll('[data-auth-display]').forEach((element) => {
    element.textContent = label;
  });
}

function bbApplyCustomerProfile(profile) {
  if (!profile) return;
  const label = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email || 'Account';
  document.querySelectorAll('[data-auth-display], [data-auth-billed-to], .bb-nav .dropdown-toggle').forEach((element) => {
    element.textContent = label;
  });
  document.querySelectorAll('[data-profile-name]').forEach((element) => {
    element.textContent = label;
  });
}

function bbInitCustomerSidebar() {
  if (!window.location.pathname.startsWith('/prototype/customer/')) return;

  const sidebars = document.querySelectorAll('.bb-side');
  if (!sidebars.length) return;

  sidebars.forEach((sidebar) => {
    sidebar.querySelectorAll('a[href="/prototype/customer/venue-selection.html"]').forEach((link) => link.remove());
  });

  const paymentPath = '/prototype/customer/payment.html';
  sidebars.forEach((sidebar) => {
    const bookingHeading = [...sidebar.querySelectorAll('h6')].find((heading) =>
      heading.textContent.trim().toLowerCase() === 'my bookings'
    );
    if (!bookingHeading) return;

    const nextHeading = [...sidebar.children].find((child) => child.tagName === 'H6' && child !== bookingHeading
      && Boolean(bookingHeading.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING));
    const existingLinks = [];
    let current = bookingHeading.nextElementSibling;
    while (current && current !== nextHeading) {
      if (current.matches('a')) existingLinks.push(current);
      current = current.nextElementSibling;
    }

    const paymentLink = existingLinks.find((link) => link.getAttribute('href')?.split('?')[0] === paymentPath);
    if (!paymentLink) {
      const link = document.createElement('a');
      link.href = paymentPath;
      link.innerHTML = '<i class="bi bi-credit-card me-2"></i>Payment';
      const historyLink = existingLinks.find((link) => link.getAttribute('href')?.includes('booking-history.html'));
      if (historyLink) historyLink.insertAdjacentElement('afterend', link);
      else if (nextHeading) nextHeading.insertAdjacentElement('beforebegin', link);
      else sidebar.appendChild(link);
    }

    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    sidebar.querySelectorAll('a').forEach((link) => {
      const linkPath = link.getAttribute('href')?.split('?')[0] || '';
      if (!linkPath.startsWith('/prototype/customer/')) return;
      const isActive = linkPath.split('/').pop().toLowerCase() === currentPath;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  });
}

async function bbRefreshCustomerHeader() {
  if (!window.location.pathname.startsWith('/prototype/customer/') || !bbGetAuthToken()) return;
  try {
    const profile = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/me'), { method: 'GET' });
    bbApplyCustomerProfile(profile);
  } catch (error) {
    // Cached authentication display remains available when the profile API is offline.
    bbUpdateAuthDisplay();
  }
}

async function bbRenderCustomerDashboard() {
  const root = document.querySelector('[data-dashboard-page]');
  if (!root) return;

  const text = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeStatuses = new Set(['PENDING', 'AWAITING_DEPOSIT', 'CONFIRMED']);
  const excludedStatuses = new Set(['CANCELLED', 'COMPLETED']);
  const toDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const isFuture = (value) => {
    const date = toDate(value);
    return date && date >= today;
  };
  const load = (url) => bbFetchCustomerJson(url, { method: 'GET' }).catch(() => null);

  const [profile, bookings, quotations, consultations, payments] = await Promise.all([
    load(window.bbApiUrl('/api/customer/me')),
    load(window.bbApiUrl('/api/customer/bookings')),
    load(window.bbApiUrl('/api/customer/quotations')),
    load(window.bbApiUrl('/api/customer/consultations')),
    load(window.bbApiUrl('/api/customer/payments'))
  ]);

  if (profile) {
    const firstName = profile.firstName || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    text('[data-dashboard-greeting]', `${greeting}, ${firstName}`);
    bbApplyCustomerProfile(profile);
  } else {
    text('[data-dashboard-greeting]', 'Welcome back');
  }

  const customerBookings = Array.isArray(bookings) ? bookings : [];
  if (bookings) {
    const activeBookings = customerBookings.filter((booking) => activeStatuses.has(String(booking.status || '').toUpperCase()));
    const pending = activeBookings.filter((booking) => String(booking.status).toUpperCase() === 'PENDING').length;
    const awaitingDeposit = activeBookings.filter((booking) => String(booking.status).toUpperCase() === 'AWAITING_DEPOSIT').length;
    const confirmed = activeBookings.filter((booking) => String(booking.status).toUpperCase() === 'CONFIRMED').length;
    text('[data-dashboard-active-count]', String(activeBookings.length));
    const statusParts = [`${confirmed} confirmed`, `${pending} pending`];
    if (awaitingDeposit) statusParts.push(`${awaitingDeposit} awaiting deposit`);
    text('[data-dashboard-booking-status-counts]', statusParts.join(' · '));

    const upcoming = customerBookings
      .filter((booking) => isFuture(booking.eventDate) && !excludedStatuses.has(String(booking.status || '').toUpperCase()))
      .sort((left, right) => String(left.eventDate).localeCompare(String(right.eventDate)));
    const nearest = upcoming[0];
    if (nearest) {
      const days = Math.ceil((toDate(nearest.eventDate) - today) / 86400000);
      text('[data-dashboard-days]', String(days));
      text('[data-dashboard-event-date]', bbFormatDateDisplay(nearest.eventDate));
      text('[data-dashboard-event-message]', `Your next event is on ${bbFormatDateDisplay(nearest.eventDate)}.`);
    } else {
      text('[data-dashboard-days]', '—');
      text('[data-dashboard-event-date]', 'No upcoming event');
      text('[data-dashboard-event-message]', 'No upcoming event is currently scheduled.');
    }

    const table = root.querySelector('[data-dashboard-bookings]');
    if (table) {
      const rows = upcoming.slice(0, 3).map((booking) => {
        const status = String(booking.status || '').toUpperCase();
        const statusLabel = status === 'AWAITING_DEPOSIT' ? 'Awaiting deposit' : bbBookingStatusLabel(status);
        return `<tr><td>${bbEscapeHtml(booking.ref || `BK-${booking.id || ''}`)}</td><td>${bbEscapeHtml(booking.eventType || 'Event')}</td><td>${bbEscapeHtml(booking.venueName || 'Venue not selected')}</td><td>${bbEscapeHtml(bbFormatDateDisplay(booking.eventDate))}</td><td>${bbEscapeHtml(booking.guestCount ?? '—')}</td><td>${bbEscapeHtml(bbFormatMmkDisplay(booking.estimatedTotal))}</td><td><span class="status ${status.toLowerCase()}">${bbEscapeHtml(statusLabel)}</span></td></tr>`;
      });
      table.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="7" class="small text-ink-soft">No upcoming bookings.</td></tr>';
    }
  } else {
    text('[data-dashboard-active-count]', '—');
    text('[data-dashboard-booking-status-counts]', 'Booking data unavailable');
    text('[data-dashboard-days]', '—');
    text('[data-dashboard-event-date]', 'No upcoming event');
    text('[data-dashboard-event-message]', 'Upcoming event information is unavailable.');
    const table = root.querySelector('[data-dashboard-bookings]');
    if (table) table.innerHTML = '<tr><td colspan="7" class="small text-ink-soft">Unable to load bookings.</td></tr>';
  }

  const quotation = Array.isArray(quotations)
    ? [...quotations].sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))[0]
    : null;
  text('[data-dashboard-quotation]', quotation?.total != null ? bbFormatMmkDisplay(quotation.total) : 'No quotation yet');

  const paidPayments = Array.isArray(payments)
    ? payments.filter((payment) => String(payment.paymentStatus || '').toUpperCase() === 'PAID')
    : [];
  const paidTotal = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  text('[data-dashboard-payment]', paidTotal > 0 ? `Paid: ${bbFormatMmkDisplay(paidTotal)}` : 'No payment yet');

  const nextConsultation = Array.isArray(consultations)
    ? consultations
      .filter((consultation) => isFuture(consultation.consultationDate)
        && ['REQUESTED', 'SCHEDULED'].includes(String(consultation.status || '').toUpperCase()))
      .sort((left, right) => `${left.consultationDate}T${left.startTime}`.localeCompare(`${right.consultationDate}T${right.startTime}`))[0]
    : null;
  text('[data-dashboard-consultation-date]', nextConsultation ? bbFormatDateDisplay(nextConsultation.consultationDate) : 'No upcoming consultation');
  if (nextConsultation) {
    const planner = nextConsultation.planner ? ` · ${nextConsultation.planner}` : '';
    text('[data-dashboard-consultation-details]', `${bbFormatTimeDisplay(nextConsultation.startTime)} · ${nextConsultation.consultationType || 'Consultation'}${planner}`);
  } else {
    text('[data-dashboard-consultation-details]', 'No upcoming consultation');
  }
}

async function bbRenderCustomerQuotation() {
  const root = document.querySelector('[data-quotation-page]');
  if (!root) return;

  const queryId = new URLSearchParams(window.location.search).get('id');
  const titleEl = root.querySelector('[data-quotation-title]');
  const subtitleEl = root.querySelector('[data-quotation-subtitle]');
  const errorEl = root.querySelector('[data-quotation-error]');
  const emptyEl = root.querySelector('[data-quotation-empty]');
  const listPanel = root.querySelector('[data-quotation-list-panel]');
  const listEl = root.querySelector('[data-quotation-list]');
  const documentEl = root.querySelector('[data-quotation-document]');
  const acceptButton = root.querySelector('[data-quotation-accept]');
  const rejectButton = root.querySelector('[data-quotation-reject]');
  const paymentLink = root.querySelector('[data-quotation-payment-link]');
  const actionMessageEl = root.querySelector('[data-quotation-action-message]');
  const modalEl = document.querySelector('[data-quotation-modal]');
  const modalTitleEl = modalEl?.querySelector('[data-quotation-modal-title]');
  const modalMessageEl = modalEl?.querySelector('[data-quotation-modal-message]');
  const confirmButton = modalEl?.querySelector('[data-quotation-confirm]');
  const actionModal = modalEl && window.bootstrap ? new bootstrap.Modal(modalEl) : null;
  let activeQuotation = null;
  let pendingAction = null;
  const show = (element, visible) => element?.classList.toggle('d-none', !visible);
  const setError = (message) => {
    if (!errorEl) return;
    errorEl.textContent = message;
    show(errorEl, true);
  };
  const statusLabel = (value) => {
    const status = String(value || '').toUpperCase();
    return status === 'DRAFT' ? 'Draft'
      : status === 'SENT' ? 'Sent'
        : status === 'ACCEPTED' ? 'Accepted'
          : status === 'REJECTED' ? 'Rejected'
            : status === 'EXPIRED' ? 'Expired' : status || 'Unknown';
  };
  const quotationRef = (id) => `QT-${String(id || '').padStart(4, '0')}`;
  const setActionMessage = (message, variant = '') => {
    if (!actionMessageEl) return;
    actionMessageEl.textContent = message;
    actionMessageEl.className = `small ${variant ? `text-${variant}` : 'text-ink-soft'}`;
  };
  const renderActions = (quotation) => {
    activeQuotation = quotation;
    const status = String(quotation.status || '').toUpperCase();
    const isPackage = String(quotation.bookingType || '').toUpperCase() === 'PACKAGE';
    show(acceptButton, status === 'SENT' && !isPackage);
    show(rejectButton, status === 'SENT' && !isPackage);
    const bookingId = Number(quotation.bookingId);
    const hasBooking = Number.isInteger(bookingId) && bookingId > 0;
    show(paymentLink, status === 'ACCEPTED' && hasBooking);
    if (paymentLink && status === 'ACCEPTED' && hasBooking) {
      paymentLink.href = `/prototype/customer/payment.html?bookingId=${encodeURIComponent(bookingId)}`;
    }
    if (status === 'DRAFT') setActionMessage('This quotation is being prepared.');
    else if (status === 'ACCEPTED') setActionMessage(hasBooking ? 'Quotation accepted.' : 'Quotation accepted, but no booking is linked yet.', hasBooking ? 'success' : 'warning');
    else if (status === 'REJECTED') setActionMessage('Quotation rejected and awaiting possible Admin revision.', 'danger');
    else if (status === 'EXPIRED') setActionMessage('Quotation expired.', 'danger');
    else setActionMessage('');
  };
  const openActionConfirmation = (action) => {
    if (!activeQuotation || String(activeQuotation.status || '').toUpperCase() !== 'SENT') return;
    pendingAction = action;
    const accepting = action === 'accept';
    if (modalTitleEl) modalTitleEl.textContent = accepting ? 'Accept this quotation?' : 'Reject this quotation?';
    if (modalMessageEl) modalMessageEl.textContent = accepting
      ? `You are accepting the quoted event total of ${bbFormatMmkDisplay(activeQuotation.total)}.`
      : 'This quotation will be marked as rejected.';
    if (confirmButton) confirmButton.textContent = accepting ? 'Accept Quotation' : 'Reject Quotation';
    if (actionModal) actionModal.show();
  };
  const submitAction = async () => {
    if (!activeQuotation || !pendingAction || !confirmButton) return;
    const action = pendingAction;
    confirmButton.disabled = true;
    confirmButton.textContent = 'Saving...';
    try {
      const updated = await bbFetchCustomerJson(window.bbApiUrl(`/api/customer/quotations/${encodeURIComponent(activeQuotation.id)}/${action}`), {
        method: 'PUT'
      });
      actionModal?.hide();
      renderDetail(updated);
      setActionMessage(action === 'accept' ? 'Quotation accepted.' : 'Quotation rejected.', 'success');
    } catch (error) {
      actionModal?.hide();
      try {
        const current = await bbFetchCustomerJson(window.bbApiUrl(`/api/quotations/${encodeURIComponent(activeQuotation.id)}`), { method: 'GET' });
        if (String(current?.status || '').toUpperCase() === 'EXPIRED') {
          renderDetail(current);
          setActionMessage('Quotation expired.', 'danger');
          return;
        }
      } catch (refreshError) {
        // Preserve the original action error for the customer.
      }
      setActionMessage(error?.message || 'Unable to update this quotation.', 'danger');
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = pendingAction === 'accept' ? 'Accept Quotation' : 'Reject Quotation';
      pendingAction = null;
    }
  };
  acceptButton?.addEventListener('click', () => openActionConfirmation('accept'));
  rejectButton?.addEventListener('click', () => openActionConfirmation('reject'));
  confirmButton?.addEventListener('click', submitAction);
  const renderList = (quotations) => {
    show(listPanel, true);
    if (!listEl) return;
    listEl.innerHTML = quotations.map((quotation) => {
      const event = quotation.event?.eventType || 'Event';
      const date = quotation.event?.eventDate ? bbFormatDateDisplay(quotation.event.eventDate) : 'Date not available';
      return `<a class="list-group-item list-group-item-action d-flex flex-wrap justify-content-between gap-3" href="/prototype/customer/quotation.html?id=${encodeURIComponent(quotation.id)}">
        <span><strong>${bbEscapeHtml(quotationRef(quotation.id))}</strong><br><span class="small text-ink-soft">${bbEscapeHtml(event)} · ${bbEscapeHtml(date)}</span></span>
        <span class="text-md-end"><strong>${bbEscapeHtml(bbFormatMmkDisplay(quotation.total))}</strong><br><span class="small text-ink-soft">${bbEscapeHtml(statusLabel(quotation.status))}</span></span>
      </a>`;
    }).join('');
  };
  const renderDetail = (quotation) => {
    show(emptyEl, false);
    show(listPanel, false);
    show(documentEl, true);
    const event = quotation.event || {};
    const venue = quotation.venue || {};
    const services = Array.isArray(quotation.services) ? quotation.services : [];
    const isPackage = String(quotation.bookingType || '').toUpperCase() === 'PACKAGE';
    const packagePrice = Number(quotation.packageSnapshotPrice ?? quotation.subtotal ?? 0);
    const serviceSubtotal = quotation.serviceSubtotal != null
      ? quotation.serviceSubtotal
      : services.reduce((sum, service) => sum + Number(service.estimatedTotal || 0), 0);
    const text = (selector, value) => {
      const element = root.querySelector(selector);
      if (element) element.textContent = value;
    };

    text('[data-quotation-title]', `Quotation ${quotationRef(quotation.id)}`);
    text('[data-quotation-subtitle]', isPackage ? 'PACKAGE BOOKING · Persisted quotation snapshot' : 'CUSTOM BOOKING · Persisted quotation snapshot');
    text('[data-quotation-reference]', quotationRef(quotation.id));
    text('[data-quotation-created]', bbFormatDateDisplay(quotation.createdAt));
    text('[data-quotation-expires]', quotation.expiresAt ? bbFormatDateDisplay(quotation.expiresAt) : 'Not specified');
    text('[data-quotation-status]', statusLabel(quotation.status));
    text('[data-quotation-event]', isPackage ? (quotation.packageName || 'Package booking') : (event.eventType || 'Event details unavailable'));
    text('[data-quotation-venue]', venue.name || 'Venue details unavailable');
    text('[data-quotation-location]', venue.location || '');
    text('[data-quotation-date]', event.eventDate ? bbFormatDateDisplay(event.eventDate) : 'Not available');
    text('[data-quotation-guests]', event.guestCount != null ? Number(event.guestCount).toLocaleString() : 'Not available');
    text('[data-quotation-venue-price]', venue.price != null ? bbFormatMmkDisplay(venue.price) : 'Price on request');
    text('[data-quotation-service-subtotal]', bbFormatMmkDisplay(serviceSubtotal));
    text('[data-quotation-subtotal]', bbFormatMmkDisplay(isPackage ? packagePrice : quotation.subtotal));
    text('[data-quotation-additional]', bbFormatMmkDisplay(quotation.additionalCharges));
    text('[data-quotation-discount]', bbFormatMmkDisplay(quotation.discount));
    text('[data-quotation-total]', bbFormatMmkDisplay(quotation.total));
    renderActions(quotation);

    const venueRow = root.querySelector('[data-quotation-venue-price]')?.closest('.d-flex');
    const serviceRow = root.querySelector('[data-quotation-service-subtotal]')?.closest('.d-flex');
    venueRow?.classList.toggle('d-none', isPackage);
    serviceRow?.classList.toggle('d-none', isPackage);
    const subtotalLabel = root.querySelector('[data-quotation-subtotal]')?.parentElement?.querySelector('span');
    if (subtotalLabel) subtotalLabel.textContent = isPackage ? 'Package price' : 'Quotation subtotal';

    const servicesEl = root.querySelector('[data-quotation-services]');
    if (servicesEl) {
      const inclusions = Array.isArray(quotation.packageInclusions) ? quotation.packageInclusions : [];
      servicesEl.innerHTML = isPackage
        ? `<tr><td colspan="3"><div class="fw-semibold text-forest mb-2">PACKAGE INCLUSIONS</div>${inclusions.length ? inclusions.map((group) => `<div class="mb-3"><strong>${bbEscapeHtml(group.serviceName || 'Included service')}</strong><ul class="mb-0 mt-1">${(Array.isArray(group.inclusions) ? group.inclusions : []).map((item) => `<li>${bbEscapeHtml(typeof item === 'object' ? (item.label || item.name || item.title || '') : item)}</li>`).join('')}</ul></div>`).join('') : '<span class="text-ink-soft">Package inclusions are not available.</span>'}</td></tr>`
        : services.length
        ? services.map((service) => `<tr><td>${bbEscapeHtml(service.name || 'Selected service')}</td><td>Persisted service selection</td><td class="text-end">${bbEscapeHtml(bbFormatMmkDisplay(service.estimatedTotal))}</td></tr>`).join('')
        : '<tr><td colspan="3" class="text-ink-soft">No selected services recorded.</td></tr>';
    }

    const notesLabel = root.querySelector('[data-quotation-notes-label]');
    if (notesLabel) {
      notesLabel.classList.toggle('d-none', !quotation.notes);
      text('[data-quotation-notes]', quotation.notes || '');
    }
  };

  show(errorEl, false);
  show(emptyEl, false);
  show(listPanel, false);
  show(documentEl, false);
  try {
    if (queryId) {
      const quotation = await bbFetchCustomerJson(window.bbApiUrl(`/api/quotations/${encodeURIComponent(queryId)}`), { method: 'GET' });
      if (!quotation) return;
      renderDetail(quotation);
      return;
    }

    const quotations = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/quotations'), { method: 'GET' });
    if (!Array.isArray(quotations) || quotations.length === 0) {
      show(emptyEl, true);
      if (subtitleEl) subtitleEl.textContent = 'No active quotation found';
      return;
    }
    if (quotations.length === 1) {
      renderDetail(quotations[0]);
    } else {
      if (titleEl) titleEl.textContent = 'Your Quotations';
      if (subtitleEl) subtitleEl.textContent = `${quotations.length} persisted quotations`;
      renderList(quotations);
    }
  } catch (error) {
    setError(error?.status === 403 ? 'You do not have permission to view this quotation.' : 'Unable to load this quotation right now.');
    if (subtitleEl) subtitleEl.textContent = 'Quotation unavailable';
  }
}

async function bbRenderCustomerPayment() {
  const root = document.querySelector('[data-payment-page]');
  if (!root) return;

  const requestedBookingId = new URLSearchParams(window.location.search).get('bookingId');
  const bookingId = Number(requestedBookingId);
  const content = root.querySelector('[data-payment-content]');
  const empty = root.querySelector('[data-payment-empty]');
  const picker = root.querySelector('[data-payment-picker]');
  const bookingList = root.querySelector('[data-payment-booking-list]');
  const error = root.querySelector('[data-payment-error]');
  const message = root.querySelector('[data-payment-message]');
  const submitPanel = root.querySelector('[data-payment-submit-panel]');
  const submitForm = root.querySelector('[data-payment-submit-form]');
  const submitButton = root.querySelector('[data-payment-submit]');
  const submitAmount = root.querySelector('[data-payment-submit-amount]');
  const paymentMethod = root.querySelector('[data-payment-method]');
  const paymentReference = root.querySelector('[data-payment-reference]');
  const submitError = root.querySelector('[data-payment-submit-error]');
  const records = root.querySelector('[data-payment-records]');
  const bookingContext = root.querySelector('[data-payment-booking-context]');
  const submitTitle = root.querySelector('[data-payment-submit-title]');
  let currentBooking = null;
  const show = (element, visible) => element?.classList.toggle('d-none', !visible);
  const setMessage = (element, value) => {
    if (element) element.textContent = value || '';
  };

  const setError = (value) => {
    setMessage(error, value);
    show(error, Boolean(value));
  };

  const setSubmitError = (value) => {
    if (submitError) submitError.textContent = value || '';
    show(submitError, Boolean(value));
  };

  const bookingTypeLabel = (booking) => String(booking?.bookingType || '').toUpperCase() === 'PACKAGE' ? 'Package' : 'Customize';
  const paymentStatusLabel = (summary) => {
    if (summary?.paymentState === 'FULLY_PAID') return 'Fully Paid';
    if (summary?.paymentState === 'BALANCE_OVERDUE') return 'Balance Overdue';
    if (summary?.paymentState === 'BALANCE_DUE') return 'Balance Due';
    if (summary?.paymentState === 'BALANCE_PENDING') return 'Balance Submitted · Awaiting Verification';
    if (summary?.paymentState === 'DEPOSIT_OVERDUE') return 'Deposit Overdue';
    const payments = Array.isArray(summary?.payments) ? summary.payments : [];
    if (payments.some((payment) => String(payment.paymentStatus || '').toUpperCase() === 'PAID')) return 'Payment Confirmed';
    if (payments.some((payment) => String(payment.paymentStatus || '').toUpperCase() === 'PENDING')) return 'Payment Submitted · Awaiting Verification';
    if (String(summary?.nextPaymentType || '').toUpperCase() === 'DEPOSIT') return 'Awaiting Deposit';
    return 'No payment due';
  };

  const renderBookingPicker = async () => {
    show(content, false);
    show(empty, false);
    show(picker, true);
    setError('');
    if (!bookingList) return;
    bookingList.innerHTML = '<p class="text-ink-soft mb-0">Loading your bookings...</p>';
    try {
      const bookings = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/bookings'), { method: 'GET' });
      const candidates = Array.isArray(bookings)
        ? bookings.filter((booking) => !['CANCELLED', 'COMPLETED'].includes(String(booking.status || '').toUpperCase()))
        : [];
      const summaries = await Promise.all(candidates.map(async (booking) => {
        try {
          return { booking, summary: await bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${encodeURIComponent(booking.id)}/payment-summary`), { method: 'GET' }) };
        } catch (requestError) {
          return { booking, summary: null };
        }
      }));
      if (!summaries.length) {
        show(picker, false);
        show(empty, true);
        return;
      }
      bookingList.innerHTML = summaries.map(({ booking, summary }) => {
        const status = paymentStatusLabel(summary);
        const canPay = ['Awaiting Deposit', 'Balance Due'].includes(status);
        const reference = booking.ref || `BK-${String(booking.id || '').padStart(4, '0')}`;
        const amount = summary ? bbFormatMmkDisplay(summary.nextPaymentAmount || summary.depositRequired || 0) : 'Not available';
        return `<div class="border rounded-4 p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div><div class="d-flex flex-wrap align-items-center gap-2"><strong>${bbEscapeHtml(reference)}</strong><span class="badge text-bg-light">${bbEscapeHtml(bookingTypeLabel(booking))}</span></div>
          <div class="small text-ink-soft">${bbEscapeHtml(booking.event?.eventType || 'Event')} · ${bbEscapeHtml(bbFormatDateDisplay(booking.eventDate))} · ${bbEscapeHtml(booking.venue?.name || 'Venue not set')}</div>
          <div class="small mt-1">${bbEscapeHtml(status)}${canPay ? ` · Deposit ${bbEscapeHtml(amount)}` : ''}</div></div>
          <a class="btn ${canPay ? 'btn-gold' : 'btn-outline-forest'} btn-sm" href="/prototype/customer/payment.html?bookingId=${encodeURIComponent(booking.id)}">${canPay ? (status === 'Balance Due' ? 'Pay Balance' : 'Pay Deposit') : 'View Payment'}</a>
        </div>`;
      }).join('');
    } catch (requestError) {
      if (requestError?.status === 401) {
        const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        bbSetAuthReturnUrl(target);
        window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
        return;
      }
      show(picker, false);
      show(empty, true);
      setError('Unable to load your payment bookings right now.');
    }
  };

  if (!Number.isInteger(bookingId) || bookingId <= 0 || !requestedBookingId) {
    renderBookingPicker();
    return;
  }

  const render = (summary) => {
    show(content, true);
    show(empty, false);
    setError('');
    setMessage(message, '');

    const text = (selector, value) => setMessage(root.querySelector(selector), value);
    text('[data-payment-quotation-total]', bbFormatMmkDisplay(summary.quotationTotal));
    text('[data-payment-deposit-required]', bbFormatMmkDisplay(summary.depositRequired));
    text('[data-payment-deposit-due]', summary.depositDueDate ? bbFormatDateDisplay(summary.depositDueDate) : 'Not scheduled');
    text('[data-payment-amount-paid]', bbFormatMmkDisplay(summary.amountPaid));
    text('[data-payment-remaining]', bbFormatMmkDisplay(summary.remainingBalance));
    text('[data-payment-balance-due]', summary.balanceDueDate ? bbFormatDateDisplay(summary.balanceDueDate) : 'Not scheduled');

    const nextType = String(summary.nextPaymentType || '').toUpperCase();
    const nextAmount = Number(summary.nextPaymentAmount || 0);
    const bookingStatus = String(currentBooking?.status || '').toUpperCase();
    const payments = Array.isArray(summary.payments) ? summary.payments : [];
    const paidDeposit = payments.some((payment) => String(payment.paymentType || '').toUpperCase() === 'DEPOSIT'
      && String(payment.paymentStatus || '').toUpperCase() === 'PAID');
    const pendingNext = payments.some((payment) =>
      String(payment.paymentStatus || '').toUpperCase() === 'PENDING'
      && String(payment.paymentType || '').toUpperCase() === nextType
    );

    if (Number(summary.remainingBalance || 0) === 0 && !nextType) {
      text('[data-payment-next-type]', 'Payment complete');
      text('[data-payment-next-message]', 'Payment complete. No further payment is required.');
      show(submitPanel, false);
    } else if (nextType) {
      const overdue = ['DEPOSIT_OVERDUE', 'BALANCE_OVERDUE'].includes(summary.paymentState);
      const balancePayment = nextType === 'BALANCE';
      const canSubmit = !pendingNext && !overdue && ((nextType === 'DEPOSIT' && bookingStatus === 'AWAITING_DEPOSIT') || (balancePayment && bookingStatus === 'CONFIRMED'));
      text('[data-payment-next-type]', summary.paymentState || nextType);
      text('[data-payment-next-amount]', bbFormatMmkDisplay(nextAmount));
      text('[data-payment-next-message]', pendingNext
        ? 'Payment Submitted · Awaiting Verification'
        : overdue ? 'The payment deadline has passed.' : 'Payment requests remain pending until payment confirmation is available.');
      text('[data-payment-pending-message]', pendingNext ? 'The admin will verify your payment before your booking is updated.' : '');
      show(submitPanel, canSubmit);
      if (submitTitle) submitTitle.textContent = balancePayment ? 'Pay Remaining Balance' : 'Pay Deposit';
      if (submitButton) submitButton.textContent = balancePayment ? 'Submit Balance Payment' : 'Submit Deposit Payment';
      if (submitAmount) submitAmount.textContent = bbFormatMmkDisplay(nextAmount);
    } else {
      text('[data-payment-next-type]', 'No payment due');
      text('[data-payment-next-amount]', bbFormatMmkDisplay(0));
      text('[data-payment-next-message]', 'No further payment is required.');
      show(submitPanel, false);
    }

    if (records) {
      records.innerHTML = payments.length ? payments.map((payment) => {
        const status = String(payment.paymentStatus || '').toUpperCase();
        const type = String(payment.paymentType || 'PAYMENT').toUpperCase();
        const details = [payment.paymentMethod, payment.transactionReference, payment.submittedAt ? `Submitted ${bbFormatDateDisplay(payment.submittedAt)}` : '', payment.paidAt ? `Paid ${bbFormatDateDisplay(payment.paidAt)}` : '', payment.rejectedAt ? `Rejected ${bbFormatDateDisplay(payment.rejectedAt)}` : '', payment.adminNote]
          .filter(Boolean)
          .join(' · ');
        return `<div class="d-flex flex-wrap justify-content-between gap-3 border-bottom py-3"><div><strong>${bbEscapeHtml(type)}</strong><div class="small text-ink-soft">${bbEscapeHtml(details || 'Payment request')}</div></div><div class="text-md-end"><strong>${bbEscapeHtml(bbFormatMmkDisplay(payment.amount))}</strong><div class="small"><span class="status ${status.toLowerCase()}">${bbEscapeHtml(status || 'UNKNOWN')}</span></div></div></div>`;
      }).join('') : '<p class="text-ink-soft mb-0">No payment requests yet.</p>';
    }
  };

  const renderBookingContext = (booking) => {
    if (!bookingContext) return;
    const type = String(booking.bookingType || '').toUpperCase() === 'PACKAGE' ? 'Package' : 'Customize';
    bookingContext.textContent = `${booking.ref || `BK-${booking.id}`} · ${type} · ${booking.event?.eventType || 'Event'} · ${bbFormatDateDisplay(booking.eventDate)} · ${booking.venue?.name || 'Venue not set'}`;
  };

  const loadSummary = async () => bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${encodeURIComponent(bookingId)}/payment-summary`), { method: 'GET' });

  try {
    const [summary, booking] = await Promise.all([
      loadSummary(),
      bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${encodeURIComponent(bookingId)}`), { method: 'GET' })
    ]);
    currentBooking = booking;
    renderBookingContext(booking);
    render(summary);
  } catch (requestError) {
    if (requestError?.status === 401) {
      const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      bbSetAuthReturnUrl(target);
      window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
      return;
    }
    show(content, false);
    show(empty, true);
    setError(requestError?.status === 403 ? 'Payment information could not be loaded.' : (requestError?.status === 400 ? requestError.message : 'Payment information could not be loaded.'));
    return;
  }

  submitForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitError('');
    const method = paymentMethod?.value || '';
    const reference = paymentReference?.value.trim() || '';
    if (!method) {
      setSubmitError('Please select a payment method.');
      paymentMethod?.focus();
      return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting payment...';
    setError('');
    try {
      await bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${encodeURIComponent(bookingId)}/payments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ paymentMethod: method, transactionReference: reference || null })
      });
      render(await loadSummary());
      setMessage(message, 'Deposit Submitted · Awaiting Verification');
      show(message, true);
    } catch (requestError) {
      const status = requestError?.status;
      setSubmitError(status === 409 ? 'A payment request is already awaiting verification.' : status === 400 ? 'This booking is not currently eligible for payment.' : 'Payment could not be submitted.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}

function bbSetAuth(auth, remember = false) {
  if (!auth?.token) return false;

  bbClearAuth();

  const storage = remember ? window.localStorage : window.sessionStorage;
  const user = {
    userId: auth.userId ?? null,
    email: auth.email || '',
    fullName: auth.fullName || '',
    roles: Array.isArray(auth.roles) ? auth.roles : [],
    tokenType: auth.tokenType || 'Bearer'
  };

  storage.setItem(BB_AUTH_KEYS.token, auth.token);
  storage.setItem(BB_AUTH_KEYS.user, JSON.stringify(user));
  storage.setItem(BB_AUTH_KEYS.mode, remember ? 'local' : 'session');
  return true;
}

function bbClearAuth() {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    storage.removeItem(BB_AUTH_KEYS.token);
    storage.removeItem(BB_AUTH_KEYS.user);
    storage.removeItem(BB_AUTH_KEYS.mode);
  });
  bbClearNotificationUi();
}

function bbGetAuthReturnUrl() {
  try {
    const current = new URL(window.location.href);
    const fromQuery = current.searchParams.get('returnUrl');
    if (fromQuery) return fromQuery;
  } catch (error) {
    // ignore URL parsing failures
  }
  return window.sessionStorage.getItem(BB_AUTH_KEYS.returnUrl) || '';
}

function bbSetAuthReturnUrl(value) {
  if (value) {
    window.sessionStorage.setItem(BB_AUTH_KEYS.returnUrl, value);
  }
}

function bbClearAuthReturnUrl() {
  window.sessionStorage.removeItem(BB_AUTH_KEYS.returnUrl);
}

function bbReadPasswordResetFlow() {
  try {
    const raw = window.sessionStorage.getItem(BB_PASSWORD_RESET_KEYS.flow);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function bbWritePasswordResetFlow(flow) {
  if (!flow) {
    window.sessionStorage.removeItem(BB_PASSWORD_RESET_KEYS.flow);
    return;
  }
  window.sessionStorage.setItem(BB_PASSWORD_RESET_KEYS.flow, JSON.stringify(flow));
}

function bbClearPasswordResetFlow() {
  window.sessionStorage.removeItem(BB_PASSWORD_RESET_KEYS.flow);
}

function bbGetPasswordResetCooldownUntil() {
  return Number(window.sessionStorage.getItem(BB_PASSWORD_RESET_KEYS.cooldownUntil) || 0);
}

function bbSetPasswordResetCooldownUntil(value) {
  if (!value || Number(value) <= Date.now()) {
    window.sessionStorage.removeItem(BB_PASSWORD_RESET_KEYS.cooldownUntil);
    return;
  }
  window.sessionStorage.setItem(BB_PASSWORD_RESET_KEYS.cooldownUntil, String(Number(value)));
}

function bbResolveAuthRedirect(fallback = '/prototype/customer/dashboard.html') {
  const roles = bbGetAuthUser()?.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const roleFallback = isAdmin ? '/prototype/admin/dashboard.html' : fallback;
  const returnUrl = bbGetAuthReturnUrl();
  if (!returnUrl) return roleFallback;

  try {
    const target = new URL(returnUrl, window.location.origin);
    const safePath = `${target.pathname}${target.search}${target.hash}`;
    if (target.origin !== window.location.origin || !target.pathname.startsWith('/prototype/')) {
      return roleFallback;
    }
    if (target.pathname === '/prototype/login.html' || target.pathname === '/prototype/register.html') {
      return roleFallback;
    }
    if (target.pathname.startsWith('/prototype/admin/') && !isAdmin) {
      return '/prototype/customer/dashboard.html';
    }
    return safePath;
  } catch (error) {
    return roleFallback;
  }
}

function bbAuthHeaders(extraHeaders = {}) {
  const token = bbGetAuthToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : { ...extraHeaders };
}

async function bbFetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: bbAuthHeaders({
      Accept: 'application/json',
      ...(options.headers || {})
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function bbFetchCustomerJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: bbAuthHeaders({
      Accept: 'application/json',
      ...(options.headers || {})
    })
  });

  if (response.status === 401) {
    const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    bbClearAuth();
    bbSetAuthReturnUrl(target);
    window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function bbClearNotificationUi() {
  bbNotificationState = [];
  document.querySelectorAll('[data-notification-count]').forEach((badge) => {
    badge.hidden = true;
    badge.textContent = '';
  });
  document.querySelectorAll('[data-notification-list]').forEach((list) => {
    list.innerHTML = '';
  });
}

function bbNotificationBadgeCount(count) {
  document.querySelectorAll('[data-notification-bell]').forEach((button) => {
    button.classList.add('bb-notification-bell');
    let badge = button.querySelector('[data-notification-count]');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'bb-notification-count';
      badge.dataset.notificationCount = '';
      button.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count > 0 ? String(count) : '';
    badge.hidden = count <= 0;
  });
}

function bbIsTrustedNotificationPath(value) {
  const path = String(value || '').trim();
  if (!path || !path.startsWith('/prototype/') || path.startsWith('//') || path.includes('\\') || path.includes('//')) return false;
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith('/prototype/');
  } catch (error) {
    return false;
  }
}

function bbRenderNotifications(list, state = bbNotificationState) {
  if (!list) return;
  if (!state.length) {
    list.innerHTML = '<li class="text-ink-soft">You\'re all caught up.</li>';
    return;
  }
  list.innerHTML = state.map((notification) => `
    <li>
      <button type="button" class="w-100 text-start border-0 bg-transparent p-2 rounded ${notification.read ? '' : 'bg-light border-start border-3 border-gold'}" data-notification-item data-notification-id="${notification.id}">
        <strong>${bbEscapeHtml(notification.title || 'Notification')}</strong><br>
        <span class="text-ink-soft">${bbEscapeHtml(notification.message || '')}</span>
      </button>
    </li>`).join('');
}

async function bbLoadCustomerNotifications() {
  const list = document.querySelector('[data-notification-list]');
  if (!list) return;
  list.innerHTML = '<li class="text-ink-soft">Loading notifications...</li>';
  try {
    const [data, unreadCount] = await Promise.all([
      bbFetchCustomerJson(window.bbApiUrl('/api/notifications?limit=20'), { method: 'GET' }),
      bbFetchCustomerJson(window.bbApiUrl('/api/notifications/unread-count'), { method: 'GET' })
    ]);
    bbNotificationState = Array.isArray(data) ? data : [];
    bbNotificationBadgeCount(Number(unreadCount) || 0);
    bbRenderNotifications(list);
  } catch (error) {
    bbNotificationState = [];
    bbNotificationBadgeCount(0);
    list.innerHTML = '<li class="text-ink-soft">Unable to load notifications.</li>';
    console.warn('Customer notifications unavailable.');
  }
}

function bbInitCustomerNotifications() {
  const authUser = bbGetAuthUser();
  if (!authUser?.roles?.includes('ROLE_CUSTOMER')) return;

  let modal = document.querySelector('#notifyModal');
  let bells = [...document.querySelectorAll('[data-bs-target="#notifyModal"]')];
  if (!modal) {
    const actions = document.querySelector('.bb-nav .container-fluid > .d-flex');
    if (!actions) return;
    const bell = document.createElement('button');
    bell.type = 'button';
    bell.className = 'btn btn-outline-forest btn-sm bb-notification-bell';
    bell.dataset.bsToggle = 'modal';
    bell.dataset.bsTarget = '#notifyModal';
    bell.innerHTML = '<i class="bi bi-bell"></i><span class="visually-hidden">Notifications</span>';
    actions.prepend(bell);
    document.body.insertAdjacentHTML('beforeend', '<div class="modal fade" id="notifyModal" tabindex="-1" aria-labelledby="notifyModalTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="notifyModalTitle">Notifications</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><ul class="list-unstyled d-grid gap-2 mb-0" data-notification-list></ul></div></div></div></div>');
    modal = document.querySelector('#notifyModal');
    bells = [bell];
  }

  bells.forEach((button) => {
    button.dataset.notificationBell = '';
    [...button.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    });
    button.addEventListener('click', () => { void bbLoadCustomerNotifications(); });
  });

  const list = modal.querySelector('[data-notification-list]');
  if (!list) return;
  list.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-notification-item]');
    if (!item) return;
    const notification = bbNotificationState.find((entry) => String(entry.id) === String(item.dataset.notificationId));
    if (!notification) return;
    try {
      await bbFetchCustomerJson(window.bbApiUrl(`/api/notifications/${encodeURIComponent(notification.id)}/read`), { method: 'PATCH' });
      notification.read = true;
      bbNotificationBadgeCount(bbNotificationState.filter((entry) => !entry.read).length);
      bbRenderNotifications(list);
      const path = String(notification.actionUrl || '');
      if (bbIsTrustedNotificationPath(path)) window.location.href = path;
    } catch (error) {
      console.warn('Unable to mark notification as read.');
    }
  });

  const markAll = document.createElement('button');
  markAll.type = 'button';
  markAll.className = 'btn btn-link btn-sm px-0 mt-3';
  markAll.textContent = 'Mark all as read';
  markAll.addEventListener('click', async () => {
    try {
      await bbFetchCustomerJson(window.bbApiUrl('/api/notifications/read-all'), { method: 'PATCH' });
      bbNotificationState.forEach((notification) => { notification.read = true; });
      bbNotificationBadgeCount(0);
      bbRenderNotifications(list);
    } catch (error) {
      console.warn('Unable to mark notifications as read.');
    }
  });
  modal.querySelector('.modal-body')?.appendChild(markAll);
  void bbLoadCustomerNotifications();
}

function bbNormalizeVenueName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function bbFindVenueIdByName(name) {
  const target = bbNormalizeVenueName(name);
  if (!target) return null;

  const venues = await bbFetchJson(window.bbApiUrl('/api/venues'), {
    method: 'GET',
    headers: {}
  });

  if (!Array.isArray(venues)) return null;
  const match = venues.find((venue) => bbNormalizeVenueName(venue.name) === target);
  return match?.id || null;
}

function bbEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bbFormatMmkDisplay(value) {
  return `MMK ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function bbFormatDateDisplay(value) {
  if (!value) return 'TBD';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  return String(value);
}

function bbFormatTimeDisplay(value) {
  if (!value) return 'TBD';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{2}):(\d{2})/);
  if (!match) return raw;
  let hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

function bbPrettyKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function bbBookingStatusLabel(status) {
  const key = String(status || '').toUpperCase();
  switch (key) {
    case 'PENDING':
      return 'Pending review';
    case 'AWAITING_DEPOSIT':
      return 'Awaiting deposit';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    default:
      return key ? bbPrettyKey(key) : 'Unknown';
  }
}

function bbBookingStatusClass(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'CONFIRMED') return 'confirmed';
  if (key === 'CANCELLED') return 'cancelled';
  if (key === 'COMPLETED') return 'completed';
  return 'pending';
}

function bbRenderDeepValue(value) {
  if (value === null || value === undefined || value === '') {
    return '<span class="text-ink-soft">None</span>';
  }

  if (Array.isArray(value)) {
    if (!value.length) return '<span class="text-ink-soft">None</span>';
    return `<ul class="list-unstyled mb-0 d-grid gap-2">${value.map((item) => `<li>${bbRenderDeepValue(item)}</li>`).join('')}</ul>`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '<span class="text-ink-soft">None</span>';
    return `<dl class="row g-0 mb-0 small">${entries.map(([key, item]) => {
      const rendered = bbRenderDeepValue(item);
      return `<dt class="col-sm-5 text-ink-soft fw-normal">${bbEscapeHtml(bbPrettyKey(key))}</dt><dd class="col-sm-7 mb-2">${rendered}</dd>`;
    }).join('')}</dl>`;
  }

  return `<span>${bbEscapeHtml(value)}</span>`;
}

function bbRenderBookingServiceCard(service) {
  const label = service?.name || 'Service';
  const total = bbFormatMmkDisplay(service?.estimatedTotal || 0);
  const customization = service?.customization;
  const detailHtml = customization ? bbRenderDeepValue(customization) : '<span class="text-ink-soft">No customization saved.</span>';
  return `
    <div class="booking-service-card border rounded-4 p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
        <div>
          <div class="stat-label mb-1">${bbEscapeHtml(label)}</div>
          <div class="fw-semibold text-forest">${bbEscapeHtml(total)}</div>
        </div>
        <span class="feature-icon"><i class="bi bi-check2-circle"></i></span>
      </div>
      <div class="small">${detailHtml}</div>
    </div>
  `;
}

function bbRenderBookingCatering(service) {
  if (!service) {
    return '<p class="text-ink-soft mb-0">No catering selections were saved for this booking.</p>';
  }

  const menuSelections = Array.isArray(service.menuSelections) && service.menuSelections.length
    ? `<ul class="list-unstyled mb-3 d-grid gap-2">${service.menuSelections.map((item) => `
        <li class="d-flex justify-content-between gap-3">
          <span>${bbEscapeHtml(item.name || `Food #${item.foodId || ''}`)}${item.quantity ? ` <span class="text-ink-soft">x${bbEscapeHtml(item.quantity)}</span>` : ''}</span>
          <span class="fw-semibold">${bbFormatMmkDisplay(item.estimatedTotal || 0)}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="text-ink-soft mb-3 mb-lg-0">No menu selections were synced yet.</p>';

  return `
    <div class="d-grid gap-3">
      <div>
        <div class="stat-label mb-1">Catering</div>
        <div class="fw-semibold text-forest">${bbEscapeHtml(bbFormatMmkDisplay(service.estimatedTotal || 0))}</div>
      </div>
      <div>${bbRenderDeepValue(service.customization)}</div>
      <div>
        <div class="stat-label mb-2">Menu selections</div>
        ${menuSelections}
      </div>
    </div>
  `;
}

function bbHasPackageBookingMode() {
  return bbGetBookingMode() === 'PACKAGE';
}

function bbHasActivePackageBookingDraft() {
  const plan = bbGetPackagePlan();
  return bbHasPackageBookingMode()
    && Boolean(String(plan?.packageId || '').trim() || String(plan?.packageSlug || '').trim());
}

function bbHasActiveCustomizeBookingDraft() {
  if (bbGetBookingMode() !== 'CUSTOM') return false;
  return Boolean(
    bbRead(BB_STATE_KEYS.venue)
    || bbRead(BB_STATE_KEYS.event)
    || bbRead(BB_STATE_KEYS.services)
    || bbRead(BB_STATE_KEYS.serviceData)
    || bbRead(BB_STATE_KEYS.catering)
  );
}

function bbPackagePlanSignature(plan) {
  return JSON.stringify({
    packageId: plan?.packageId || null,
    packageSlug: plan?.packageSlug || null,
    venueId: plan?.venueId || null,
    eventDate: plan?.eventDate || '',
    startTime: plan?.startTime || '',
    endTime: plan?.endTime || '',
    guestCount: plan?.guestCount || null,
    packageAvailable: plan?.packageAvailable === true,
    available: plan?.available === true
  });
}

function bbPackageBookingAvailabilityIsValid(plan, packageData) {
  const backendId = Number(packageData?.id);
  const planId = Number(plan?.packageId);
  const backendVenueId = Number(packageData?.venue?.id);
  const planVenueId = Number(plan?.venueId);
  const maxGuests = Number(packageData?.maxGuests);
  const guestCount = Number(plan?.guestCount);
  const identityMatches = (Number.isInteger(planId) && planId > 0)
    ? planId === backendId
    : String(plan?.packageSlug || '') === String(packageData?.slug || '');

  return identityMatches
    && Number.isInteger(backendVenueId) && backendVenueId > 0
    && planVenueId === backendVenueId
    && /^\d{4}-\d{2}-\d{2}$/.test(String(plan?.eventDate || ''))
    && /^\d{2}:\d{2}$/.test(String(plan?.startTime || ''))
    && /^\d{2}:\d{2}$/.test(String(plan?.endTime || ''))
    && Number.isInteger(guestCount) && guestCount > 0
    && Number.isFinite(maxGuests) && guestCount <= maxGuests
    && (plan?.packageAvailable === true || plan?.available === true);
}

function bbRenderPackageServiceGroups(root, packageData) {
  const services = Array.isArray(packageData?.services)
    ? packageData.services
    : (Array.isArray(packageData?.includedServices) ? packageData.includedServices : []);
  const serviceOrder = [
    'Catering',
    'Decoration & Styling',
    'Photography & Videography',
    'Entertainment',
    'Lighting & AV',
    'Cake & Desserts',
    'Floral Design'
  ];
  const byName = new Map(services.map((service) => [String(service?.serviceName || service?.name || '').trim().toLowerCase(), service]));
  const serviceList = root.querySelector('[data-booking-services-display]');
  if (!serviceList) return;
  serviceList.classList.add('booking-package-services-list');
  root.querySelector('[data-booking-package-fixed-note]')?.classList.remove('d-none');

  serviceList.innerHTML = serviceOrder.map((name) => {
    const service = byName.get(name.toLowerCase());
    const inclusions = Array.isArray(service?.inclusions) ? service.inclusions : [];
    const items = inclusions.map((item) => {
      const label = typeof item === 'object' ? (item?.label || item?.name || item?.title || '') : item;
      return String(label || '').trim();
    }).filter(Boolean);
    const inclusionMarkup = items.length
      ? items.map((item) => `<li>${bbEscapeHtml(item)}</li>`).join('')
      : '<li>Included service details will be confirmed with your package.</li>';
    const panelId = `booking-package-service-panel-${serviceOrder.indexOf(name)}`;
    return `<li class="booking-package-service-row"><button class="booking-package-service-row__toggle" type="button" aria-expanded="false" aria-controls="${panelId}"><span>${bbEscapeHtml(name)}</span><i class="bi bi-chevron-down" aria-hidden="true"></i></button><div class="booking-package-service-row__panel" id="${panelId}" hidden><ul>${inclusionMarkup}</ul></div></li>`;
  }).join('');

  serviceList.querySelectorAll('.booking-package-service-row__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const panel = serviceList.querySelector(`#${CSS.escape(toggle.getAttribute('aria-controls'))}`);
      if (!panel) return;
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
      toggle.classList.toggle('is-open', !isOpen);
    });
  });
}

async function bbRenderPackageBookingDraftSummary(form, plan) {
  const root = form.closest('[data-booking-confirmation-page]');
  const summaryBody = root?.querySelector('.booking-summary-panel .panel__body');
  const statusEl = form.querySelector('[data-booking-status]');
  const customHero = root?.querySelector('[data-booking-custom-hero]');
  const packageEventCard = root?.querySelector('[data-booking-package-event-card]');
  const signature = bbPackagePlanSignature(plan);
  const packageKey = encodeURIComponent(String(plan.packageSlug || plan.packageId));
  let packageData;

  const mapText = (selector, value) => {
    const element = root?.querySelector(selector);
    if (element) element.textContent = value;
  };
  const setStatus = (message, variant = 'danger') => {
    if (!statusEl) return;
    statusEl.className = `col-12 alert alert-${variant}`;
    statusEl.textContent = message;
    statusEl.classList.remove('d-none');
  };
  const lockPackageSubmission = (message) => {
    if (summaryBody) {
      const submit = summaryBody.querySelector('[data-booking-submit]');
      if (submit) {
        submit.classList.add('d-none');
      }
    }
    setStatus(message, 'warning');
    if (statusEl) {
      const link = document.createElement('a');
      link.href = '/prototype/packages.html';
      link.className = 'alert-link d-block mt-2';
      link.textContent = 'Return to Packages';
      statusEl.appendChild(link);
    }
  };

  customHero?.classList.add('d-none');
  packageEventCard?.classList.remove('d-none');
  root?.classList.add('is-package-mode');
  packageEventCard?.querySelector('[data-package-edit-event]')?.classList.remove('d-none');
  const mapPackageEventText = (selector, value) => {
    const element = packageEventCard?.querySelector(selector);
    if (element) element.textContent = value || 'Not specified';
  };
  mapPackageEventText('[data-package-event-date]', plan.eventDate ? bbFormatDateDisplay(plan.eventDate) : 'Not specified');
  mapPackageEventText('[data-package-event-start]', plan.startTime ? bbFormatTimeDisplay(plan.startTime) : 'Not specified');
  mapPackageEventText('[data-package-event-end]', plan.endTime ? bbFormatTimeDisplay(plan.endTime) : 'Not specified');
  mapPackageEventText('[data-package-event-guests]', plan.guestCount ? `${Number(plan.guestCount).toLocaleString()} guests` : 'Not specified');
  mapPackageEventText('[data-package-event-package]', plan.packageName || 'Not specified');
  mapPackageEventText('[data-package-event-venue]', plan.venueName || 'Not specified');

  root?.querySelector('[data-booking-edit-services]')?.classList.add('d-none');
  root?.querySelector('[data-booking-edit-venue]')?.classList.add('d-none');
  mapText('[data-booking-selection-label]', 'SELECTED PACKAGE');
  mapText('[data-booking-selection-subtitle]', 'Everything included in your package');
  mapText('[data-booking-total-label]', 'Package Price');
  mapText('[data-booking-side-total-label]', 'Package Total');

  try {
    const cache = window.__bbPackageBookingFetch || {};
    if (cache.key === packageKey && cache.promise) {
      packageData = await cache.promise;
    } else {
      const promise = bbFetchJson(window.bbApiUrl(`/api/packages/${packageKey}`), { headers: { Accept: 'application/json' } });
      window.__bbPackageBookingFetch = { key: packageKey, promise };
      packageData = await promise;
    }
  } catch (error) {
    if (bbPackagePlanSignature(bbGetPackagePlan()) !== signature) return;
    lockPackageSubmission('We could not load this package right now. Please return to Packages and try again.');
    return;
  }

  if (bbPackagePlanSignature(bbGetPackagePlan()) !== signature) return;
  const venue = packageData?.venue || {};
  const finalPrice = Number(packageData?.finalPrice);
  const specialRequests = form.querySelector('[name="specialRequests"]')?.value?.trim() || '';
  const validPackage = Number.isInteger(Number(packageData?.id))
    && Boolean(String(packageData?.name || '').trim())
    && Number.isFinite(finalPrice) && finalPrice >= 0;

  const setInputValue = (selector, value) => {
    const input = form.querySelector(selector);
    if (input) input.value = value || '';
  };
  setInputValue('[name="eventDate"]', plan.eventDate);
  setInputValue('[name="startTime"]', plan.startTime);
  setInputValue('[name="endTime"]', plan.endTime);
  setInputValue('[name="guests"]', plan.guestCount);
  setInputValue('[name="venue"]', venue.name || plan.venueName);

  mapText('[data-booking-event-type-display]', packageData.category || 'Package event');
  mapText('[data-booking-venue-display]', venue.name || plan.venueName || 'Not specified');
  mapText('[data-booking-venue-location-display]', venue.location || 'Not specified');
  mapText('[data-booking-event-date-display]', plan.eventDate ? bbFormatDateDisplay(plan.eventDate) : 'Not specified');
  mapText('[data-booking-start-time-display]', plan.startTime ? bbFormatTimeDisplay(plan.startTime) : 'Not specified');
  mapText('[data-booking-end-time-display]', plan.endTime ? bbFormatTimeDisplay(plan.endTime) : 'Not specified');
  mapText('[data-booking-guests-display]', plan.guestCount ? `${Number(plan.guestCount).toLocaleString()} Guests` : 'Not specified');
  mapText('[data-booking-special-requests-display]', 'No special requests');
  mapText('[data-booking-total-display]', validPackage ? bbFormatMmkDisplay(finalPrice) : 'MMK 0');
  mapText('[data-booking-total-display-side]', validPackage ? bbFormatMmkDisplay(finalPrice) : 'MMK 0');
  mapPackageEventText('[data-package-event-package]', packageData.name || plan.packageName || 'Not specified');
  mapPackageEventText('[data-package-event-venue]', venue.name || plan.venueName || 'Not specified');
  bbRenderPackageServiceGroups(root, packageData);

  const cateringSection = root.querySelector('[data-booking-catering-display]')?.closest('.col-12');
  if (cateringSection) cateringSection.classList.add('d-none');

  if (summaryBody) {
    summaryBody.innerHTML = `
      <div class="booking-package-summary-row"><span class="booking-package-summary-label">PACKAGE</span><strong>${bbEscapeHtml(packageData.name || plan.packageName || 'Selected package')}</strong></div>
      <div class="booking-package-summary-row"><span class="booking-package-summary-label">VENUE</span><strong>${bbEscapeHtml(venue.name || plan.venueName || 'Selected venue')}</strong></div>
      <div class="booking-package-summary-row"><span class="booking-package-summary-label">EVENT</span><strong>${bbEscapeHtml(packageData.category || 'Package event')} · ${bbEscapeHtml(Number(plan.guestCount || 0).toLocaleString())} guests</strong></div>
      <div class="booking-package-summary-row"><span class="booking-package-summary-label">DATE</span><strong>${bbEscapeHtml(plan.eventDate ? bbFormatDateDisplay(plan.eventDate) : 'Not specified')}</strong></div>
      <div class="booking-package-summary-row"><span class="booking-package-summary-label">TIME</span><strong>${bbEscapeHtml(plan.startTime ? bbFormatTimeDisplay(plan.startTime) : 'Not specified')} – ${bbEscapeHtml(plan.endTime ? bbFormatTimeDisplay(plan.endTime) : 'Not specified')}</strong></div>
      <hr>
      <div class="booking-package-summary-total"><span class="booking-package-summary-label">PACKAGE TOTAL</span><span class="bb-price">${validPackage ? bbFormatMmkDisplay(finalPrice) : 'MMK 0'}</span></div>
      <div class="booking-package-special-requests"><div class="booking-package-summary-label">SPECIAL REQUESTS</div><div data-package-special-requests-summary>${bbEscapeHtml(specialRequests || 'No special requests')}</div></div>
      <hr class="booking-package-summary-divider">
      <button class="btn btn-gold w-100" type="submit" data-booking-submit form="bookingConfirmForm">CONFIRM PACKAGE BOOKING</button>
      <a class="btn btn-outline-forest w-100" href="/prototype/packages.html">Back to Packages</a>
    `;
  }

  const availabilityValid = validPackage && bbPackageBookingAvailabilityIsValid(plan, packageData);
  const packageStatus = packageEventCard?.querySelector('[data-package-event-status]');
  packageStatus?.classList.toggle('d-none', !availabilityValid);
  if (!availabilityValid) {
    lockPackageSubmission('Please check package availability again before booking.');
    return;
  }
  if (statusEl) {
    statusEl.className = 'col-12 alert d-none';
    statusEl.textContent = '';
  }
}

function bbRenderPackageBookingSuccess(form, booking) {
  const root = form.closest('[data-booking-confirmation-page]');
  const summaryBody = root?.querySelector('.booking-summary-panel .panel__body');
  const packageCard = root?.querySelector('[data-booking-package-event-card]');
  const packageColumn = root?.querySelector('.row.g-4 > .col-lg-8');
  const statusEl = form.querySelector('[data-booking-status]');
  if (packageColumn) packageColumn.classList.add('d-none');
  if (packageCard) packageCard.classList.add('d-none');
  if (statusEl) statusEl.classList.add('d-none');
  if (!summaryBody) return;

  const status = String(booking?.bookingStatus || 'PENDING').toUpperCase();
  const statusText = status === 'PENDING'
    ? 'Package booking submitted successfully.'
    : `Package booking ${status.toLowerCase()}.`;
  const bookingRef = booking?.bookingReference || `BK-${String(booking?.bookingId || '').padStart(4, '0')}`;
  const time = `${bbFormatTimeDisplay(booking?.startTime)} – ${bbFormatTimeDisplay(booking?.endTime)}`;
  summaryBody.innerHTML = `
    <div class="text-center py-3">
      <div class="feature-icon mx-auto mb-3"><i class="bi bi-check2-circle"></i></div>
      <div class="eyebrow">${bbEscapeHtml(status)}</div>
      <h4 class="mt-2">${bbEscapeHtml(statusText)}</h4>
      <p class="text-ink-soft mb-4">Reference <strong>${bbEscapeHtml(bookingRef)}</strong></p>
      <div class="text-start d-grid gap-2 small mb-4">
        <div class="d-flex justify-content-between gap-3"><span>Package</span><strong>${bbEscapeHtml(booking?.packageName || 'Selected package')}</strong></div>
        <div class="d-flex justify-content-between gap-3"><span>Venue</span><strong>${bbEscapeHtml(booking?.venueName || 'Selected venue')}</strong></div>
        <div class="d-flex justify-content-between gap-3"><span>Date</span><strong>${bbEscapeHtml(bbFormatDateDisplay(booking?.eventDate))}</strong></div>
        <div class="d-flex justify-content-between gap-3"><span>Time</span><strong>${bbEscapeHtml(time)}</strong></div>
        <div class="d-flex justify-content-between gap-3"><span>Guests</span><strong>${bbEscapeHtml(Number(booking?.guestCount || 0).toLocaleString())}</strong></div>
      </div>
      <div class="d-grid gap-2">
        <a class="btn btn-gold" href="/prototype/customer/booking-status.html?id=${encodeURIComponent(booking?.bookingId || '')}">View Booking Status</a>
        <a class="btn btn-outline-forest" href="/prototype/customer/booking-history.html">Booking History</a>
      </div>
    </div>
  `;
}

function bbSyncPackageSpecialRequestsSummary(form) {
  if (!form || !bbHasPackageBookingMode()) return;
  const summary = form.closest('[data-booking-confirmation-page]')?.querySelector('[data-package-special-requests-summary]');
  if (!summary) return;
  const value = form.querySelector('[name="specialRequests"]')?.value?.trim() || '';
  summary.textContent = value || 'No special requests';
}

function bbRenderBookingDraftSummary(form = null) {
  const bookingForm = form || document.querySelector('form[data-booking-form]');
  if (!bookingForm) return;

  const packagePlan = typeof bbGetPackagePlan === 'function' ? bbGetPackagePlan() : {};
  if (bbHasPackageBookingMode(packagePlan)) {
    void bbRenderPackageBookingDraftSummary(bookingForm, packagePlan);
    return;
  }

  const confirmationRoot = bookingForm.closest('[data-booking-confirmation-page]');
  confirmationRoot?.classList.remove('is-package-mode');
  confirmationRoot?.classList.add('is-custom-mode');
  confirmationRoot?.querySelector('[data-booking-custom-hero]')?.remove();
  confirmationRoot?.querySelector('[data-booking-package-event-card]')?.classList.add('d-none');
  const customEventSection = confirmationRoot?.querySelector('[data-booking-event-details-section]');
  const customEventInfo = customEventSection?.querySelector('[data-booking-custom-event-info]');
  const customEventHeader = customEventSection?.querySelector('[data-booking-custom-event-header]');
  const customServicesPanel = confirmationRoot?.querySelector('[data-booking-services-display]')?.closest('.booking-section-card');
  const customLeftColumn = customServicesPanel?.parentElement;
  if (customEventSection && customEventInfo && customEventHeader && customLeftColumn
    && !confirmationRoot.querySelector('[data-booking-custom-event-card]')) {
    customEventInfo.querySelector('.booking-info-item--requests')?.remove();
    const customEventCard = document.createElement('section');
    customEventCard.className = 'panel booking-section-card mb-4 booking-custom-event-card';
    customEventCard.dataset.bookingCustomEventCard = 'true';
    customEventCard.append(customEventHeader, customEventInfo);
    customLeftColumn.insertBefore(customEventCard, customServicesPanel);
  }
  const summaryBody = bookingForm.closest('[data-booking-confirmation-page]')?.querySelector('.booking-summary-panel .panel__body');

  const venue = typeof bbGetVenue === 'function' ? bbGetVenue() || {} : {};
  const eventContext = typeof bbGetEventContext === 'function' ? bbGetEventContext() : {};
  const selectedServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
  const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};
  const catering = typeof bbGetCatering === 'function' ? bbGetCatering() || serviceData.catering || null : serviceData.catering || null;

  const eventType = bookingForm.querySelector('[name="eventType"]')?.value?.trim() || eventContext?.eventType || 'Not specified';
  const guests = Number(bookingForm.querySelector('[name="guests"]')?.value || eventContext?.guests || 0);
  const eventDate = bookingForm.querySelector('[name="eventDate"]')?.value || eventContext?.eventDate || '';
  const startTime = bookingForm.querySelector('[name="startTime"]')?.value || eventContext?.eventTime || '';
  const endTime = bookingForm.querySelector('[name="endTime"]')?.value || eventContext?.endTime || '';
  const specialRequests = bookingForm.querySelector('[name="specialRequests"]')?.value?.trim() || eventContext?.specialRequirements || '';

  const serviceItems = selectedServices.filter((item) => item?.id && item.id !== 'catering');
  const serviceTotal = serviceItems.reduce((sum, item) => sum + Number(item?.estimatedTotal || 0), 0);
  const venueTotal = Number(venue.rate || venue.price || 0);
  const cateringItem = selectedServices.find((item) => item?.id === 'catering');
  const cateringTotal = Number(catering?.estimatedTotal ?? cateringItem?.estimatedTotal ?? 0);
  const estimatedTotal = venueTotal + serviceTotal + cateringTotal;
  const displayServiceItems = selectedServices.filter((item) => item?.id).slice();
  if (catering && !displayServiceItems.some((item) => item.id === 'catering')) {
    displayServiceItems.unshift({ id: 'catering', title: 'Catering', estimatedTotal: cateringTotal });
  }

  const summarize = (value) => {
    if (!value) return 'Customization saved';
    if (Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (item === null || item === undefined || item === '') return '';
          if (typeof item === 'string' || typeof item === 'number') return String(item);
          if (typeof item === 'object') {
            return item.name || item.label || item.title || item.value || '';
          }
          return '';
        })
        .filter(Boolean);
      return items.length ? items.join(' · ') : 'Customization saved';
    }
    if (typeof value === 'object') {
      if (value.name || value.label || value.title) {
        return value.name || value.label || value.title;
      }
      if (value.selectedCake?.name) return value.selectedCake.name;
      if (value.package?.label) return value.package.label;
      if (value.package?.name) return value.package.name;
      if (value.selected?.name) return value.selected.name;
      if (value.selected?.label) return value.selected.label;
      const parts = Object.entries(value)
        .map(([key, item]) => {
          if (item === null || item === undefined || item === '') return '';
          if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return `${bbPrettyKey(key)}: ${item}`;
          }
          if (Array.isArray(item) && item.length) {
            const labels = item.map((entry) => entry?.name || entry?.label || entry?.title || String(entry)).filter(Boolean);
            return labels.length ? `${bbPrettyKey(key)}: ${labels.join(', ')}` : '';
          }
          if (typeof item === 'object') {
            return item.name || item.label || item.title || '';
          }
          return '';
        })
        .filter(Boolean)
        .slice(0, 3);
      return parts.length ? parts.join(' · ') : 'Customization saved';
    }
    return String(value);
  };

  const optionLabels = (value, key = '') => {
    if (value === null || value === undefined || value === '' || key === 'estimatedTotal' || key === 'backendServiceId') return [];
    if (Array.isArray(value)) return value.flatMap((item) => optionLabels(item, key));
    if (typeof value === 'object') {
      if (value.name || value.label || value.title || value.value) {
        return [String(value.name || value.label || value.title || value.value)];
      }
      return Object.entries(value).flatMap(([childKey, childValue]) => optionLabels(childValue, childKey));
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return [key ? `${bbPrettyKey(key)}: ${value}` : String(value)];
    }
    return [];
  };

  const customOptionLabels = (detail) => {
    const sources = [detail?.options, detail?.selections, detail?.summary, detail?.customization];
    const labels = [];
    sources.forEach((source) => {
      optionLabels(source).forEach((label) => {
        if (!labels.includes(label) && !/^(serviceId|title|backendServiceId|estimatedTotal):/i.test(label)) labels.push(label);
      });
    });
    return labels.slice(0, 12);
  };

  const serviceSummaryHtml = displayServiceItems.length
    ? displayServiceItems.map((item, index) => {
        const detail = item.id === 'catering' ? (catering || {}) : (serviceData[item.id] || {});
        const actualTotal = item.id === 'catering' ? cateringTotal : Number(item.estimatedTotal || detail.estimatedTotal || 0);
        const concise = summarize(detail.summary || detail.selections || detail.customization || detail.options || detail);
        const options = customOptionLabels(detail);
        const optionsHtml = options.length
          ? `<ul class="booking-custom-service-row__options">${options.map((option) => `<li>${bbEscapeHtml(option)}</li>`).join('')}</ul>`
          : `<p class="booking-custom-service-row__empty">${bbEscapeHtml(concise || 'Customization saved')}</p>`;
        return `
          <li class="booking-custom-service-row">
            <details${index === 0 ? ' open' : ''}>
              <summary>
                <span class="booking-custom-service-row__name">${bbEscapeHtml(item.title || item.id)}</span>
                <span class="booking-custom-service-row__price">${bbFormatMmkDisplay(actualTotal)}</span>
                <i class="bi bi-chevron-down booking-custom-service-row__chevron" aria-hidden="true"></i>
              </summary>
              <div class="booking-custom-service-row__panel">${optionsHtml}</div>
            </details>
          </li>
        `;
      }).join('')
    : '<li class="text-ink-soft">No services selected yet.</li>';

  const cateringStyle = typeof catering?.style === 'object'
    ? catering.style?.name
    : catering?.style;
  const cateringSummaryHtml = catering
    ? [
        `<li class="d-flex justify-content-between gap-3"><span>Catering style</span><strong>${bbEscapeHtml(cateringStyle || 'Not set')}</strong></li>`,
        `<li class="d-flex justify-content-between gap-3"><span>Guests</span><strong>${bbEscapeHtml(Number(catering.guestCount || guests).toLocaleString())}</strong></li>`,
        `<li class="d-flex justify-content-between gap-3"><span>Selected foods</span><strong>${bbEscapeHtml((catering.foods || []).length ? catering.foods.map((food) => food.name || food).join(', ') : 'None selected')}</strong></li>`,
        `<li class="d-flex justify-content-between gap-3"><span>Add-ons</span><strong>${bbEscapeHtml((catering.addons || []).length ? catering.addons.map((addon) => addon.name || addon).join(', ') : 'None selected')}</strong></li>`,
        `<li class="d-flex justify-content-between gap-3"><span>Dietary requirements</span><strong>${bbEscapeHtml((catering.dietary || []).length ? catering.dietary.join(', ') : 'None selected')}</strong></li>`,
        `<li class="d-flex justify-content-between gap-3"><span>Estimated total</span><strong class="text-gold">${bbFormatMmkDisplay(cateringTotal)}</strong></li>`
      ].join('')
    : '<li class="text-ink-soft">No catering saved yet.</li>';

  if (confirmationRoot) {
    const mapText = (selector, value) => {
      const el = confirmationRoot.querySelector(selector);
      if (el) el.textContent = value;
    };

    mapText('[data-booking-event-type-display]', eventType || 'Not specified');
    mapText('[data-booking-venue-display]', venue?.name || 'Not specified');
    mapText('[data-booking-venue-location-display]', venue?.location || 'Not specified');
    mapText('[data-booking-event-date-display]', eventDate ? bbFormatDateDisplay(eventDate) : 'Not specified');
    mapText('[data-booking-start-time-display]', startTime ? bbFormatTimeDisplay(startTime) : 'Not specified');
    mapText('[data-booking-end-time-display]', endTime ? bbFormatTimeDisplay(endTime) : 'Not specified');
    mapText('[data-booking-guests-display]', guests ? Number(guests || 0).toLocaleString() : 'Not specified');
    mapText('[data-booking-special-requests-display]', specialRequests || 'No special requests');
    mapText('[data-booking-total-display]', bbFormatMmkDisplay(estimatedTotal));
    mapText('[data-booking-total-display-side]', bbFormatMmkDisplay(estimatedTotal));
    mapText('[data-booking-total-venue]', bbFormatMmkDisplay(venueTotal));
    mapText('[data-booking-total-services]', bbFormatMmkDisplay(serviceTotal));
    mapText('[data-booking-total-catering]', bbFormatMmkDisplay(cateringTotal));

    const servicesEl = confirmationRoot.querySelector('[data-booking-services-display]');
    if (servicesEl) servicesEl.innerHTML = serviceSummaryHtml;
    const cateringEl = confirmationRoot.querySelector('[data-booking-catering-display]');
    if (cateringEl) cateringEl.innerHTML = cateringSummaryHtml;
    cateringEl?.closest('[data-booking-custom-catering]')?.classList.add('d-none');
  }

  if (!summaryBody) return;

  const lines = [
    `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Venue</span>
        <strong>${bbEscapeHtml(venue?.name || 'Selected venue')}</strong>
      </div>
    `,
    `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Event</span>
        <strong>${bbEscapeHtml(eventType)} · ${bbEscapeHtml(Number(guests || 0).toLocaleString())} guests</strong>
      </div>
    `,
    eventDate ? `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Date</span>
        <strong>${bbEscapeHtml(bbFormatDateDisplay(eventDate))}</strong>
      </div>
    ` : '',
    `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Time</span>
        <strong>${startTime ? bbEscapeHtml(bbFormatTimeDisplay(startTime)) : 'Not specified'}${endTime ? ` – ${bbEscapeHtml(bbFormatTimeDisplay(endTime))}` : ''}</strong>
      </div>
    `,
    `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Venue Price</span>
        <strong>${venueTotal ? bbFormatMmkDisplay(venueTotal) : 'MMK 0'}</strong>
      </div>
    `,
    `
      <div class="d-flex justify-content-between mb-2">
        <span class="booking-custom-summary-label">Services Total</span>
        <strong>${displayServiceItems.length ? bbFormatMmkDisplay(serviceTotal + cateringTotal) : 'None selected'}</strong>
      </div>
    `,
    `
      <div class="booking-custom-summary-special-requests mb-2">
        <div class="booking-custom-summary-label">Special Requests</div>
        <div class="booking-custom-summary-special-requests__value">${bbEscapeHtml(specialRequests || 'No special requests')}</div>
      </div>
    `
  ].filter(Boolean).join('');

  summaryBody.innerHTML = `
    ${lines}
    <hr>
    <div class="d-flex justify-content-between align-items-center">
      <span class="booking-custom-summary-label">TOTAL</span>
      <span class="bb-price">${bbFormatMmkDisplay(estimatedTotal)}</span>
    </div>
    <button class="btn btn-gold w-100 booking-summary-confirm mt-3" type="submit" data-booking-submit form="${form.id || ''}">Confirm Booking</button>
  `;
}

async function bbRenderCustomerBookingHistory() {
  const root = document.querySelector('[data-booking-history-page]');
  if (!root) return;
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const bodyEl = root.querySelector('[data-booking-history-body]');
  const noteEl = root.querySelector('[data-booking-history-note]');
  const statusFilter = root.querySelector('[data-booking-history-filter]');
  const typeFilter = root.querySelector('[data-booking-history-type-filter]');
  const searchInput = root.querySelector('[data-booking-history-search]');

  const rows = [];
  let bookings = [];

  const syncRows = () => {
    const query = searchInput?.value?.trim().toLowerCase() || '';
      const status = statusFilter?.value || 'all';
    const type = typeFilter?.value || 'all';
    rows.forEach((row) => {
      const matchesQuery = !query || row.dataset.searchableText.includes(query);
      const matchesStatus = status === 'all' || row.dataset.status === status;
      const matchesType = type === 'all' || row.dataset.type === type;
      row.style.display = matchesQuery && matchesStatus && matchesType ? '' : 'none';
    });
    if (noteEl) {
      const visible = rows.filter((row) => row.style.display !== 'none').length;
      noteEl.textContent = bookings.length
        ? `${visible} booking${visible === 1 ? '' : 's'} shown from ${bookings.length} persisted booking${bookings.length === 1 ? '' : 's'}.`
        : 'No persisted bookings found yet.';
    }
  };

  const renderEmpty = (message) => {
    if (!bodyEl) return;
    bodyEl.innerHTML = `<tr><td colspan="9" class="text-center text-ink-soft py-4">${bbEscapeHtml(message)}</td></tr>`;
    if (noteEl) noteEl.textContent = message;
  };

  if (!bodyEl) return;
  renderEmpty('Loading bookings...');

  try {
    const data = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/bookings'), {
      method: 'GET'
    });

    bookings = Array.isArray(data) ? data : [];
    if (!bookings.length) {
      const user = bbGetAuthUser();
      const label = user?.fullName || user?.email || 'your account';
      renderEmpty(`No bookings found for ${label} yet.`);
      return;
    }

    bodyEl.innerHTML = bookings.map((booking) => {
      const ref = booking.ref || `BK-${String(booking.id || '').padStart(4, '0')}`;
      const eventLabel = String(booking.bookingType || '').toUpperCase() === 'PACKAGE'
        ? (booking.packageName || 'Package booking')
        : (booking.eventType ? booking.eventType : 'Event');
      const venueLabel = booking.venueName || 'Venue not set';
      const statusLabel = bbBookingStatusLabel(booking.status);
      const statusClass = bbBookingStatusClass(booking.status);
      const dateLabel = bbFormatDateDisplay(booking.eventDate);
      const totalLabel = bbFormatMmkDisplay(booking.estimatedTotal || 0);
      const type = String(booking.bookingType || 'CUSTOM').toUpperCase();
      const paymentLabel = booking.paymentStatus ? bbPrettyKey(booking.paymentStatus) : 'Not recorded';
      const searchText = [
        ref,
        eventLabel,
        venueLabel,
        statusLabel,
        dateLabel,
        booking.startTime || '',
        booking.endTime || ''
      ].join(' ').toLowerCase();

      return `
        <tr class="align-middle" data-searchable data-type="${bbEscapeHtml(type)}" data-status="${bbEscapeHtml(String(booking.status || '').toLowerCase())}" data-searchable-text="${bbEscapeHtml(searchText)}">
          <td class="fw-semibold">${bbEscapeHtml(ref)}<div class="small text-ink-soft">${type === 'PACKAGE' ? 'Package' : 'Customize'} · Created ${bbEscapeHtml(bbFormatDateDisplay(booking.createdAt))}</div></td>
          <td>${bbEscapeHtml(eventLabel)}</td>
          <td>${bbEscapeHtml(venueLabel)}</td>
          <td>${bbEscapeHtml(dateLabel)}</td>
          <td>${bbEscapeHtml(booking.guestCount ?? '')}</td>
          <td class="fw-semibold">${bbEscapeHtml(totalLabel)}</td>
          <td><span class="status ${bbEscapeHtml(bbBookingStatusClass(booking.paymentStatus))}">${bbEscapeHtml(paymentLabel)}</span><div class="small text-ink-soft">Paid ${bbEscapeHtml(bbFormatMmkDisplay(booking.paidAmount || 0))}</div></td>
          <td><span class="status ${bbEscapeHtml(statusClass)}">${bbEscapeHtml(statusLabel)}</span></td>
          <td><a class="btn btn-outline-forest btn-sm" href="/prototype/customer/booking-status.html?id=${encodeURIComponent(booking.id)}">Track</a></td>
        </tr>
      `;
    }).join('');

    rows.splice(0, rows.length, ...bodyEl.querySelectorAll('tr[data-searchable]'));
    syncRows();
    searchInput?.addEventListener('input', syncRows);
    statusFilter?.addEventListener('change', syncRows);
    typeFilter?.addEventListener('change', syncRows);
  } catch (error) {
    renderEmpty(error?.status === 401 ? 'Please sign in again to view your bookings.' : 'Unable to load your bookings right now.');
  }
}

async function bbRenderCustomerBookingStatus() {
  const root = document.querySelector('[data-booking-status-page]');
  if (!root) return;
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const params = new URL(window.location.href).searchParams;
  const bookingId = Number(params.get('id') || params.get('bookingId') || 0);
  const titleEl = root.querySelector('[data-booking-title]');
  const subtitleEl = root.querySelector('[data-booking-subtitle]');
  const cancelledNoticeEl = root.querySelector('[data-booking-cancelled-notice]');
  const statusCardEl = root.querySelector('[data-booking-status-card]');
  const refEl = root.querySelector('[data-booking-ref]');
  const statusEl = root.querySelector('[data-booking-status-value]');
  const statusNoteEl = root.querySelector('[data-booking-status-note]');
  const guestEl = root.querySelector('[data-booking-guest-value]');
  const guestNoteEl = root.querySelector('[data-booking-guest-note]');
  const totalEl = root.querySelector('[data-booking-total-value]');
  const totalNoteEl = root.querySelector('[data-booking-total-note]');
  const daysEl = root.querySelector('[data-booking-days-value]');
  const daysNoteEl = root.querySelector('[data-booking-days-note]');
  const overviewEl = root.querySelector('[data-booking-overview]');
  const servicesEl = root.querySelector('[data-booking-services]');
  const priceSummaryEl = root.querySelector('[data-booking-price-summary]');
  const paymentEl = root.querySelector('[data-booking-payment]');
  const consultationsEl = root.querySelector('[data-booking-consultations]');
  const timelineEl = root.querySelector('[data-booking-timeline]');
  const quotationLink = root.querySelector('[data-booking-quotation-link]');
  const payButton = root.querySelector('[data-booking-pay-button]');
  const cancelButton = root.querySelector('[data-booking-cancel-button]');
  const cancelConfirm = root.querySelector('[data-booking-cancel-confirm]') || document.querySelector('[data-booking-cancel-confirm]');
  const cancelError = root.querySelector('[data-booking-cancel-error]') || document.querySelector('[data-booking-cancel-error]');
  const cancelModal = document.getElementById('bookingCancelModal');
  let currentBooking = null;

  const setError = (message, title = 'Booking not found.') => {
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = message;
    [refEl, statusEl, guestEl, totalEl, daysEl].forEach((el) => {
      if (el) el.textContent = '--';
    });
    if (overviewEl) overviewEl.innerHTML = '<p class="text-ink-soft mb-0">No booking details available.</p>';
    if (servicesEl) servicesEl.innerHTML = '<p class="text-ink-soft mb-0">No service selections available.</p>';
    if (priceSummaryEl) priceSummaryEl.innerHTML = '<p class="text-ink-soft mb-0">No price summary available.</p>';
    if (paymentEl) paymentEl.innerHTML = '<p class="text-ink-soft mb-0">No payment information available.</p>';
    if (consultationsEl) consultationsEl.innerHTML = '<p class="text-ink-soft mb-0">No quotation or consultation information available.</p>';
    if (timelineEl) timelineEl.innerHTML = '<li><strong>Booking details unavailable</strong><br><span class="small text-ink-soft">Select a booking from My Bookings.</span></li>';
    if (quotationLink) quotationLink.classList.add('d-none');
    if (cancelButton) cancelButton.classList.add('d-none');
    if (payButton) payButton.classList.add('d-none');
    if (cancelledNoticeEl) cancelledNoticeEl.classList.add('d-none');
  };

  const renderTimeline = (booking) => {
    if (!timelineEl) return;
    const status = String(booking.status || '').toUpperCase();
    const stage = { PENDING: 0, AWAITING_DEPOSIT: 1, CONFIRMED: 2, COMPLETED: 3 }[status];
    if (status === 'CANCELLED') {
      timelineEl.innerHTML = '<li class="done cancelled"><strong>Booking cancelled</strong><br><span class="small text-ink-soft">This booking has been cancelled.</span></li>';
      return;
    }
    const stageItems = [
      { label: 'Request submitted', detail: 'Your booking request was received.', done: stage >= 0 },
      { label: 'Awaiting deposit', detail: 'Your booking is approved and awaiting the required deposit.', done: stage >= 1 },
      { label: 'Confirmed', detail: 'Your booking has been confirmed.', done: stage >= 2 },
      { label: 'Completed', detail: 'Your event booking has been completed.', done: stage >= 3 }
    ];
    timelineEl.innerHTML = stageItems.map((item) => `<li class="${item.done ? 'done' : ''}"><strong>${bbEscapeHtml(item.label)}</strong><br><span class="small text-ink-soft">${bbEscapeHtml(item.detail)}</span></li>`).join('');
  };

  const canCancelBooking = (booking) => {
    const status = String(booking?.status || '').toUpperCase();
    if (!['PENDING', 'AWAITING_DEPOSIT', 'CONFIRMED'].includes(status)) return false;
    return true;
  };

  cancelButton?.addEventListener('click', () => {
    if (cancelError) {
      cancelError.textContent = '';
      cancelError.classList.add('d-none');
    }
    if (cancelModal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(cancelModal).show();
  });

  cancelConfirm?.addEventListener('click', async () => {
    if (!currentBooking || !canCancelBooking(currentBooking)) return;
    cancelConfirm.disabled = true;
    cancelConfirm.textContent = 'Cancelling...';
    try {
      await bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${currentBooking.id}/cancel`), { method: 'PATCH' });
      if (cancelModal && window.bootstrap) bootstrap.Modal.getOrCreateInstance(cancelModal).hide();
      window.location.reload();
      return;
    } catch (error) {
      const message = error?.message || 'This booking could not be cancelled.';
      if (cancelError) {
        cancelError.textContent = message;
        cancelError.classList.remove('d-none');
      } else if (statusNoteEl) {
        statusNoteEl.textContent = message;
      }
    } finally {
      cancelConfirm.disabled = false;
      cancelConfirm.textContent = 'Cancel Booking';
    }
  });

  const renderOverview = (booking) => {
    if (!overviewEl) return;
    const isPackageBooking = String(booking.bookingType || '').toUpperCase() === 'PACKAGE' || booking.packageId != null;
    const venue = booking.venue || {};
    const venuePrice = String(booking.bookingType || '').toUpperCase() === 'PACKAGE' ? Number(venue.price) : NaN;
    const venuePriceLabel = Number.isFinite(venuePrice) && venuePrice > 0
      ? bbFormatMmkDisplay(venuePrice)
      : 'Price on request';
    const detailCard = (icon, label, value, secondary = '') => `
      <article class="booking-detail-card">
        <div class="booking-detail-card__icon" aria-hidden="true"><i class="bi ${icon}"></i></div>
        <div class="stat-label">${label}</div>
        <div class="booking-detail-card__value">${value}</div>
        ${secondary ? `<div class="booking-detail-card__secondary">${secondary}</div>` : ''}
      </article>`;
    overviewEl.innerHTML = `<div class="booking-details-grid">
      ${detailCard('bi-calendar-event', 'Event', bbEscapeHtml(booking.event?.eventType || 'Event'), `${bbEscapeHtml(booking.event?.guestCount ?? '')} guests`)}
      ${detailCard('bi-building', 'Venue', bbEscapeHtml(venue.name || 'Venue not set'), bbEscapeHtml(venue.location || 'Location unavailable'))}
      ${detailCard('bi-gem', 'Venue hire estimate', bbEscapeHtml(isPackageBooking ? 'Included in package' : venuePriceLabel), bbEscapeHtml(isPackageBooking ? 'Included in the persisted package price.' : 'One venue charge; not multiplied by guests.'))}
      ${detailCard('bi-calendar3', 'Event date', bbEscapeHtml(bbFormatDateDisplay(booking.eventDate)))}
      ${detailCard('bi-clock', 'Start time', bbEscapeHtml(bbFormatTimeDisplay(booking.startTime)))}
      ${detailCard('bi-clock-history', 'End time', bbEscapeHtml(bbFormatTimeDisplay(booking.endTime)))}
    </div>`;
  };

  const renderServices = (booking) => {
    if (!servicesEl) return;
    const services = Array.isArray(booking.services) ? booking.services : [];
    if (!services.length) {
      const inclusions = Array.isArray(booking.packageInclusions) ? booking.packageInclusions : [];
      servicesEl.innerHTML = inclusions.length
        ? `<div class="small text-ink-soft mb-2">Included in ${bbEscapeHtml(booking.packageName || 'this package')}</div><ul class="mb-0">${inclusions.map((item) => `<li>${bbEscapeHtml(item.serviceName || 'Included service')}</li>`).join('')}</ul>`
        : '<p class="text-ink-soft mb-0">No persisted service selections were found for this booking.</p>';
      return;
    }
    servicesEl.innerHTML = services.map((service) => bbRenderBookingServiceCard(service)).join('');
  };

  const renderPriceSummary = (booking) => {
    if (!priceSummaryEl) return;
    const isPackageBooking = String(booking.bookingType || '').toUpperCase() === 'PACKAGE' || booking.packageId != null;
    const serviceSubtotal = Number(booking.estimatedTotal || 0);
    const venuePrice = isPackageBooking ? Number(booking.venue?.price) : NaN;
    const hasVenuePrice = Number.isFinite(venuePrice) && venuePrice > 0;
    const knownEstimatedTotal = serviceSubtotal + (hasVenuePrice ? venuePrice : 0);
    if (isPackageBooking) {
      const packageTotal = Number(booking.packagePriceSnapshot ?? booking.estimatedTotal ?? 0);
      priceSummaryEl.innerHTML = `
        <div class="d-grid gap-3">
          <div class="d-flex justify-content-between gap-3">
            <span>Package</span>
            <strong>${bbEscapeHtml(booking.packageName || 'Selected package')}</strong>
          </div>
          <hr class="my-1">
          <div class="d-flex justify-content-between gap-3 fs-5">
            <span>Package total</span>
            <strong class="text-gold">${bbEscapeHtml(bbFormatMmkDisplay(packageTotal))}</strong>
          </div>
          <p class="small text-ink-soft mb-0">Venue and included services are covered by the package price.</p>
        </div>
      `;
      return;
    }
    priceSummaryEl.innerHTML = `
      <div class="d-grid gap-3">
        <div class="d-flex justify-content-between gap-3">
          <span>Estimated venue hire</span>
          <strong>${bbEscapeHtml(hasVenuePrice ? bbFormatMmkDisplay(venuePrice) : 'Price on request')}</strong>
        </div>
        <div class="d-flex justify-content-between gap-3">
          <span>Service subtotal</span>
          <strong>${bbEscapeHtml(bbFormatMmkDisplay(serviceSubtotal))}</strong>
        </div>
        <hr class="my-1">
        <div class="d-flex justify-content-between gap-3 fs-5">
          <span>${hasVenuePrice ? 'Estimated event total' : 'Known estimated subtotal'}</span>
          <strong class="text-gold">${bbEscapeHtml(bbFormatMmkDisplay(knownEstimatedTotal))}</strong>
        </div>
        ${hasVenuePrice ? '' : '<p class="small text-ink-soft mb-0">Venue hire is not included because pricing is currently on request.</p>'}
      </div>
    `;
  };

  const renderPayment = (booking) => {
    if (!paymentEl) return;
    const payment = booking.payment;
    if (!payment) { paymentEl.innerHTML = '<p class="text-ink-soft mb-0">No payment records are associated with this booking.</p>'; return; }
    paymentEl.innerHTML = `<div class="row g-3"><div class="col-6"><div class="stat-label">Status</div><strong>${bbEscapeHtml(payment.status ? bbPrettyKey(payment.status) : 'Not recorded')}</strong></div><div class="col-6"><div class="stat-label">Total Paid</div><strong>${bbEscapeHtml(bbFormatMmkDisplay(payment.paidAmount))}</strong></div><div class="col-6"><div class="stat-label">Booking Total</div><strong>${bbEscapeHtml(bbFormatMmkDisplay(payment.totalAmount))}</strong></div><div class="col-6"><div class="stat-label">Remaining Balance</div><strong>${bbEscapeHtml(bbFormatMmkDisplay(payment.remainingAmount))}</strong></div></div>${String(booking.status || '').toUpperCase() === 'AWAITING_DEPOSIT' ? '<p class="small text-ink-soft mt-3 mb-0">Your booking is approved and awaiting the required deposit. Use the existing payment page when payment is enabled for this booking.</p>' : ''}`;
  };

  const renderConsultations = (booking) => {
    if (!consultationsEl) return;
    const quotation = booking.quotation ? `<div class="border rounded-4 p-3 mb-3"><div class="stat-label">Quotation</div><strong>${bbEscapeHtml(booking.quotation.status ? bbPrettyKey(booking.quotation.status) : 'Not recorded')}</strong><div class="small text-ink-soft">${bbEscapeHtml(bbFormatMmkDisplay(booking.quotation.total))} · Expires ${bbEscapeHtml(bbFormatDateDisplay(booking.quotation.expiresAt))}</div></div>` : '';
    const consultations = Array.isArray(booking.consultations) ? booking.consultations : [];
    const consultationHtml = consultations.length ? `<ul class="list-unstyled mb-0 d-grid gap-2">${consultations.map((item) => `<li class="border rounded-4 p-3"><strong>${bbEscapeHtml(item.status ? bbPrettyKey(item.status) : 'Consultation')}</strong><div class="small text-ink-soft">${bbEscapeHtml(item.consultationType || 'Consultation')} · ${bbEscapeHtml(bbFormatDateDisplay(item.consultationDate))} · ${bbEscapeHtml(bbFormatTimeDisplay(item.startTime))} - ${bbEscapeHtml(bbFormatTimeDisplay(item.endTime))}</div><div class="small text-ink-soft">Planner: ${bbEscapeHtml(item.planner || 'To be assigned')}</div></li>`).join('')}</ul>` : '<p class="small text-ink-soft mb-0">No consultation appointments recorded.</p>';
    consultationsEl.innerHTML = `${quotation}<div class="stat-label mb-2">Consultations</div>${consultationHtml}`;
  };

  try {
    if (!bookingId || bookingId <= 0) {
      setError('Choose a booking from Booking History to view its details.', 'Choose a booking from Booking History');
      if (quotationLink) {
        quotationLink.textContent = 'View Booking History';
        quotationLink.href = '/prototype/customer/booking-history.html';
        quotationLink.classList.remove('d-none');
      }
      return;
    }

    const booking = await bbFetchCustomerJson(window.bbApiUrl(`/api/customer/bookings/${bookingId}`), {
      method: 'GET'
    });
    if (!booking) return;
    currentBooking = booking;

    const statusLabel = bbBookingStatusLabel(booking.status);
    const statusClass = bbBookingStatusClass(booking.status);
    const bookingStatus = String(booking.status || '').toUpperCase();
    const isCancelled = bookingStatus === 'CANCELLED';
    const isPackageBooking = String(booking.bookingType || '').toUpperCase() === 'PACKAGE' || booking.packageId != null;
    const serviceSubtotal = Number(booking.estimatedTotal || 0);
    const venuePrice = isPackageBooking ? Number(booking.venue?.price) : NaN;
    const hasVenuePrice = Number.isFinite(venuePrice) && venuePrice > 0;
    const estimatedTotal = bbFormatMmkDisplay(isPackageBooking
      ? Number(booking.packagePriceSnapshot ?? booking.estimatedTotal ?? 0)
      : serviceSubtotal + (hasVenuePrice ? venuePrice : 0));
    const venueLabel = booking.venue?.name || 'Venue not set';
    const eventLabel = booking.event?.eventType || 'Booking';
    const eventDateLabel = bbFormatDateDisplay(booking.eventDate);
    const refLabel = booking.ref || `BK-${String(booking.id || '').padStart(4, '0')}`;
    const daysRemaining = booking.eventDate
      ? Math.max(0, Math.ceil((new Date(`${booking.eventDate}T00:00:00`) - new Date()) / 86400000))
      : null;

    if (titleEl) titleEl.textContent = `Booking Status · ${refLabel}`;
    if (subtitleEl) subtitleEl.textContent = `${eventLabel} at ${venueLabel}, ${eventDateLabel}.`;
    if (refEl) refEl.textContent = refLabel;
    if (statusEl) statusEl.textContent = statusLabel;
    if (cancelledNoticeEl) cancelledNoticeEl.classList.toggle('d-none', !isCancelled);
    if (statusCardEl) statusCardEl.classList.toggle('is-cancelled', isCancelled);
    if (statusNoteEl) statusNoteEl.textContent = isCancelled
      ? 'This booking is no longer active.'
      : (booking.confirmedAt
          ? `Confirmed ${bbFormatDateDisplay(booking.confirmedAt)}`
          : (!isPackageBooking && bookingStatus === 'PENDING'
              ? 'Pending quotation preparation'
              : 'Still in progress'));
    if (guestEl) guestEl.textContent = booking.event?.guestCount ?? booking.guestCount ?? '--';
    if (guestNoteEl) guestNoteEl.textContent = booking.event?.guestCount ? 'Confirmed guest count' : 'Guest count not yet set';
    if (totalEl) totalEl.textContent = estimatedTotal;
    if (totalNoteEl) totalNoteEl.textContent = isPackageBooking
      ? (booking.quotationId ? `Package quotation #${booking.quotationId}` : 'Persisted package price')
      : (booking.quotationId ? `Quotation #${booking.quotationId}` : (hasVenuePrice ? 'Venue hire plus persisted service subtotal' : 'Venue hire on request; service subtotal shown'));
    if (daysEl) daysEl.textContent = daysRemaining === null ? '--' : String(daysRemaining);
    if (daysNoteEl) daysNoteEl.textContent = daysRemaining === null ? 'No event date' : (daysRemaining === 0 ? 'Event day' : 'Days until event');
    if (quotationLink) {
      if (booking.quotationId) {
        quotationLink.href = `/prototype/customer/quotation.html?id=${encodeURIComponent(booking.quotationId)}`;
        quotationLink.classList.remove('d-none');
      } else {
        quotationLink.classList.add('d-none');
      }
    }
    if (payButton) payButton.classList.add('d-none');
    if (cancelButton) cancelButton.classList.toggle('d-none', !canCancelBooking(booking));

    renderOverview(booking);
    renderServices(booking);
    renderPriceSummary(booking);
    renderPayment(booking);
    renderConsultations(booking);
    renderTimeline(booking);
  } catch (error) {
    const status = error?.status;
    setError(status === 404 || status === 403 ? 'Booking not found.' : 'Unable to load booking details right now.');
  }
}

function bbRequireAuth() {
  if (bbGetAuth()) return false;

  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  bbSetAuthReturnUrl(target);
  window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
  return true;
}

function bbGetPasswordRuleState(password) {
  const value = String(password || '');
  return {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[!@#$%^&*]/.test(value)
  };
}

function bbGetPasswordStrength(password) {
  const state = bbGetPasswordRuleState(password);
  const matched = Object.values(state).filter(Boolean).length;
  if (matched === 5) return 'Strong';
  if (matched >= 3) return 'Medium';
  return 'Weak';
}

function bbUpdatePasswordStrengthUI(password, rulesEl, strengthEl, meterFillEl, successEl) {
  if (!rulesEl && !strengthEl && !meterFillEl && !successEl) return;

  const state = bbGetPasswordRuleState(password);
  const config = {
    length: 'At least 8 characters',
    upper: 'One uppercase letter',
    lower: 'One lowercase letter',
    number: 'One number',
    special: 'One special character'
  };

  Object.entries(config).forEach(([key, label]) => {
    const item = rulesEl?.querySelector(`[data-rule="${key}"]`);
    if (!item) return;
    const passed = Boolean(state[key]);
    item.classList.toggle('text-success', passed);
    item.classList.toggle('text-danger', !passed && String(password || '').length > 0);
    item.classList.toggle('text-ink-soft', !passed && String(password || '').length === 0);
    item.textContent = `${passed ? '\u2713' : '\u25CB'} ${label}`;
  });

  const matched = Object.values(state).filter(Boolean).length;
  const strength = matched === 5 ? 'Strong' : matched >= 4 ? 'Good' : matched >= 2 ? 'Fair' : 'Weak';
  const strengthKey = strength.toLowerCase();
  const percentage = matched * 20;
  if (strengthEl) strengthEl.textContent = strength;
  const strengthRoot = strengthEl?.closest('[data-password-help]');
  strengthRoot?.setAttribute('data-strength', strengthKey);
  if (meterFillEl) meterFillEl.style.width = `${percentage}%`;
  const meter = meterFillEl?.closest('[role="progressbar"]');
  meter?.setAttribute('aria-valuenow', String(percentage));
  successEl?.classList.toggle('d-none', matched !== 5);
}

function bbInitForgotPasswordPage() {
  const root = document.querySelector('[data-forgot-password-page]');
  if (!root) return;

  const requestStage = root.querySelector('[data-reset-stage="request"]');
  const verifyStage = root.querySelector('[data-reset-stage="verify"]');
  const createStage = root.querySelector('[data-reset-stage="create"]');
  const successStage = root.querySelector('[data-reset-stage="success"]');
  const statusEl = root.querySelector('[data-reset-status]');
  const emailInput = root.querySelector('[name="email"]');
  const requestForm = root.querySelector('[data-reset-request-form]');
  const verifyForm = root.querySelector('[data-reset-verify-form]');
  const createForm = root.querySelector('[data-reset-create-form]');
  const successLink = root.querySelector('[data-reset-signin-link]');
  const stepPills = [...root.querySelectorAll('[data-reset-step-pill]')];
  const emailSummaryEls = [...root.querySelectorAll('[data-reset-email-summary]')];
  const otpInputs = [...root.querySelectorAll('[data-otp-input]')];
  const resendButton = root.querySelector('[data-reset-resend]');
  const resendCountdown = root.querySelector('[data-reset-countdown]');
  const verifyButton = root.querySelector('[data-reset-verify-submit]');
  const createButton = root.querySelector('[data-reset-create-submit]');
  const editEmailButton = root.querySelector('[data-reset-edit-email]');
  const newPasswordInput = root.querySelector('[name="newPassword"]');
  const confirmPasswordInput = root.querySelector('[name="confirmPassword"]');
  const passwordRulesEl = root.querySelector('[data-password-rules]');
  const passwordStrengthEl = root.querySelector('[data-password-strength]');
  const passwordMeterFillEl = root.querySelector('[data-password-meter-fill]');
  const passwordSuccessEl = root.querySelector('[data-password-success]');
  const cooldownSeconds = 60;
  const stageOrder = ['request', 'verify', 'create', 'success'];
  let cooldownTimer = null;
  let resetFlow = bbReadPasswordResetFlow() || {};
  let currentStage = 'request';

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizeToken = (value) => String(value || '').trim();

  const setStatus = (message, variant = 'danger') => {
    if (!statusEl) return;
    statusEl.className = `col-12 alert alert-${variant}`;
    statusEl.textContent = message;
    statusEl.classList.remove('d-none');
  };

  const clearStatus = () => {
    if (!statusEl) return;
    statusEl.className = 'col-12 alert d-none';
    statusEl.textContent = '';
  };

  const setButtonBusy = (button, busy, busyText) => {
    if (!button) return;
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent || '';
    }
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.originalLabel;
  };

  const syncSummary = () => {
    const email = normalizeEmail(resetFlow.email || emailInput?.value || '');
    emailSummaryEls.forEach((element) => {
      element.textContent = email || 'your email address';
    });
    if (emailInput && currentStage !== 'request' && email) {
      emailInput.value = email;
    }
  };

  const syncPills = () => {
    stepPills.forEach((pill) => {
      const stage = pill.dataset.resetStepPill;
      pill.classList.toggle('is-active', stage === currentStage);
      pill.classList.toggle('is-complete', stageOrder.indexOf(stage) < stageOrder.indexOf(currentStage));
    });
  };

  const showStage = (stage) => {
    currentStage = stage;
    if (requestStage) requestStage.hidden = stage !== 'request';
    if (verifyStage) verifyStage.hidden = stage !== 'verify';
    if (createStage) createStage.hidden = stage !== 'create';
    if (successStage) successStage.hidden = stage !== 'success';
    syncSummary();
    syncPills();
  };

  const clearOtp = () => {
    otpInputs.forEach((input) => {
      input.value = '';
    });
  };

  const readOtp = () => otpInputs.map((input) => input.value.replace(/\D/g, '')).join('');

  const fillOtp = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, otpInputs.length).split('');
    otpInputs.forEach((input, index) => {
      input.value = digits[index] || '';
    });
    const nextIndex = Math.min(digits.length, otpInputs.length - 1);
    otpInputs[nextIndex]?.focus();
  };

  const stopCooldown = () => {
    if (cooldownTimer) {
      window.clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  };

  const renderCooldown = () => {
    if (!resendButton || !resendCountdown) return;
    const until = bbGetPasswordResetCooldownUntil();
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    if (remaining > 0) {
      resendButton.disabled = true;
      resendCountdown.textContent = `You can resend in ${remaining}s.`;
      return;
    }
    resendButton.disabled = false;
    resendCountdown.textContent = 'You can request a new code now.';
    stopCooldown();
  };

  const startCooldown = () => {
    bbSetPasswordResetCooldownUntil(Date.now() + cooldownSeconds * 1000);
    renderCooldown();
    stopCooldown();
    cooldownTimer = window.setInterval(renderCooldown, 1000);
  };

  const requestOtp = async (email) => {
    const response = await fetch(window.bbApiUrl('/api/auth/forgot-password/request-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to send verification code right now.');
    }
    return data;
  };

  const verifyOtp = async (email, otp) => {
    const response = await fetch(window.bbApiUrl('/api/auth/forgot-password/verify-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to verify your code right now.');
    }
    return data;
  };

  const resetPassword = async (payload) => {
    const response = await fetch(window.bbApiUrl('/api/auth/forgot-password/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || 'Unable to reset your password right now.');
    }
    return data;
  };

  const initOtpInputs = () => {
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '');
        input.value = digits.slice(-1);
        if (input.value && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].value = '';
          otpInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (event) => {
        event.preventDefault();
        fillOtp(event.clipboardData?.getData('text') || '');
      });
    });
  };

  initOtpInputs();

  if (editEmailButton) {
    editEmailButton.addEventListener('click', () => {
      resetFlow = { email: normalizeEmail(emailInput?.value || resetFlow.email || '') };
      bbWritePasswordResetFlow(resetFlow);
      clearOtp();
      showStage('request');
      setStatus('Update your email and request a new code.');
    });
  }

  if (resetFlow.email) {
    resetFlow.email = normalizeEmail(resetFlow.email);
    bbWritePasswordResetFlow(resetFlow);
    if (emailInput) {
      emailInput.value = resetFlow.email;
    }
  }

  if (resetFlow.resetToken) {
    const expiresAt = resetFlow.resetTokenExpiresAt ? Date.parse(resetFlow.resetTokenExpiresAt) : 0;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      resetFlow = { email: resetFlow.email || '' };
      bbWritePasswordResetFlow(resetFlow);
    }
  }

  if (resetFlow.resetToken) {
    showStage('create');
  } else if (resetFlow.email) {
    showStage('verify');
  } else {
    showStage('request');
  }

  syncSummary();
  syncPills();
  renderCooldown();
  if (bbGetPasswordResetCooldownUntil() > Date.now()) {
    startCooldown();
  }

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const email = normalizeEmail(emailInput?.value || '');
    if (!email) {
      setStatus('Please enter your registered email address.');
      emailInput?.focus();
      return;
    }

    const submitButton = requestForm.querySelector('button[type="submit"]');
    setButtonBusy(submitButton, true, 'Sending...');
    try {
      await requestOtp(email);
      resetFlow = { email };
      bbWritePasswordResetFlow(resetFlow);
      clearOtp();
      showStage('verify');
      startCooldown();
      setStatus('If an account exists for that email, password reset instructions will be sent.', 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to send verification code right now.');
    } finally {
      setButtonBusy(submitButton, false, 'Send Verification Code');
    }
  });

  resendButton?.addEventListener('click', async () => {
    clearStatus();
    const email = normalizeEmail(resetFlow.email || emailInput?.value || '');
    if (!email) {
      showStage('request');
      setStatus('Please enter your email address first.');
      return;
    }
    if (bbGetPasswordResetCooldownUntil() > Date.now()) {
      return;
    }

    setButtonBusy(resendButton, true, 'Resending...');
    try {
      await requestOtp(email);
      resetFlow = { email };
      bbWritePasswordResetFlow(resetFlow);
      clearOtp();
      startCooldown();
      setStatus('If an account exists for that email, password reset instructions will be sent.', 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to resend the verification code right now.');
    } finally {
      setButtonBusy(resendButton, false, 'Resend Code');
    }
  });

  verifyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const email = normalizeEmail(resetFlow.email || emailInput?.value || '');
    const otp = readOtp();
    if (!email) {
      showStage('request');
      setStatus('Please enter your email address first.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setStatus('Enter the 6-digit code that was sent to your email.');
      return;
    }

    setButtonBusy(verifyButton, true, 'Verifying...');
    try {
      const data = await verifyOtp(email, otp);
      resetFlow = {
        email,
        resetToken: data.resetToken,
        resetTokenExpiresAt: data.resetTokenExpiresAt
      };
      bbWritePasswordResetFlow(resetFlow);
      showStage('create');
      bbUpdatePasswordStrengthUI('', passwordRulesEl, passwordStrengthEl, passwordMeterFillEl, passwordSuccessEl);
      setStatus('Email verified. Create your new password.', 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to verify the code right now.');
    } finally {
      setButtonBusy(verifyButton, false, 'Verify Code');
    }
  });

  newPasswordInput?.addEventListener('input', () => {
    bbUpdatePasswordStrengthUI(
      newPasswordInput.value,
      passwordRulesEl,
      passwordStrengthEl,
      passwordMeterFillEl,
      passwordSuccessEl
    );
  });

  createForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const email = normalizeEmail(resetFlow.email || emailInput?.value || '');
    const resetToken = normalizeToken(resetFlow.resetToken || '');
    const newPassword = newPasswordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';

    if (!email || !resetToken) {
      showStage('verify');
      setStatus('Please verify your email again before resetting the password.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setStatus('Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    const passwordState = bbGetPasswordRuleState(newPassword);
    if (!Object.values(passwordState).every(Boolean)) {
      setStatus('Please create a stronger password that meets all requirements.');
      newPasswordInput?.focus();
      return;
    }

    setButtonBusy(createButton, true, 'Resetting...');
    try {
      await resetPassword({
        email,
        resetToken,
        newPassword,
        confirmPassword
      });
      bbClearPasswordResetFlow();
      bbSetPasswordResetCooldownUntil(0);
      stopCooldown();
      showStage('success');
      setStatus('Password updated successfully.', 'success');
      successLink?.focus();
    } catch (error) {
      setStatus(error.message || 'Unable to reset your password right now.');
    } finally {
      setButtonBusy(createButton, false, 'Reset Password');
    }
  });

  if (passwordRulesEl || passwordStrengthEl || passwordMeterFillEl || passwordSuccessEl) {
    bbUpdatePasswordStrengthUI(
      newPasswordInput?.value || '',
      passwordRulesEl,
      passwordStrengthEl,
      passwordMeterFillEl,
      passwordSuccessEl
    );
  }
}

function bbInitPackageWorkflow(config = {}) {
  const root = document.querySelector(config.rootSelector || '[data-package-workflow]');
  if (!root) return;

  const dateInput = root.querySelector('[data-package-date]');
  const startInput = root.querySelector('[data-package-start-time]') || root.querySelector('[data-package-time]');
  const endInput = root.querySelector('[data-package-end-time]');
  const checkBtn = root.querySelector('[data-package-check]');
  const statusEl = root.querySelector('[data-package-status]');
  const selectedDateEl = root.querySelector('[data-package-selected-date]');
  const selectedTimeEl = root.querySelector('[data-package-selected-time]');
  const bookButtons = [...root.querySelectorAll('[data-package-book]')];
  const cardLinks = [...root.querySelectorAll('[data-package-link]')];
  const saved = bbGetPackagePlan();

  const syncStatus = (available) => {
    const dateValue = dateInput?.value || saved.date || '';
    const startValue = startInput?.value || saved.startTime || saved.time || '';
    const endValue = endInput?.value || saved.endTime || '';

    if (selectedDateEl) selectedDateEl.textContent = dateValue || 'Select a date';
    if (selectedTimeEl) selectedTimeEl.textContent = startValue && endValue
      ? `${window.bbEventTime?.format(startValue) || startValue} - ${window.bbEventTime?.format(endValue) || endValue}`
      : 'Select start and end time';
    if (statusEl) {
      statusEl.innerHTML = available
        ? '<span class="bb-badge gold">Availability checked</span>'
        : '<span class="bb-badge">Pick a date and time to unlock packages</span>';
    }

    bookButtons.forEach((button) => {
      button.classList.toggle('disabled', !available);
      button.setAttribute('aria-disabled', available ? 'false' : 'true');
      button.dataset.enabled = available ? 'true' : 'false';
    });

    cardLinks.forEach((link) => {
      link.classList.toggle('disabled', !available);
      link.setAttribute('aria-disabled', available ? 'false' : 'true');
      link.dataset.enabled = available ? 'true' : 'false';
    });
  };

  const savePlan = () => {
    const date = dateInput?.value || '';
    const startTime = startInput?.value || '';
    const endTime = endInput?.value || '';
    const available = Boolean(date && startTime && endTime && startTime < endTime);
    bbSetPackagePlan({ date, time: startTime, eventDate: date, startTime, endTime, available });
    syncStatus(available);
    return available;
  };

  if (saved.date && dateInput) dateInput.value = saved.date;
  if (window.bbEventTime && startInput && endInput) {
    window.bbEventTime.initialize(startInput, endInput, saved.startTime || saved.time, saved.endTime);
  }
  if (saved.startTime && startInput) startInput.value = saved.startTime;
  if (saved.endTime && endInput) {
    window.bbEventTime?.syncEnd(startInput, endInput, 'Select end time');
    endInput.value = saved.endTime;
  }
  syncStatus(Boolean(saved.date && (saved.startTime || saved.time) && saved.endTime && saved.available));

  checkBtn?.addEventListener('click', () => {
    const available = savePlan();
    if (available && statusEl) {
      statusEl.innerHTML = '<span class="bb-badge gold">Date and time saved</span>';
    }
  });

  [dateInput, startInput, endInput].forEach((input) => {
    input?.addEventListener('change', () => {
      bbSetPackagePlan({
        date: dateInput?.value || '',
        time: startInput?.value || '',
        eventDate: dateInput?.value || '',
        startTime: startInput?.value || '',
        endTime: endInput?.value || '',
        available: false
      });
      syncStatus(false);
    });
  });

  const lockAwareClick = (event) => {
    const button = event.target.closest('[data-package-book], [data-package-link]');
    if (!button) return;
    const currentPlan = bbGetPackagePlan();
    if (currentPlan?.date && (currentPlan?.startTime || currentPlan?.time) && currentPlan?.endTime && currentPlan?.available) return;
    event.preventDefault();
    event.stopPropagation();
    if (statusEl) {
      statusEl.innerHTML = '<span class="bb-badge">Please select date and time first</span>';
    }
  };

  root.addEventListener('click', lockAwareClick, true);
}

function bbVenueServices(venueName) {
  const map = {
    'Willow Garden Estate': ['catering', 'decoration', 'photography', 'florals'],
    'LumiÃ¨re Ballroom': ['catering', 'decoration', 'photography', 'lighting-av', 'entertainment'],
    'Lumiere Ballroom': ['catering', 'decoration', 'photography', 'lighting-av', 'entertainment'],
    'Skyline Terrace': ['catering', 'photography', 'entertainment', 'lighting-av'],
    'The Atrium Loft': ['catering', 'decoration', 'photography', 'entertainment'],
    'Meridian Conference Hall': ['catering', 'lighting-av', 'photography'],
    'Coral Bay Pavilion': ['catering', 'decoration', 'florals', 'photography']
  };

  return map[venueName] || ['catering', 'decoration', 'photography', 'entertainment', 'lighting-av', 'cake', 'florals'];
}

function bbInitSimpleServicePage(config = {}) {
  const root = document.querySelector(config.rootSelector || '[data-simple-service-page]');
  if (!root) return;

  const summaryEl = root.querySelector('[data-service-summary]');
  const estimateEl = root.querySelector('[data-service-estimate]');
  const saveBtn = root.querySelector('[data-service-save]');
  const continueBtn = root.querySelector('[data-service-continue]');
  const backBtn = root.querySelector('[data-service-back]');

  const eventContext = bbGetEventContext();
  const venue = bbGetVenue() || {};

  const titleEl = root.querySelector('[data-service-title]');
  const contextEl = root.querySelector('[data-service-context]');
  const venueEl = root.querySelector('[data-service-venue]');

  if (titleEl && config.title) titleEl.textContent = config.title;
  if (contextEl) {
    contextEl.textContent = `${eventContext.eventType || 'Wedding'} Â· ${eventContext.eventDate || '20 December 2026'} Â· ${bbPluralGuests(eventContext.guests || 150)}`;
  }
  if (venueEl) venueEl.textContent = venue.name || 'Selected venue';

  const recalc = () => {
    let total = 0;
    const items = [];

    root.querySelectorAll('[data-price-input]').forEach((input) => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (!input.checked) return;
        const price = Number(input.dataset.price || 0);
        total += price;
        items.push(input.dataset.label || input.value || input.name);
        return;
      }

      if (input.tagName === 'SELECT') {
        const selected = input.selectedOptions[0];
        const price = Number(selected?.dataset.price || input.dataset.price || 0);
        if (!price && !selected) return;
        total += price;
        items.push(selected?.dataset.label || selected?.textContent?.trim() || input.dataset.label || input.name);
        return;
      }

      if (input.type === 'number') {
        const quantity = Number(input.value || 0);
        const unit = Number(input.dataset.price || 0);
        if (!quantity || !unit) return;
        total += quantity * unit;
        items.push(`${input.dataset.label || input.name} x${quantity}`);
      }
    });

    const guests = Number(root.querySelector('[data-guests]')?.value || eventContext.guests || 0);
    if (estimateEl) estimateEl.textContent = bbMoney(total);
    if (summaryEl) {
      summaryEl.innerHTML = items.length
        ? items.map((item) => `<li><i class="bi bi-check2-circle"></i><span>${item}</span></li>`).join('')
        : '<li class="text-ink-soft">No options selected.</li>';
    }
    return { total, items, guests };
  };

  const save = () => {
    const result = recalc();
    bbSetServiceData(config.serviceId, {
      serviceId: config.serviceId,
      title: config.title,
      estimatedTotal: result.total,
      options: result.items
    });

    const current = bbGetSelectedServices().filter((item) => item.id !== config.serviceId);
    if (result.items.length || result.total > 0) {
      current.push({ id: config.serviceId, title: config.title, estimatedTotal: result.total });
    }
    bbSetSelectedServices(current);
    return result;
  };

  root.querySelectorAll('[data-price-input]').forEach((input) => {
    input.addEventListener('change', recalc);
    input.addEventListener('input', recalc);
  });

  saveBtn?.addEventListener('click', () => {
    save();
    saveBtn.textContent = 'Saved';
    setTimeout(() => {
      saveBtn.textContent = `Save ${config.shortTitle || config.title}`;
    }, 1000);
  });

  continueBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    save();
    window.location.href = config.continueHref || '/prototype/customer/review.html';
  });

  backBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    save();
    window.location.href = config.backHref || '/prototype/customer/services.html';
  });

  recalc();
}

window.bbRead = bbRead;
window.bbWrite = bbWrite;
window.bbMoney = bbMoney;
window.bbPluralGuests = bbPluralGuests;
window.bbGetVenue = bbGetVenue;
window.bbSetVenue = bbSetVenue;
window.bbGetEventContext = bbGetEventContext;
window.bbSetEventContext = bbSetEventContext;
window.bbGetMinimumBookingDate = bbGetMinimumBookingDate;
window.bbIsValidBookingDate = bbIsValidBookingDate;
window.bbGetSelectedServices = bbGetSelectedServices;
window.bbSetSelectedServices = bbSetSelectedServices;
window.bbGetServiceData = bbGetServiceData;
window.bbSetServiceData = bbSetServiceData;
window.bbGetCatering = bbGetCatering;
window.bbSetCatering = bbSetCatering;
window.bbGetPackagePlan = bbGetPackagePlan;
window.bbSetPackagePlan = bbSetPackagePlan;
window.bbGetBookingMode = bbGetBookingMode;
window.bbSetBookingMode = bbSetBookingMode;
window.clearCustomizeBookingDraft = clearCustomizeBookingDraft;
window.clearPackageBookingDraft = clearPackageBookingDraft;
window.bbGetAuth = bbGetAuth;
window.bbGetAuthToken = bbGetAuthToken;
window.bbGetAuthUser = bbGetAuthUser;
window.bbSetAuth = bbSetAuth;
window.bbClearAuth = bbClearAuth;
window.bbGetAuthReturnUrl = bbGetAuthReturnUrl;
window.bbSetAuthReturnUrl = bbSetAuthReturnUrl;
window.bbClearAuthReturnUrl = bbClearAuthReturnUrl;
window.bbResolveAuthRedirect = bbResolveAuthRedirect;
window.bbAuthHeaders = bbAuthHeaders;
window.bbFetchJson = bbFetchJson;
window.bbNormalizeVenueName = bbNormalizeVenueName;
window.bbFindVenueIdByName = bbFindVenueIdByName;
window.bbRequireAuth = bbRequireAuth;
window.bbInitPackageWorkflow = bbInitPackageWorkflow;
window.bbVenueServices = bbVenueServices;
window.bbInitSimpleServicePage = bbInitSimpleServicePage;

async function bbInitHomePackages() {
  const root = document.querySelector('[data-home-packages]');
  if (!root) return;

  const preferredSlugs = {
    WEDDING: 'yangon-timeless-love',
    ENGAGEMENT: 'inya-sunset-engagement',
    BIRTHDAY: 'yangon-garden-birthday',
    CORPORATE: 'business-excellence'
  };
  const fallbackImages = {
    'yangon-timeless-love': '/prototype/assets/img/wedding1.jpg',
    'inya-sunset-engagement': '/prototype/assets/img/engagement2.jpg',
    'yangon-garden-birthday': '/prototype/assets/img/birthday3.jpg',
    'business-excellence': '/prototype/assets/img/corp2.jpg'
  };
  try {
    const packages = await bbFetchJson(window.bbApiUrl('/api/packages'), { headers: { Accept: 'application/json' } });
    const activePackages = Array.isArray(packages) ? packages.filter((item) => item && item.active !== false) : [];
    const featured = Object.entries(preferredSlugs).map(([category, slug]) => (
      activePackages.find((item) => item.category === category && item.slug === slug)
      || activePackages.find((item) => item.category === category)
    )).filter(Boolean);

    if (featured.length !== 4) throw new Error('Featured package catalog is incomplete.');

    root.innerHTML = featured.map((item) => {
      const image = item.image?.startsWith('/uploads/') ? window.bbApiUrl(item.image) : (item.image || fallbackImages[item.slug]);
      const category = String(item.category || '').toLowerCase();
      return `<div class="col-md-6 col-xl-3" data-home-package-card>
        <article class="bb-card reveal h-100">
          <div class="bb-card__media" style="background-image:url('${bbEscapeHtml(image || '')}');"></div>
          <div class="bb-card__body d-flex flex-column h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="bb-badge">${bbEscapeHtml(category)}</span>
              <span class="bb-badge gold">UP TO ${bbEscapeHtml(item.maxGuests)} GUESTS</span>
            </div>
            <h4 class="mb-2">${bbEscapeHtml(item.name)}</h4>
            <p class="small text-ink-soft mb-3" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;">${bbEscapeHtml(item.description || '')}</p>
            <div class="mt-auto d-flex align-items-end">
              <div><div class="stat-label">PACKAGE PRICE</div><div class="bb-price">${bbEscapeHtml(bbFormatMmkDisplay(item.finalPrice))}</div></div>
            </div>
          </div>
        </article>
      </div>`;
    }).join('');
    root.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  } catch (error) {
    console.warn('Featured package catalog unavailable.');
    root.innerHTML = '<div class="col-12"><p class="text-center text-ink-soft mb-0">Featured packages are temporarily unavailable.</p></div>';
  }
}

async function bbInitHomeVenues() {
  const root = document.querySelector('[data-home-venues]');
  if (!root) return;

  const preferredIds = [35, 36, 44];
  const fallbackImages = {
    35: '/prototype/assets/img/venue-1.jpg',
    36: '/prototype/assets/img/venue-2.jpg',
    44: '/prototype/assets/img/venue-1.jpg'
  };

  try {
    const venues = await bbFetchJson(window.bbApiUrl('/api/venues'), { headers: { Accept: 'application/json' } });
    const activeVenues = Array.isArray(venues) ? venues.filter((item) => item && item.available !== false) : [];
    const featured = preferredIds.map((id) => activeVenues.find((item) => Number(item.id) === id)).filter(Boolean);
    if (featured.length !== 3) throw new Error('Featured venue catalog is incomplete.');

    root.innerHTML = featured.map((item) => {
      const cleanVenueText = (value) => String(value || '')
        .replace(/\u00e2\u0080\u0093/g, '\u2013')
        .replace(/\u00e2\u0080\u0094/g, '\u2014')
        .replace(/\u00c2/g, '');
      const name = cleanVenueText(item.name);
      const type = cleanVenueText(item.type || 'Venue');
      const location = cleanVenueText(item.location || 'Myanmar');
      const description = cleanVenueText(item.description || location);
      const venueId = Number(item.id);
      const image = item.image || fallbackImages[item.id];
      const capacity = Number(item.capacity);
      const capacityLabel = Number.isFinite(capacity) && capacity > 0
        ? `<span class="capacity-pill bb-badge gold">UP TO ${capacity.toLocaleString()} GUESTS</span>`
        : '';
      return `<div class="col-md-6 col-lg-4" data-home-venue-card data-venue-id="${venueId}">
        <article class="bb-card reveal h-100">
          <div class="bb-card__media" style="background-image:url('${bbEscapeHtml(image || '')}');"></div>
          <div class="bb-card__body d-flex flex-column h-100">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <span class="bb-badge">${bbEscapeHtml(type)}</span>
              ${capacityLabel}
            </div>
            <h4 class="mb-1">${bbEscapeHtml(name)}</h4>
            <p class="small text-ink-soft mb-2"><i class="bi bi-geo-alt me-1"></i>${bbEscapeHtml(location)}</p>
            <p class="small text-ink-soft mb-3" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;">${bbEscapeHtml(description)}</p>
            <div class="mt-auto d-flex align-items-end justify-content-between gap-2">
              <div><div class="stat-label">VENUE PRICE</div><div class="bb-price">${bbEscapeHtml(bbFormatMmkDisplay(item.price))}</div></div>
              <a class="btn btn-outline-forest btn-sm" href="/prototype/venues.html">View Venue</a>
            </div>
          </div>
        </article>
      </div>`;
    }).join('');
    root.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  } catch (error) {
    console.warn('Featured venue catalog unavailable.');
    root.innerHTML = '<div class="col-12"><p class="text-center text-ink-soft mb-0">Featured venues are temporarily unavailable.</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  document.querySelectorAll('[data-search-target]').forEach((input) => {
    const scope = document.querySelector(input.dataset.searchTarget);
    if (!scope) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const rows = [...scope.querySelectorAll('[data-searchable]')];
      rows.forEach((row) => {
        const catalogActive = row.dataset.catalogActive !== 'false';
        row.style.display = catalogActive && row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });

  document.querySelectorAll('[data-filter-target]').forEach((ctrl) => {
    const scope = document.querySelector(ctrl.dataset.filterTarget);
    if (!scope) return;

    const apply = (value) => {
      scope.querySelectorAll('[data-tags]').forEach((item) => {
        const show = value === 'all' || item.dataset.tags.split(',').includes(value);
        item.style.display = item.dataset.catalogActive !== 'false' && show ? '' : 'none';
      });
    };

    if (ctrl.tagName === 'SELECT') {
      ctrl.addEventListener('change', () => apply(ctrl.value));
    } else {
      ctrl.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-filter]');
        if (!btn) return;
        ctrl.querySelectorAll('[data-filter]').forEach((button) => button.classList.remove('active'));
        btn.classList.add('active');
        apply(btn.dataset.filter);
      });
    }
  });

  if (document.querySelector('[data-package-workflow]')) {
    bbInitPackageWorkflow({});
  }

  bbInitCustomerSidebar();
  bbUpdateAuthDisplay();
  bbInitForgotPasswordPage();
  bbRefreshPublicAuthNav();
  bbRefreshCustomerHeader();
  bbInitCustomerNotifications();
  bbInitHomePackages();
  bbInitHomeVenues();

  if (document.querySelector('[data-booking-history-page]')) {
    bbRenderCustomerBookingHistory();
  }

  if (document.querySelector('[data-booking-status-page]')) {
    bbRenderCustomerBookingStatus();
  }

  if (document.querySelector('[data-dashboard-page]')) {
    bbRenderCustomerDashboard();
  }

  if (document.querySelector('[data-quotation-page]')) {
    bbRenderCustomerQuotation();
  }
  if (document.querySelector('[data-payment-page]')) {
    bbRenderCustomerPayment();
  }

  document.querySelectorAll('form[data-auth-form]').forEach((form) => {
    const formType = form.dataset.authForm || 'login';
    const statusEl = form.querySelector('[data-auth-status]');
    const submitBtn = form.querySelector('[data-auth-submit]');
    const defaultRedirect = form.dataset.authSuccess || '/prototype/customer/dashboard.html';
    const passwordInput = form.querySelector('[name="password"]');
    const passwordRulesEl = form.querySelector('[data-password-rules]');
    const passwordStrengthEl = form.querySelector('[data-password-strength]');
    const passwordMeterFillEl = form.querySelector('[data-password-meter-fill]');
    const passwordSuccessEl = form.querySelector('[data-password-success]');

    const setStatus = (message, variant = 'danger') => {
      if (!statusEl) return;
      statusEl.className = `col-12 alert alert-${variant}`;
      statusEl.textContent = message;
      statusEl.classList.remove('d-none');
    };

    const clearStatus = () => {
      if (!statusEl) return;
      statusEl.className = 'col-12 alert d-none';
      statusEl.textContent = '';
    };

    if (bbGetAuth()) {
      window.location.replace(bbResolveAuthRedirect(defaultRedirect));
      return;
    }

    if (formType === 'register') {
      bbUpdatePasswordStrengthUI(passwordInput?.value || '', passwordRulesEl, passwordStrengthEl, passwordMeterFillEl, passwordSuccessEl);
      passwordInput?.addEventListener('input', () => {
        bbUpdatePasswordStrengthUI(passwordInput?.value || '', passwordRulesEl, passwordStrengthEl, passwordMeterFillEl, passwordSuccessEl);
      });
      const confirmInput = form.querySelector('[name="confirmPassword"]');
      confirmInput?.addEventListener('input', () => {
        if (statusEl?.textContent === 'Passwords do not match.' && confirmInput.value === passwordInput.value) clearStatus();
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearStatus();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const endpoint = formType === 'register'
        ? window.bbApiUrl('/api/auth/register')
        : window.bbApiUrl('/api/auth/login');

      const emailInput = form.querySelector('[name="email"]');
      const passwordInput = form.querySelector('[name="password"]');
      const confirmInput = form.querySelector('[name="confirmPassword"]');
      const firstNameInput = form.querySelector('[name="firstName"]');
      const lastNameInput = form.querySelector('[name="lastName"]');
      const phoneInput = form.querySelector('[name="phone"]');
      const rememberInput = form.querySelector('[name="remember"]');
      const termsInput = form.querySelector('[name="terms"]');

      const email = emailInput?.value.trim() || '';
      const password = passwordInput?.value || '';

      if (formType === 'register') {
        const firstName = firstNameInput?.value.trim() || '';
        const lastName = lastNameInput?.value.trim() || '';
        const phone = phoneInput?.value.trim() || '';
        const confirmPassword = confirmInput?.value || '';
        const passwordState = bbGetPasswordRuleState(password);
        const passwordStrong = Object.values(passwordState).every(Boolean);

        if (!firstName || !lastName) {
          setStatus('Please complete your name details.', 'danger');
          return;
        }

        if (!passwordStrong) {
          setStatus('Please create a stronger password that meets all requirements.', 'danger');
          passwordInput?.focus();
          return;
        }

        if (password !== confirmPassword) {
          setStatus('Passwords do not match.', 'danger');
          confirmInput?.focus();
          return;
        }

        if (termsInput && !termsInput.checked) {
          setStatus('Please agree to the terms of service.', 'danger');
          termsInput.focus();
          return;
        }

        const payload = {
          firstName,
          lastName,
          email,
          phone: phone || null,
          password
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating account...';
        }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || 'Unable to create your account right now.');
          }

          bbSetAuth(data, false);
          const redirectTarget = bbResolveAuthRedirect(defaultRedirect);
          bbClearAuthReturnUrl();
          setStatus('Account created successfully. Redirecting...', 'success');
          window.setTimeout(() => {
            window.location.replace(redirectTarget);
          }, 450);
        } catch (error) {
          setStatus(error.message || 'Unable to create your account right now.', 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create account';
          }
        }
        return;
      }

      const payload = { email, password };
      const remember = Boolean(rememberInput?.checked);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || 'Invalid email or password.');
        }

        bbSetAuth(data, remember);
        const redirectTarget = bbResolveAuthRedirect(defaultRedirect);
        bbClearAuthReturnUrl();
        setStatus('Signed in successfully. Redirecting...', 'success');
        window.setTimeout(() => {
          window.location.replace(redirectTarget);
        }, 450);
      } catch (error) {
        setStatus(error.message || 'Unable to sign in right now.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign in';
        }
      }
    });
  });

  document.querySelectorAll('form[data-profile-form]').forEach((form) => {
    const firstNameInput = form.querySelector('[name="firstName"]');
    const lastNameInput = form.querySelector('[name="lastName"]');
    const emailInput = form.querySelector('[name="email"]');
    const phoneInput = form.querySelector('[name="phone"]');
    const addressInput = form.querySelector('[name="address"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const statusEl = form.querySelector('[data-profile-status]');
    const photoButton = document.querySelector('[data-profile-photo]');
    const photoInput = document.querySelector('[data-profile-photo-input]');
    const photoAvatar = document.querySelector('[data-profile-avatar]');
    const photoActions = document.querySelector('[data-profile-photo-actions]');
    const photoUploadButton = document.querySelector('[data-profile-photo-upload]');
    const photoCancelButton = document.querySelector('[data-profile-photo-cancel]');
    const photoStatusEl = document.querySelector('[data-profile-photo-status]');
    const nameEl = document.querySelector('[data-profile-name]') || document.querySelector('.bb-main h4.mb-0');

    const setStatus = (message, variant) => {
      if (!statusEl) return;
      statusEl.className = `col-12 alert alert-${variant}`;
      statusEl.textContent = message;
      statusEl.classList.remove('d-none');
    };

    const populate = (profile) => {
      if (firstNameInput) firstNameInput.value = profile.firstName || '';
      if (lastNameInput) lastNameInput.value = profile.lastName || '';
      if (emailInput) emailInput.value = profile.email || '';
      if (phoneInput) phoneInput.value = profile.phone || '';
      if (addressInput) addressInput.value = profile.address || '';
      if (nameEl) nameEl.textContent = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Profile';
      if (photoAvatar) {
        photoAvatar.replaceChildren();
        if (profile.profileImageUrl) {
          const image = document.createElement('img');
          image.src = new URL(profile.profileImageUrl, window.bbApiUrl('/')).toString();
          image.alt = `${profile.firstName || 'Customer'} profile photo`;
          image.className = 'profile-avatar__image';
          photoAvatar.appendChild(image);
        } else {
          const icon = document.createElement('i');
          icon.className = 'bi bi-person';
          photoAvatar.appendChild(icon);
        }
      }
      bbApplyCustomerProfile(profile);
    };

    if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

    (async () => {
      try {
        const profile = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/me'), { method: 'GET' });
        if (profile) populate(profile);
      } catch (error) {
        setStatus('Unable to load your profile. Please try again.', 'danger');
      }

      const loadCount = async (url, rowSelector, countSelector) => {
        const row = document.querySelector(rowSelector);
        const count = document.querySelector(countSelector);
        if (!row || !count) return;
        try {
          const records = await bbFetchCustomerJson(url, { method: 'GET' });
          if (!Array.isArray(records)) throw new Error('Unexpected count response');
          count.textContent = String(records.length);
        } catch (error) {
          row.classList.add('d-none');
        }
      };

      await Promise.all([
        loadCount(window.bbApiUrl('/api/customer/bookings'), '[data-profile-bookings-row]', '[data-profile-bookings-count]'),
        loadCount(window.bbApiUrl('/api/customer/quotations'), '[data-profile-quotations-row]', '[data-profile-quotations-count]')
      ]);
    })();

    let selectedPhoto = null;
    let previewUrl = null;
    const showPhotoStatus = (message, variant = 'soft') => {
      if (!photoStatusEl) return;
      photoStatusEl.textContent = message;
      photoStatusEl.className = `small mt-2 ${variant === 'danger' ? 'text-danger' : 'text-ink-soft'}`;
    };
    const clearPhotoSelection = () => {
      selectedPhoto = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      if (photoInput) photoInput.value = '';
      photoActions?.classList.add('d-none');
    };
    const previewPhoto = (file) => {
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showPhotoStatus('Choose a JPG, PNG, or WebP image.', 'danger');
        clearPhotoSelection();
        return;
      }
      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        showPhotoStatus('Profile photo must be between 1 byte and 5 MB.', 'danger');
        clearPhotoSelection();
        return;
      }
      selectedPhoto = file;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      if (photoAvatar) {
        photoAvatar.replaceChildren();
        const image = document.createElement('img');
        image.src = previewUrl;
        image.alt = 'Selected profile photo preview';
        image.className = 'profile-avatar__image';
        photoAvatar.appendChild(image);
      }
      photoActions?.classList.remove('d-none');
      showPhotoStatus('Preview ready. Upload to save this photo.', 'soft');
    };

    photoButton?.addEventListener('click', () => photoInput?.click());
    photoInput?.addEventListener('change', () => previewPhoto(photoInput.files?.[0]));
    photoCancelButton?.addEventListener('click', async () => {
      clearPhotoSelection();
      try {
        const profile = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/me'), { method: 'GET' });
        if (profile) populate(profile);
      } catch (error) {
        showPhotoStatus('Unable to restore the saved photo.', 'danger');
      }
    });
    photoUploadButton?.addEventListener('click', async () => {
      if (!selectedPhoto) return;
      photoUploadButton.disabled = true;
      photoUploadButton.textContent = 'Uploading...';
      const body = new FormData();
      body.append('photo', selectedPhoto);
      try {
        const profile = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/profile/photo'), {
          method: 'POST',
          body
        });
        clearPhotoSelection();
        populate(profile);
        showPhotoStatus('Profile photo updated.', 'soft');
      } catch (error) {
        showPhotoStatus(error.message || 'Unable to upload your profile photo.', 'danger');
      } finally {
        photoUploadButton.disabled = false;
        photoUploadButton.textContent = 'Upload photo';
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      try {
        const profile = await bbFetchCustomerJson(window.bbApiUrl('/api/customer/profile'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            phone: phoneInput.value.trim() || null,
            address: addressInput.value.trim() || null
          })
        });
        populate(profile);
        setStatus('Profile updated successfully.', 'success');
      } catch (error) {
        setStatus('Unable to update your profile. Please try again.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save changes';
      }
    });
  });

  document.querySelectorAll('form[data-password-form]').forEach((form) => {
    const currentPasswordInput = form.querySelector('[name="currentPassword"]');
    const newPasswordInput = form.querySelector('[name="newPassword"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const statusEl = form.querySelector('[data-password-status]');

    const setStatus = (message, variant) => {
      if (!statusEl) return;
      statusEl.className = `col-12 alert alert-${variant}`;
      statusEl.textContent = message;
      statusEl.classList.remove('d-none');
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const newPassword = newPasswordInput.value;
      const passwordState = bbGetPasswordRuleState(newPassword);
      if (!Object.values(passwordState).every(Boolean)) {
        setStatus('Please create a stronger password that meets all requirements.', 'danger');
        newPasswordInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Changing...';
      try {
        await bbFetchCustomerJson(window.bbApiUrl('/api/customer/password'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: currentPasswordInput.value,
            newPassword
          })
        });
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        setStatus('Password changed successfully.', 'success');
      } catch (error) {
        setStatus(error.message || 'Unable to change your password. Please try again.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change password';
      }
    });
  });

  document.querySelectorAll('a[href="/prototype/login.html"]').forEach((link) => {
    const text = (link.textContent || '').trim().toLowerCase();
    if (!text.includes('sign out')) return;
    link.addEventListener('click', () => {
      bbClearAuth();
      bbClearAuthReturnUrl();
    });
  });

  const pendingAuthReturnUrl = bbGetAuthReturnUrl();
  if (pendingAuthReturnUrl) {
    document.querySelectorAll('a[href="/prototype/login.html"], a[href="/prototype/register.html"]').forEach((link) => {
      const text = (link.textContent || '').trim().toLowerCase();
      if (text.includes('sign out')) return;
      const target = new URL(link.href, window.location.origin);
      if (!target.searchParams.has('returnUrl')) {
        target.searchParams.set('returnUrl', pendingAuthReturnUrl);
        link.href = `${target.pathname}?${target.searchParams.toString()}`;
      }
    });
  }

  document.querySelectorAll('form[data-booking-form]').forEach((form) => {
    if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

    const confirmationRoot = form.closest('[data-booking-confirmation-page]');
    const startScreen = confirmationRoot?.querySelector('[data-booking-start-screen]');
    const hasActiveDraft = bbHasActivePackageBookingDraft() || bbHasActiveCustomizeBookingDraft();
    if (!hasActiveDraft) {
      confirmationRoot?.classList.add('is-booking-start-mode');
      startScreen?.classList.remove('d-none');
      return;
    }

    const statusEl = form.querySelector('[data-booking-status]');
    const getSubmitButton = () => form.closest('[data-booking-confirmation-page]')?.querySelector('[data-booking-submit]')
      || form.querySelector('[data-booking-submit]');
    const successHref = form.dataset.bookingSuccess || '/prototype/customer/booking-status.html';

    const eventTypeInput = form.querySelector('[name="eventType"]');
    const venueInput = form.querySelector('[name="venue"]');
    const dateInput = form.querySelector('[name="eventDate"]');
    const timeInput = form.querySelector('[name="startTime"]');
    const endTimeInput = form.querySelector('[name="endTime"]');
    const guestsInput = form.querySelector('[name="guests"]');
    const requestsInput = form.querySelector('[name="specialRequests"]');
    const buildServiceSelectionsPayload = () => {
      const selectedServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
      const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};
      const cateringData = typeof bbGetCatering === 'function' ? bbGetCatering() : null;

      return selectedServices.map((item) => {
        const stored = item?.id === 'catering'
          ? (cateringData || serviceData[item.id] || {})
          : (serviceData[item.id] || {});
        const backendServiceId = Number(stored?.backendServiceId || 0);
        const serviceKey = String(item?.id || '').trim();
        const estimatedTotal = Number(item?.estimatedTotal || stored?.estimatedTotal || 0);

        if (!serviceKey) {
          throw new Error(`Selected service ${item?.title || 'service'} is missing a valid service key.`);
        }

        if (!Number.isFinite(estimatedTotal) || estimatedTotal < 0) {
          throw new Error(`Selected service ${item?.title || item?.id || 'service'} has an invalid total.`);
        }

        return {
          backendServiceId: Number.isFinite(backendServiceId) && backendServiceId > 0 ? backendServiceId : null,
          serviceKey,
          estimatedTotal,
          customization: stored || null
        };
      });
    };

    const setStatus = (message, variant = 'danger') => {
      if (!statusEl) return;
      statusEl.className = `col-12 alert alert-${variant}`;
      statusEl.textContent = message;
      statusEl.classList.remove('d-none');
    };

    const clearStatus = () => {
      if (!statusEl) return;
      statusEl.className = 'col-12 alert d-none';
      statusEl.textContent = '';
    };

    const prefillFromState = () => {
      const eventContext = bbGetEventContext();
      const storedVenue = bbGetVenue() || {};
      const legacyVenue = bbRead('bbVenueEventDetails') || {};
      const packagePlan = bbGetPackagePlan();

      if (eventTypeInput && (eventContext.eventType || legacyVenue.eventType)) {
        eventTypeInput.value = eventContext.eventType || legacyVenue.eventType;
      }
      if (dateInput && (eventContext.eventDate || legacyVenue.eventDate)) {
        const rawDate = eventContext.eventDate || legacyVenue.eventDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          dateInput.value = rawDate;
        }
      }
      const storedStartTime = legacyVenue.startTime || eventContext.startTime || '';
      const storedEventTime = legacyVenue.eventTime || eventContext.eventTime || '';
      const rangeStartTime = storedEventTime.match(/^(\d{1,2}:\d{2})\s*-\s*\d{1,2}:\d{2}$/)?.[1] || '';
      const rawStartTime = storedStartTime || rangeStartTime;
      if (timeInput && /^\d{1,2}:\d{2}$/.test(rawStartTime)) {
        const [hours, minutes] = rawStartTime.split(':').map(Number);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          timeInput.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
      }
      if (endTimeInput && (eventContext.endTime || legacyVenue.endTime)) {
        endTimeInput.value = eventContext.endTime || legacyVenue.endTime;
      }
      if (guestsInput && (eventContext.guests || legacyVenue.guests)) {
        guestsInput.value = eventContext.guests || legacyVenue.guests;
      }
      if (venueInput && storedVenue.name) {
        venueInput.value = storedVenue.name;
      }
      if (requestsInput) {
        const savedRequests = bbHasPackageBookingMode()
          ? packagePlan.specialRequests
          : (eventContext.specialRequirements || legacyVenue.specialRequirements);
        if (savedRequests) requestsInput.value = savedRequests;
      }
    };

    if (bbGetAuth()) {
      prefillFromState();
    } else {
      return;
    }

    bbUpdateAuthDisplay();
    bbRenderBookingDraftSummary(form);

    const refreshBookingDraftSummary = () => bbRenderBookingDraftSummary(form);
    [eventTypeInput, venueInput, dateInput, timeInput, endTimeInput, guestsInput, requestsInput].forEach((input) => {
      input?.addEventListener('change', refreshBookingDraftSummary);
      input?.addEventListener('input', refreshBookingDraftSummary);
    });
    requestsInput?.addEventListener('input', () => {
      if (bbHasPackageBookingMode()) {
        bbSetPackagePlan({ specialRequests: requestsInput.value.trim() || null });
      } else {
        bbSetEventContext({ specialRequirements: requestsInput.value.trim() || null });
      }
      bbSyncPackageSpecialRequestsSummary(form);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearStatus();
      const submitBtn = getSubmitButton();

      if (bbHasPackageBookingMode()) {
        const plan = bbGetPackagePlan();
        const packageSubmit = submitBtn;
        const validPlan = Number(plan?.packageId) > 0 || String(plan?.packageSlug || '').trim();
        if (!validPlan || plan?.packageAvailable !== true && plan?.available !== true) {
          setStatus('Please check package availability again before booking.', 'warning');
          return;
        }
        if (!bbIsValidBookingDate(plan?.eventDate)) {
          setStatus('Event date must be at least one month in advance.', 'danger');
          return;
        }
        if (packageSubmit) {
          packageSubmit.disabled = true;
          packageSubmit.textContent = 'Confirming...';
        }
        try {
          const packageBooking = await bbFetchJson(window.bbApiUrl('/api/customer/package-bookings'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              packageId: Number(plan.packageId) > 0 ? Number(plan.packageId) : null,
              packageSlug: plan.packageSlug || null,
              eventDate: plan.eventDate,
              startTime: plan.startTime,
              endTime: plan.endTime,
              guestCount: Number(plan.guestCount),
              specialRequests: requestsInput?.value?.trim() || plan.specialRequests || null
            })
          });
          window.sessionStorage.setItem('bbLatestBooking', JSON.stringify(packageBooking));
          window.sessionStorage.setItem('bbLatestEvent', JSON.stringify({
            id: packageBooking.eventId,
            eventType: packageBooking.packageName,
            eventDate: packageBooking.eventDate,
            guestCount: packageBooking.guestCount,
            venueId: packageBooking.venueId,
            venueName: packageBooking.venueName
          }));
          clearPackageBookingDraft();
          bbRenderPackageBookingSuccess(form, packageBooking);
        } catch (error) {
          if (error?.status === 401) {
            const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            bbSetAuthReturnUrl(target);
            window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
            return;
          }
          if (error?.status === 409) {
            setStatus('This package venue is no longer available for your selected time. Please check availability again.', 'danger');
            if (statusEl) {
              const link = document.createElement('a');
              link.href = '/prototype/packages.html';
              link.className = 'alert-link d-block mt-2';
              link.textContent = 'Return to Packages';
              statusEl.appendChild(link);
            }
          } else if (error?.status === 400 || error?.status === 404) {
            setStatus(error.message || 'This package cannot be booked with the selected event details.', 'danger');
          } else {
            setStatus('Unable to submit this package booking right now. Please try again.', 'danger');
          }
          if (packageSubmit) {
            packageSubmit.disabled = false;
            packageSubmit.textContent = 'CONFIRM PACKAGE BOOKING';
          }
        }
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const eventType = eventTypeInput?.value?.trim() || 'Wedding';
      const eventDate = dateInput?.value || '';
      const guestCount = Number(guestsInput?.value || 0);
      const startTime = timeInput?.value || '';
      const endTime = endTimeInput?.value || '';
      const specialRequests = requestsInput?.value?.trim() || '';
      const storedVenue = bbGetVenue() || {};
      const venueId = Number(storedVenue.id);
      const venueName = storedVenue.name || venueInput?.value?.trim() || '';
      let createdEventId = null;

      const validTime = (value) => /^\d{2}:\d{2}$/.test(value)
        && Number(value.slice(0, 2)) <= 23
        && Number(value.slice(3, 5)) <= 59;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
        || !validTime(startTime)
        || !validTime(endTime)
        || startTime >= endTime) {
        setStatus('A valid event date and time range are required.', 'danger');
        return;
      }

      if (!bbIsValidBookingDate(eventDate)) {
        setStatus('Event date must be at least one month in advance.', 'danger');
        return;
      }

      if (!Number.isFinite(venueId) || venueId <= 0) {
        setStatus('Please select your venue again before confirming your booking.', 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Confirming booking...';
      }

      try {
        bbSetEventContext({
          eventType,
          eventDate,
          guests: guestCount,
          eventTime: startTime,
          endTime,
          specialRequirements: specialRequests || null,
          venueId
        });
        bbSetVenue({ ...storedVenue, name: venueName, id: venueId });

        const eventPayload = {
          eventType,
          eventDate,
          guestCount,
          budget: null,
          specialRequirements: specialRequests || null,
          venueId
        };

        const eventData = await bbFetchJson(window.bbApiUrl('/api/events'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload)
        });
        createdEventId = eventData.id;

        const serviceSelections = buildServiceSelectionsPayload();

        const bookingData = await bbFetchJson(window.bbApiUrl('/api/bookings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: eventData.id,
            quotationId: null,
            startTime: startTime || null,
            endTime: endTime || null,
            services: serviceSelections
          })
        });

        window.sessionStorage.setItem('bbLatestEvent', JSON.stringify(eventData));
        window.sessionStorage.setItem('bbLatestBooking', JSON.stringify(bookingData));
        clearCustomizeBookingDraft();
        setStatus('Booking saved. Your quotation is pending preparation. Redirecting...', 'success');
        window.setTimeout(() => {
          if (bookingData?.id) {
            const redirectUrl = new URL(successHref, window.location.origin);
            redirectUrl.searchParams.set('id', bookingData.id);
            window.location.replace(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`);
            return;
          }
          window.location.replace(successHref);
        }, 500);
      } catch (error) {
        if (error?.status === 401) {
          const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          bbSetAuthReturnUrl(target);
          window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(target)}`;
          return;
        }
        if (createdEventId) {
          try {
            await fetch(window.bbApiUrl(`/api/events/${createdEventId}`), {
              method: 'DELETE',
              headers: bbAuthHeaders({ Accept: 'application/json' })
            });
          } catch (cleanupError) {
            console.warn('Unable to clean up incomplete event after booking failure.', cleanupError);
          }
        }
        setStatus(error.message || 'Unable to complete your booking. Please try again.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Booking';
        }
      }
    });
  });

  document.querySelectorAll('form[data-demo]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const note = form.querySelector('[data-demo-note]');
      if (note) {
        note.classList.remove('d-none');
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const go = form.dataset.demo;
      if (go && go !== 'note') {
        setTimeout(() => {
          window.location.href = go;
        }, 700);
      }
    });
  });

  const builder = document.querySelector('[data-builder]');
  if (builder) {
    const out = document.querySelector('[data-builder-total]');
    const list = document.querySelector('[data-builder-list]');

    const recalc = () => {
      let total = 0;
      const picked = [];

      builder.querySelectorAll('input[type=checkbox]:checked, input[type=radio]:checked').forEach((input) => {
        total += Number(input.dataset.price || 0);
        picked.push(input.dataset.label || input.value);
      });

      const guests = Number(document.querySelector('[data-guests]')?.value || 0);
      total += guests * 45;

      if (out) out.textContent = bbMoney(total);
      if (list) {
        list.innerHTML = `${picked.map((item) => `<span class="ai-chip">${item}</span>`).join('')}<span class="ai-chip">${bbPluralGuests(guests)} · Per-guest MMK pricing</span>`;
      }
    };

    builder.addEventListener('change', recalc);
    document.querySelector('[data-guests]')?.addEventListener('input', recalc);
    recalc();
  }

  document.querySelectorAll('[data-venue-select]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const card = button.closest('[data-venue-card]');
      if (!card) return;

      const venueName = card.dataset.venueName || card.querySelector('[data-venue-name]')?.textContent?.trim() || 'Selected venue';
      const venue = {
        name: venueName,
        location: card.dataset.venueLocation || card.querySelector('[data-venue-location]')?.textContent?.trim() || '',
        capacity: Number(card.dataset.venueCapacity || card.querySelector('[data-venue-capacity]')?.textContent?.replace(/[^0-9]/g, '') || 0),
        type: card.dataset.venueType || card.querySelector('[data-venue-type]')?.textContent?.trim() || '',
        rate: Number((card.dataset.venueRate || card.querySelector('[data-venue-rate]')?.textContent || '').replace(/[^0-9]/g, '') || 0),
        services: bbVenueServices(venueName)
      };

      bbSetVenue(venue);
      bbSetEventContext({
        guests: Math.min(venue.capacity || 150, 150),
        eventType: bbGetEventContext().eventType || 'Wedding'
      });

      const next = button.dataset.next || '/prototype/customer/services.html';
      window.location.href = next;
    });
  });
});
