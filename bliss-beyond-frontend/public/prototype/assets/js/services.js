document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const root = document.querySelector('[data-services-page]');
  if (!root) return;

  const venueEl = root.querySelector('[data-event-venue]');
  const typeEl = root.querySelector('[data-event-type]');
  const dateEl = root.querySelector('[data-event-date]');
  const guestsEl = root.querySelector('[data-event-guests]');
  const summaryEl = root.querySelector('[data-services-summary]');
  const totalEl = root.querySelector('[data-services-total]');
  const countEls = [...root.querySelectorAll('[data-selected-count]')];
  const continueBtns = [...root.querySelectorAll('[data-continue-review]')];
  const saveBtn = root.querySelector('[data-save-services]');
  const dateStatus = root.querySelector('[data-services-date-status]');

  const eventContext = typeof bbGetEventContext === 'function' ? bbGetEventContext() : {};
  const venue = typeof bbGetVenue === 'function' ? bbGetVenue() : {};
  const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};
  const currentGuestCount = Number(eventContext?.guests || eventContext?.guestCount || 0);
  const savedCatering = typeof bbGetCatering === 'function' ? bbGetCatering() : null;
  let currentServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];

  // Catering totals are guest-dependent, so discard only stale catering work.
  if (savedCatering && Number(savedCatering.guestCount || 0) !== currentGuestCount) {
    if (typeof bbSetCatering === 'function') bbSetCatering(null);
    serviceData.catering = null;
    currentServices = currentServices.filter((item) => item.id !== 'catering');
    if (typeof bbSetSelectedServices === 'function') bbSetSelectedServices(currentServices);
    if (typeof bbSetServiceData === 'function') bbSetServiceData('catering', null);
  }
  const venueAllowedServices = Array.isArray(venue?.services) && venue.services.length
    ? venue.services
    : ['catering', 'decoration', 'photography', 'entertainment', 'lighting-av', 'cake', 'florals'];
  const backendCatalog = new Map();
  let backendLoaded = false;

  const formatDate = (value) => {
    if (!value) return 'Not selected';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };
  const formatTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return '';
    const [hour, minute] = String(value).split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  const startTime = eventContext?.startTime || eventContext?.eventTime || '';
  const endTime = eventContext?.endTime || '';
  const eventDate = eventContext?.eventDate || eventContext?.date || '';
  const dateIsValid = typeof bbIsValidBookingDate !== 'function' || bbIsValidBookingDate(eventDate);
  if (!dateIsValid && dateStatus) {
    dateStatus.textContent = 'Your selected event date no longer meets the one-month advance booking requirement. Please return to Venue Selection and choose a new date.';
    dateStatus.classList.remove('d-none');
  }
  if (venueEl) venueEl.textContent = venue?.name || 'Selected venue';
  if (typeEl) typeEl.textContent = eventContext?.eventType || eventContext?.type || 'Not selected';
  if (dateEl) dateEl.textContent = formatDate(eventContext?.eventDate || eventContext?.date);
  const timeEl = root.querySelector('[data-event-time]');
  if (timeEl) timeEl.textContent = startTime && endTime
    ? `${formatTime(startTime)} - ${formatTime(endTime)}`
    : 'Not selected';
  if (guestsEl) guestsEl.textContent = currentGuestCount > 0 ? `${currentGuestCount.toLocaleString()} Guests` : 'Not selected';

  const serviceCards = [...root.querySelectorAll('[data-service-card]')];
  const toggles = [...root.querySelectorAll('[data-service-toggle]')];

  const serviceNamesByKey = {
    catering: 'Catering',
    decoration: 'Decoration & Styling',
    photography: 'Photography & Videography',
    entertainment: 'Entertainment',
    'lighting-av': 'Lighting & AV',
    cake: 'Cake & Desserts',
    florals: 'Floral Design'
  };

  const getBackendRecord = (card) => {
    const key = card.dataset.serviceId || '';
    const expectedName = serviceNamesByKey[key];
    return [...backendCatalog.values()].find((record) =>
      expectedName && String(record.name || '').trim().toLowerCase() === expectedName.toLowerCase()
    ) || backendCatalog.get(card.dataset.backendServiceId || '');
  };

  const formatPrice = (value, perGuest = false) => {
    const amount = Number(value || 0);
    const formatted = Math.round(amount).toLocaleString('en-US');
    return perGuest ? `From ${formatted} MMK / guest` : `From ${formatted} MMK`;
  };

  const applyCardAvailability = (card, available) => {
    const toggle = card.querySelector('[data-service-toggle]');
    const customize = card.querySelector('a[href*="/prototype/customer/"]');
    const shouldAllow = Boolean(available && (venueAllowedServices.includes(card.dataset.serviceId)));
    card.classList.toggle('d-none', !shouldAllow);
    card.classList.toggle('is-unavailable', !shouldAllow);
    if (toggle) {
      toggle.disabled = !shouldAllow;
      if (!shouldAllow) toggle.checked = false;
    }
    if (customize) {
      customize.classList.toggle('disabled', !shouldAllow);
      customize.setAttribute('aria-disabled', shouldAllow ? 'false' : 'true');
      customize.tabIndex = shouldAllow ? 0 : -1;
    }
    card.dataset.catalogAvailable = shouldAllow ? 'true' : 'false';
  };

  const applyBackendDataToCard = (card) => {
    const record = getBackendRecord(card);
    const titleEl = card.querySelector('.service-card__title');
    const metaEl = card.querySelector('.service-card__meta');
    const descEl = card.querySelector('.service-card__body p.small.text-ink-soft.mb-3');
    const priceEl = card.querySelector('.service-card__body strong.text-gold');
    const toggle = card.querySelector('[data-service-toggle]');
    const isCatering = card.dataset.serviceId === 'catering';

    if (!record) {
      applyCardAvailability(card, false);
      return;
    }

    if (metaEl) metaEl.textContent = record.name || metaEl.textContent;
    if (titleEl) titleEl.textContent = record.name || titleEl.textContent;
    if (descEl) descEl.textContent = record.description || descEl.textContent;
    if (priceEl) priceEl.textContent = formatPrice(record.basePrice, isCatering);
    if (toggle) {
      toggle.dataset.label = record.name || toggle.dataset.label;
      toggle.disabled = !(record.available && venueAllowedServices.includes(card.dataset.serviceId));
    }

    applyCardAvailability(card, record.available);
  };

  const syncCards = () => {
    serviceCards.forEach((card) => {
      const record = getBackendRecord(card);
      if (backendLoaded && record) {
        applyBackendDataToCard(card);
      } else {
        applyCardAvailability(card, false);
      }
    });
  };

  const refreshSelectionState = () => {
    serviceCards.forEach((card) => {
      const id = card.dataset.serviceId;
      const checked = toggles.some((input) => input.value === id && input.checked);

    });
  };

  const sync = () => {
    const selected = toggles.filter((input) => input.checked).map((input) => ({
      id: input.value,
      title: input.dataset.label || input.value,
      estimatedTotal: serviceData[input.value]?.estimatedTotal || 0
    }));

    if (summaryEl) {
      summaryEl.innerHTML = selected.length
        ? selected.map((item) => `
          <li class="service-summary-row">
            <span class="service-summary-name"><i class="bi bi-check2-circle"></i>${item.title}</span>
            <span class="service-summary-price"><strong>${item.estimatedTotal ? bbMoney(item.estimatedTotal) : ''}</strong></span>
          </li>`).join('')
        : '<li class="text-ink-soft">No services selected yet.</li>';
    }

    if (totalEl) {
      const total = selected.reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0);
      totalEl.textContent = typeof bbFormatMmkDisplay === 'function'
        ? bbFormatMmkDisplay(total)
        : `MMK ${Math.round(total).toLocaleString()}`;
    }

    countEls.forEach((el) => {
      el.textContent = selected.length ? `${selected.length} Services Selected` : '0 Services Selected';
    });

    refreshSelectionState();

    return selected;
  };

  const persist = () => {
    const selected = sync();
    if (typeof bbSetSelectedServices === 'function') {
      bbSetSelectedServices(selected);
    }
    return selected;
  };

  toggles.forEach((input) => {
    input.addEventListener('change', persist);
  });

  const current = currentServices;
  toggles.forEach((input) => {
    input.checked = current.some((item) => item.id === input.value);
  });

  sync();

  const loadCatalog = async () => {
    try {
      const response = await fetch(window.bbApiUrl('/api/services'), {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const catalog = await response.json();
      backendCatalog.clear();
      catalog.forEach((item) => {
        backendCatalog.set(String(item.id), item);
      });
      backendLoaded = true;
      syncCards();
      sync();
    } catch (error) {
      console.error('Service catalog unavailable; using the existing page fallback.');
      backendLoaded = false;
      syncCards();
      sync();
    }
  };

  loadCatalog();

  saveBtn?.addEventListener('click', () => {
    persist();
    saveBtn.textContent = 'Services Saved';
    window.setTimeout(() => {
      saveBtn.textContent = 'Save Services';
    }, 1200);
  });

  continueBtns.forEach((continueBtn) => continueBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (!dateIsValid) return;
    persist();
    if (typeof window.bbSetBookingMode === 'function') window.bbSetBookingMode('CUSTOM');
    window.location.href = '/prototype/customer/review.html';
  }));

  const venueSummary = root.querySelector('[data-event-venue]');
  const serviceSummary = root.querySelector('[data-services-summary]');
  if (venueSummary && venue?.services) {
    venueSummary.title = `Available services: ${venue.services.join(', ')}`;
  }
  if (serviceSummary) {
    const available = venueAllowedServices.map((id) => id.replace('-', ' '));
    serviceSummary.dataset.available = available.join(',');
  }
});
