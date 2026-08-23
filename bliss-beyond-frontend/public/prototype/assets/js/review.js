document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const root = document.querySelector('[data-review-page]');
  if (!root) return;

  const venueEl = root.querySelector('[data-review-venue]');
  const typeEl = root.querySelector('[data-review-type]');
  const guestsEl = root.querySelector('[data-review-guests]');
  const servicesEl = root.querySelector('[data-review-services]');
  const cateringEl = root.querySelector('[data-review-catering]');

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
  if (guestsEl) guestsEl.textContent = `${Number(eventContext?.guests || 150).toLocaleString()} Guests`;

  if (servicesEl) {
    servicesEl.innerHTML = selectedServices.length
      ? selectedServices.map((item) => {
          const details = serviceData[item.id];
          const total = item.estimatedTotal || details?.estimatedTotal || 0;
          const sub = details?.summary?.foods || details?.options || [];
          return `<li><i class="bi bi-check2-circle"></i><span>${item.title}${sub.length ? `<small class="d-block text-ink-soft">${sub.join(' · ')}</small>` : ''}</span><strong>${total ? bbMoney(total) : ''}</strong></li>`;
        }).join('')
      : '<li class="text-ink-soft">No services selected yet.</li>';
  }

  if (cateringEl) {
    cateringEl.innerHTML = catering
      ? [
          `<li><span>Event type</span><strong>${catering.eventType || 'Wedding'}</strong></li>`,
          `<li><span>Guests</span><strong>${Number(catering.guestCount || 0).toLocaleString()}</strong></li>`,
          `<li><span>Catering style</span><strong>${catering.style || 'Buffet'}</strong></li>`,
          `<li><span>Cuisines</span><strong>${(catering.cuisines || []).length ? catering.cuisines.join(', ') : 'None selected'}</strong></li>`,
          `<li><span>Food</span><strong>${(catering.foods || []).length ? catering.foods.map((food) => food.name || food).join(', ') : 'None selected'}</strong></li>`,
          `<li><span>Add-ons</span><strong>${(catering.addons || []).length ? catering.addons.map((addon) => addon.name || addon).join(', ') : 'None selected'}</strong></li>`,
          `<li><span>Dietary requirements</span><strong>${(catering.dietary || []).length ? catering.dietary.join(', ') : 'None selected'}</strong></li>`,
          `<li><span>Estimated total</span><strong>${bbMoney(catering.estimatedTotal || 0)}</strong></li>`
        ].join('')
      : '<li class="text-ink-soft">No catering saved yet.</li>';
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
    const existing = panel.querySelector('[data-grand-total]');
    if (existing) existing.remove();
    const extra = document.createElement('div');
    extra.className = 'pricing-box mt-3';
    extra.dataset.grandTotal = 'true';
    const formatMmk = typeof bbFormatMmkDisplay === 'function' ? bbFormatMmkDisplay : bbMoney;
    extra.innerHTML = `${venueHire > 0 ? `<div class="pricing-row"><span>Estimated venue hire</span><strong class="bb-price">${formatMmk(venueHire)}</strong></div>` : ''}<div class="pricing-row"><span>Estimated Event Cost</span><strong class="bb-price">${bbMoney(grandTotal)}</strong></div>`;
    panel.appendChild(extra);
  }
});
