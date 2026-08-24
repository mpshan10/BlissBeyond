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
    element.className = `col-12 alert alert-${kind}`;
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

  function renderConsultations(list, consultations) {
    list.replaceChildren();
    if (!consultations.length) {
      list.innerHTML = '<tr><td colspan="4" class="small text-ink-soft">No consultations booked yet.</td></tr>';
      return;
    }
    consultations.forEach((consultation) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${formatDate(consultation.consultationDate)}<br><span class="small text-ink-soft">${formatTime(consultation.startTime)}</span></td>`
        + `<td>${consultation.consultationType}</td>`
        + `<td>${consultation.planner || 'To be assigned'}</td>`
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
    let selectedStart = '';
    let activeConsultation = null;

    dateInput.min = new Date().toISOString().slice(0, 10);

    async function loadSlots() {
      selectedStart = '';
      if (!dateInput.value) {
        slotsEl.innerHTML = '<span class="small text-ink-soft">Choose a date to see available times.</span>';
        return;
      }
      slotsEl.innerHTML = '<span class="small text-ink-soft">Loading available times...</span>';
      try {
        const data = await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations/available-slots?date=${encodeURIComponent(dateInput.value)}`);
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

    async function loadConsultations() {
      try {
        const data = await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations`);
        const consultations = Array.isArray(data) ? data : [];
        activeConsultation = consultations.find((item) => ['REQUESTED', 'SCHEDULED'].includes(item.status)) || null;
        renderConsultations(listEl, consultations);
        applyActiveConsultationState();
        if (!activeConsultation && dateInput.value) await loadSlots();
      } catch (error) {
        listEl.innerHTML = '<tr><td colspan="4" class="small text-danger">Unable to load consultations.</td></tr>';
      }
    }

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
      if (!dateInput.value || !selectedStart) {
        setStatus(statusEl, 'Please choose a date and available consultation time.', 'warning');
        return;
      }
      submitButton.disabled = true;
      setStatus(statusEl, 'Booking consultation...', 'info');
      try {
        await bbFetchCustomerJson(`${API_BASE}/api/customer/consultations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationDate: dateInput.value,
            startTime: selectedStart,
            endTime: null,
            consultationType: typeInput.value,
            planner: plannerInput.value || null,
            notes: notesInput.value
          })
        });
        setStatus(statusEl, 'Your consultation has been scheduled.', 'success');
        await loadConsultations();
        await loadSlots();
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

    await loadConsultations();
  });
}());
