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
  const continueBtn = root.querySelector('[data-continue-review]');
  const saveBtn = root.querySelector('[data-save-services]');

  const eventContext = typeof bbGetEventContext === 'function' ? bbGetEventContext() : {};
  const venue = typeof bbGetVenue === 'function' ? bbGetVenue() : {};
  const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};
  const venueAllowedServices = Array.isArray(venue?.services) && venue.services.length
    ? venue.services
    : ['catering', 'decoration', 'photography', 'entertainment', 'lighting-av', 'cake', 'florals'];
  const backendCatalog = new Map();
  let backendLoaded = false;

  if (venueEl) venueEl.textContent = venue?.name || 'Selected venue';
  if (typeEl) typeEl.textContent = eventContext?.eventType || 'Wedding';
  if (dateEl) dateEl.textContent = eventContext?.eventDate || '20 December 2026';
  if (guestsEl) guestsEl.textContent = `${Number(eventContext?.guests || 150).toLocaleString()} Guests`;

  const serviceCards = [...root.querySelectorAll('[data-service-card]')];
  const toggles = [...root.querySelectorAll('[data-service-toggle]')];

  const getBackendId = (card) => card.dataset.backendServiceId || '';

  const formatPrice = (value, perGuest = false) => {
    const amount = Number(value || 0);
    const formatted = Math.round(amount).toLocaleString('en-US');
    return perGuest ? `From ${formatted} MMK / guest` : `From ${formatted} MMK`;
  };

  const applyCardAvailability = (card, available) => {
    const toggle = card.querySelector('[data-service-toggle]');
    const customize = card.querySelector('a[href*="/prototype/customer/"]');
    const shouldAllow = Boolean(available && (venueAllowedServices.includes(card.dataset.serviceId)));
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
    const backendId = getBackendId(card);
    const record = backendCatalog.get(backendId);
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
      const backendId = getBackendId(card);
      const record = backendCatalog.get(backendId);
      if (backendLoaded && record) {
        applyBackendDataToCard(card);
      } else {
        const fallbackAllowed = venueAllowedServices.includes(card.dataset.serviceId);
        applyCardAvailability(card, fallbackAllowed);
      }
    });
  };

  const refreshSelectionState = () => {
    serviceCards.forEach((card) => {
      const id = card.dataset.serviceId;
      const checked = toggles.some((input) => input.value === id && input.checked);
      card.classList.toggle('selected', checked);
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
          <li>
            <span><i class="bi bi-check2-circle"></i>${item.title}</span>
            <span class="d-flex align-items-center gap-2">
              <strong>${item.estimatedTotal ? bbMoney(item.estimatedTotal) : ''}</strong>
              <button class="btn btn-link btn-sm p-0 text-gold" type="button" data-service-remove="${item.id}">Remove</button>
            </span>
          </li>`).join('')
        : '<li class="text-ink-soft">No services selected yet.</li>';
    }

    if (totalEl) {
      const total = selected.reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0);
      totalEl.textContent = bbMoney(total);
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

  const current = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
  toggles.forEach((input) => {
    input.checked = current.some((item) => item.id === input.value);
  });

  sync();

  const loadCatalog = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/services', {
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

  continueBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    persist();
    if (typeof window.bbSetBookingMode === 'function') window.bbSetBookingMode('CUSTOM');
    window.location.href = '/prototype/customer/review.html';
  });

  summaryEl?.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-service-remove]');
    if (!remove) return;
    const serviceId = remove.dataset.serviceRemove;
    const toggle = toggles.find((input) => input.value === serviceId);
    if (toggle) {
      toggle.checked = false;
      persist();
    }
  });

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
