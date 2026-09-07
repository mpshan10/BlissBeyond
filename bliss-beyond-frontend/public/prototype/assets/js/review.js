document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const root = document.querySelector('[data-review-page]');
  if (!root) return;

  const venueEl = root.querySelector('[data-review-venue]');
  const typeEl = root.querySelector('[data-review-type]');
  const dateEl = root.querySelector('[data-review-date]');
  const timeEl = root.querySelector('[data-review-time]');
  const guestsEl = root.querySelector('[data-review-guests]');
  const servicesEl = root.querySelector('[data-review-services]');
  const escapeHtml = typeof bbEscapeHtml === 'function'
    ? bbEscapeHtml
    : (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));

  // Review Event is the custom-booking review step; stale package state must not win here.
  if (typeof window.bbSetBookingMode === 'function') window.bbSetBookingMode('CUSTOM');

  const markCustomBookingMode = () => {
    window.sessionStorage.setItem('bb_booking_mode', 'CUSTOM');
    if (typeof window.bbSetBookingMode === 'function') window.bbSetBookingMode('CUSTOM');
  };
  root.querySelectorAll('a[href="/prototype/customer/booking.html"]').forEach((link) => {
    link.addEventListener('click', markCustomBookingMode, { capture: true });
  });

  const venue = typeof bbGetVenue === 'function' ? bbGetVenue() : {};
  const eventContext = typeof bbRead === 'function' ? bbRead('bb_event_context') || {} : {};
  const eventGuestCount = Number(eventContext?.guests ?? eventContext?.guestCount);
  const storedSelectedServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
  const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};
  const storedCatering = typeof bbGetCatering === 'function' ? bbGetCatering() || serviceData.catering || null : serviceData.catering || null;
  const catering = typeof window.bbNormalizeCateringGuestCount === 'function'
    ? window.bbNormalizeCateringGuestCount(storedCatering, eventGuestCount, true)
    : storedCatering;
  const isGenuineService = (item) => typeof bbHasGenuineServiceSelection === 'function'
    && bbHasGenuineServiceSelection(item, item?.id === 'catering' ? (catering || serviceData[item.id] || {}) : (serviceData[item.id] || {}));
  const selectedServices = storedSelectedServices.filter(isGenuineService);
  const displayServiceItems = selectedServices.filter((item) => item?.id).slice();
  if (catering
    && isGenuineService({ id: 'catering', estimatedTotal: catering.estimatedTotal })
    && !displayServiceItems.some((item) => item.id === 'catering')) {
    displayServiceItems.unshift({
      id: 'catering',
      title: 'Catering',
      estimatedTotal: catering.estimatedTotal
    });
  }

  if (venueEl) venueEl.textContent = venue?.name || 'Selected venue';
  if (typeEl) typeEl.textContent = eventContext?.eventType || 'Wedding';
  if (dateEl) dateEl.textContent = eventContext?.eventDate
    ? (typeof bbFormatDateDisplay === 'function' ? bbFormatDateDisplay(eventContext.eventDate) : eventContext.eventDate)
    : 'Date not selected';
  if (timeEl) {
    const start = eventContext?.startTime || eventContext?.eventTime || '';
    const end = eventContext?.endTime || '';
    const formatTime = typeof bbFormatTimeDisplay === 'function' ? bbFormatTimeDisplay : (value) => value;
    timeEl.textContent = start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time not selected';
  }
  if (guestsEl) guestsEl.textContent = Number.isInteger(eventGuestCount) && eventGuestCount > 0
    ? `${eventGuestCount.toLocaleString()} Guests`
    : 'Guests not selected';

  if (servicesEl) {
    servicesEl.innerHTML = displayServiceItems.length
      ? displayServiceItems.map((item) => {
        const details = item.id === 'catering' ? (catering || {}) : (serviceData[item.id] || {});
        const total = Number(item.id === 'catering'
          ? (details.estimatedTotal ?? item.estimatedTotal ?? 0)
          : (item.estimatedTotal ?? details.estimatedTotal ?? 0));
        const itemName = (value) => typeof value === 'object' && value !== null
          ? value.name || value.label || value.title
          : value;
        const sub = item.id === 'catering'
          ? [
              itemName(details.style),
              ...(Array.isArray(details.foods) ? details.foods.map(itemName) : []),
              ...(Array.isArray(details.addons) ? details.addons.map(itemName) : [])
            ].map((value) => String(value || '').trim()).filter(Boolean)
          : (() => {
              const source = details.summary?.foods || details.options || details.selections || details.summary || [];
              return (Array.isArray(source) ? source.map(itemName) : [source])
                .map((value) => String(value || '').trim())
                .filter(Boolean);
            })();
        const detailHtml = sub.length ? `<small>${escapeHtml(sub.join(' · '))}</small>` : '';
        return `<li class="review-service-row"><i class="bi bi-check2-circle review-service-row__icon" aria-hidden="true"></i><span class="review-service-row__info"><strong>${escapeHtml(item.title || item.id)}</strong>${detailHtml}</span><strong class="review-service-row__price">${escapeHtml(total ? bbMoney(total) : 'MMK 0')}</strong></li>`;
      }).join('')
      : '<li class="text-ink-soft">No services selected yet.</li>';
  }

  const totals = [];
  const venueHire = Number(venue?.price ?? venue?.rate ?? 0);
  if (venueHire > 0) totals.push(venueHire);
  if (isGenuineService({ id: 'catering', estimatedTotal: catering?.estimatedTotal }, catering || {})) {
    totals.push(Number(catering?.estimatedTotal || 0));
  }
  selectedServices.forEach((item) => {
    if (item.id !== 'catering' && item.estimatedTotal) totals.push(Number(item.estimatedTotal));
  });
  const grandTotal = totals.reduce((sum, value) => sum + Number(value || 0), 0);

  const panel = root.querySelector('.workflow-summary .panel__body');
  if (panel) {
    panel.querySelector('[data-grand-total]')?.remove();
    const extra = document.createElement('div');
    extra.className = 'pricing-box mt-3';
    extra.dataset.grandTotal = 'true';
    const formatMmk = typeof bbFormatMmkDisplay === 'function' ? bbFormatMmkDisplay : bbMoney;
    extra.innerHTML = `${venueHire > 0 ? `<div class="pricing-row"><span>Estimated venue hire</span><strong class="bb-price">${formatMmk(venueHire)}</strong></div>` : ''}<div class="pricing-row"><span>Estimated Event Cost</span><strong class="bb-price">${bbMoney(grandTotal)}</strong></div>`;
    panel.appendChild(extra);
  }
});
