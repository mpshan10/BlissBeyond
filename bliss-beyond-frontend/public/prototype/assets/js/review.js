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
  const eventContext = typeof bbGetEventContext === 'function' ? bbGetEventContext() : {};
  const selectedServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
  const catering = typeof bbGetCatering === 'function' ? bbGetCatering() : null;
  const serviceData = typeof bbGetServiceData === 'function' ? bbGetServiceData() : {};

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
  if (guestsEl) guestsEl.textContent = `${Number(eventContext?.guests || 150).toLocaleString()} Guests`;

  if (servicesEl) {
    servicesEl.innerHTML = selectedServices.length
      ? selectedServices.map((item) => {
        const details = serviceData[item.id] || {};
        const total = Number(item.estimatedTotal || details.estimatedTotal || 0);
        const source = details.summary?.foods || details.options || details.selections || details.summary || [];
        const sub = Array.isArray(source)
          ? source.map((value) => value?.name || value?.label || value?.title || value).filter(Boolean)
          : [source].filter(Boolean);
        const detailHtml = sub.length ? `<small>${escapeHtml(sub.join(' · '))}</small>` : '';
        return `<li class="review-service-row"><i class="bi bi-check2-circle review-service-row__icon" aria-hidden="true"></i><span class="review-service-row__info"><strong>${escapeHtml(item.title || item.id)}</strong>${detailHtml}</span><strong class="review-service-row__price">${escapeHtml(total ? bbMoney(total) : 'MMK 0')}</strong></li>`;
      }).join('')
      : '<li class="text-ink-soft">No services selected yet.</li>';
  }

  const totals = [];
  const venueHire = Number(venue?.price ?? venue?.rate ?? 0);
  if (venueHire > 0) totals.push(venueHire);
  if (catering?.estimatedTotal) totals.push(Number(catering.estimatedTotal));
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
