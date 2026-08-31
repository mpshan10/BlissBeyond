document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const submitButton = form.querySelector('[data-contact-submit]');
  const status = form.querySelector('[data-contact-status]');

  const showStatus = (message, type) => {
    status.className = `col-12 alert alert-${type} mt-2`;
    status.textContent = message;
  };

  const redirectToLogin = () => {
    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.bbSetAuthReturnUrl?.(returnUrl);
    window.location.href = `/prototype/login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const authToken = window.bbGetAuthToken?.();
  if (!authToken) {
    showStatus('Please sign in to send an enquiry.', 'info');
  } else {
    void (async () => {
      try {
        const profile = await window.bbGetCustomerProfile?.();
        if (!profile) return;
        if (nameInput) {
          nameInput.value = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
          nameInput.readOnly = true;
        }
        if (emailInput) {
          emailInput.value = profile.email || '';
          emailInput.readOnly = true;
        }
      } catch (error) {
        showStatus('Please sign in again before sending an enquiry.', 'danger');
      }
    })();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.bbGetAuthToken?.()) {
      redirectToLogin();
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const values = new FormData(form);
    const guestValue = String(values.get('guestCount') || '').trim();
    const payload = {
      name: String(values.get('name') || '').trim(),
      email: String(values.get('email') || '').trim(),
      phone: String(values.get('phone') || '').trim() || null,
      eventType: String(values.get('eventType') || '').trim() || null,
      preferredDate: String(values.get('preferredDate') || '').trim() || null,
      guestCount: guestValue ? Number(guestValue) : null,
      message: String(values.get('message') || '').trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    status.classList.add('d-none');

    try {
      await bbFetchJson(window.bbApiUrl('/api/contact-enquiries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      showStatus('Thank you! Your enquiry has been received. Our planning team will contact you soon.', 'success');
    } catch (error) {
      showStatus(error?.message || 'We could not send your enquiry. Please try again.', 'danger');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send enquiry';
      status.classList.remove('d-none');
    }
  });
});
