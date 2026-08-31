document.addEventListener('DOMContentLoaded', () => {
  const editButton = document.querySelector('[data-booking-edit-event-type]');
  if (!editButton) return;

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'bookingEventTypeModal';
  modal.tabIndex = -1;
  modal.setAttribute('aria-labelledby', 'bookingEventTypeModalTitle');
  modal.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h4" id="bookingEventTypeModalTitle">Edit Event Type</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><fieldset><legend class="form-label">Choose event type</legend><div class="d-grid gap-2">${['Wedding', 'Engagement', 'Corporate', 'Graduation', 'Anniversary', 'Birthday'].map((type) => `<label class="event-type-option"><input type="radio" name="bookingEventType" value="${type}"> <span>${type}</span></label>`).join('')}</div></fieldset></div><div class="modal-footer"><button type="button" class="btn btn-outline-forest" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-gold" data-booking-save-event-type>Save Changes</button></div></div></div>`;
  document.body.append(modal);

  const getStoredEvent = () => {
    try { return JSON.parse(window.sessionStorage.getItem('bb_event_context') || 'null') || {}; } catch (error) { return {}; }
  };
  editButton.addEventListener('click', () => {
    const current = getStoredEvent().eventType || '';
    modal.querySelectorAll('input[name="bookingEventType"]').forEach((input) => { input.checked = input.value === current; });
    bootstrap.Modal.getOrCreateInstance(modal).show();
  });
  modal.querySelector('[data-booking-save-event-type]').addEventListener('click', () => {
    const selected = modal.querySelector('input[name="bookingEventType"]:checked')?.value;
    if (!selected) return;
    window.bbSetEventContext?.({ eventType: selected });
    const display = document.querySelector('[data-booking-event-type-display]');
    if (display) display.textContent = selected;
    bootstrap.Modal.getOrCreateInstance(modal).hide();
  });
});
