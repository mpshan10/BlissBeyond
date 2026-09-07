(function () {
  const API_BASE = window.BB_API_BASE_URL;

  function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
      .format(new Date(`${value}T00:00:00`));
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
      .format(new Date(`1970-01-01T${value}`));
  }

  function setStatus(element, message, kind) {
    element.textContent = message;
    const noticeKind = kind === 'danger' ? 'error' : kind;
    element.className = `col-12 alert bb-notice bb-notice--${noticeKind}`;
    element.setAttribute('aria-live', noticeKind === 'error' || noticeKind === 'warning' ? 'assertive' : 'polite');
  }

  function renderPlanners(select, planners) {
    select.replaceChildren(new Option('Select Planner', ''));
    planners.forEach((planner) => {
      select.appendChild(new Option(`${planner.name} - ${planner.specialty}`, planner.name));
    });
  }

  function renderSlots(container, slots, selectedStart) {
    container.replaceChildren();
    if (!slots.length) {
      container.innerHTML = '<span class="small text-ink-soft">No consultation times are available for this date.</span>';
      return;
    }
    slots.forEach((time) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn ${time === selectedStart ? 'btn-gold' : 'btn-outline-forest'} btn-sm`;
      button.dataset.consultationTime = time;
      button.textContent = formatTime(time);
      container.appendChild(button);
    });
  }

  function renderConsultations(list, consultations, selectedId) {
    list.replaceChildren();
    if (!consultations.length) {
      list.innerHTML = '<tr><td colspan="4" class="small text-ink-soft">No consultations booked yet.</td></tr>';
      return;
    }
    consultations.forEach((consultation) => {
      const row = document.createElement('tr');
      const planner = typeof consultation.planner === 'string' && consultation.planner.trim()
        ? consultation.planner
        : 'To be assigned';
      const selected = selectedId && String(consultation.id) === String(selectedId);
      row.dataset.consultationId = consultation.id;
      if (selected) {
        row.classList.add('table-warning');
        row.setAttribute('aria-current', 'true');
      }
      row.innerHTML = `<td>${formatDate(consultation.consultationDate)}<br><span class="small text-ink-soft">${formatTime(consultation.startTime)}</span></td>`
        + `<td>${consultation.consultationType}</td>`
        + `<td>${planner}</td>`
        + `<td><span class="status ${String(consultation.status || '').toLowerCase()}">${consultation.status}</span></td>`;
      list.appendChild(row);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('[data-consultation-form]');
    if (!form) return;
    if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

    const dateInput = form.querySelector('[name="consultationDate"]');
    const typeInput = form.querySelector('[name="consultationType"]');
    const plannerInput = form.querySelector('[name="planner"]');
    const notesInput = form.querySelector('[name="notes"]');
    const slotsEl = form.querySelector('[data-consultation-slots]');
    const submitButton = form.querySelector('[data-consultation-submit]');
    const statusEl = form.querySelector('[data-consultation-status]');
    const listEl = document.querySelector('[data-consultation-list]');
    const bookingContextEl = document.querySelector('[data-consultation-booking-context]');
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');
    const consultationId = params.get('id');
    let selectedStart = '';
    let activeConsultation = null;

    if (bookingId && bookingContextEl) {
      bookingContextEl.textContent = `Related booking: BK-${String(bookingId).padStart(4, '0')}`;
      bookingContextEl.classList.remove('d-none');
    }

    dateInput.min = new Date().toISOString().slice(0, 10);

    async function loadSlots() {
      selectedStart = '';
      if (!plannerInput.value || !dateInput.value) {
        slotsEl.innerHTML = '<span class="small text-ink-soft">Choose a planner and date to see available times.</span>';
        return;
      }
      slotsEl.innerHTML = '<span class="small text-ink-soft">Loading available times...</span>';
      try {
        const data = await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations/available-slots?date=${encodeURIComponent(dateInput.value)}&planner=${encodeURIComponent(plannerInput.value)}`);
        renderSlots(slotsEl, Array.isArray(data?.slots) ? data.slots : [], selectedStart);
      } catch (error) {
        slotsEl.innerHTML = '<span class="small text-danger">Unable to load consultation times.</span>';
      }
    }

    function applyActiveConsultationState() {
      const active = Boolean(activeConsultation);
      dateInput.disabled = active;
      submitButton.disabled = active;
      if (active) {
        selectedStart = '';
        slotsEl.replaceChildren();
      }
    }

    function resetConsultationForm() {
      form.reset();
      plannerInput.value = '';
      dateInput.value = '';
      notesInput.value = '';
      selectedStart = '';
      slotsEl.innerHTML = '<span class="small text-ink-soft">Choose a planner and date to see available times.</span>';
    }

    async function loadConsultations() {
      try {
        const data = await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations`);
        const consultations = Array.isArray(data) ? data : [];
        activeConsultation = consultations.find((item) => ['REQUESTED', 'SCHEDULED'].includes(item.status)) || null;
        const linked = consultationId
          ? consultations.find((item) => String(item.id) === String(consultationId))
          : bookingId ? consultations.find((item) => String(item.bookingId) === String(bookingId)) : null;
        if (linked && bookingContextEl) {
          const details = [linked.eventType, linked.venueName, linked.eventDate ? formatDate(linked.eventDate) : null].filter(Boolean).join(' | ');
          bookingContextEl.textContent = `Related booking: BK-${String(bookingId).padStart(4, '0')}${details ? ` | ${details}` : ''}`;
        }
        renderConsultations(listEl, consultations, consultationId);
        if (consultationId && linked) {
          const row = listEl.querySelector(`[data-consultation-id="${CSS.escape(String(consultationId))}"]`);
          row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        applyActiveConsultationState();
        if (!activeConsultation && dateInput.value) await loadSlots();
      } catch (error) {
        listEl.innerHTML = '<tr><td colspan="4" class="small text-danger">Unable to load consultations.</td></tr>';
      }
    }

    plannerInput.addEventListener('change', loadSlots);
    dateInput.addEventListener('change', loadSlots);
    slotsEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-consultation-time]');
      if (!button) return;
      selectedStart = button.dataset.consultationTime;
      slotsEl.querySelectorAll('[data-consultation-time]').forEach((item) => {
        item.classList.toggle('btn-gold', item === button);
        item.classList.toggle('btn-outline-forest', item !== button);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (activeConsultation) {
        return;
      }
      if (!plannerInput.value) {
        setStatus(statusEl, 'Please select a planner.', 'warning');
        return;
      }
      if (!dateInput.value || !selectedStart) {
        setStatus(statusEl, 'Please choose a date and available consultation time.', 'warning');
        return;
      }
      submitButton.disabled = true;
      setStatus(statusEl, 'Booking consultation. Please wait while we process your request.', 'info');
      try {
        await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationDate: dateInput.value,
            bookingId: bookingId ? Number(bookingId) : null,
            startTime: selectedStart,
            endTime: null,
            consultationType: typeInput.value,
            planner: plannerInput.value,
            notes: notesInput.value
          })
        });
        resetConsultationForm();
        setStatus(statusEl, 'Consultation booked. Your consultation request has been scheduled successfully.', 'success');
        await loadConsultations();
      } catch (error) {
        const message = error?.status === 409
          ? 'That consultation time is no longer available. Please choose another time.'
          : error?.status === 400
            ? (error.message || 'Please check your consultation details.')
            : 'Unable to book your consultation. Please try again.';
        setStatus(statusEl, message, 'danger');
      } finally {
        submitButton.disabled = false;
      }
    });

    try {
      const planners = await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations/planners`);
      renderPlanners(plannerInput, Array.isArray(planners) ? planners : []);
    } catch (error) {
      plannerInput.replaceChildren(new Option('Unable to load planners', ''));
      plannerInput.disabled = true;
      setStatus(statusEl, 'Unable to load planners. Please try again.', 'danger');
    }
    await loadConsultations();
  });
}());
