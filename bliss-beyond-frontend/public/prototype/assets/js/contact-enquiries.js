document.addEventListener('DOMContentLoaded', () => {
  const rows = document.querySelector('[data-contact-admin-rows]');
  const status = document.querySelector('[data-contact-admin-status]');
  const refresh = document.querySelector('[data-contact-admin-refresh]');
  if (!rows) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const showError = (message) => { status.className = 'alert alert-danger'; status.textContent = message; };
  const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
  const load = async () => {
    rows.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-ink-soft">Loading enquiries...</td></tr>';
    try {
      const enquiries = await bbFetchJson(window.bbApiUrl('/api/admin/contact-enquiries'), { headers: { Accept: 'application/json' } });
      if (!enquiries.length) { rows.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-ink-soft">No contact enquiries yet.</td></tr>'; return; }
      rows.innerHTML = enquiries.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>${item.phone ? `<br><span class="small text-ink-soft">${escapeHtml(item.phone)}</span>` : ''}</td><td>${escapeHtml(item.eventType || '-')}<br><span class="small text-ink-soft">${escapeHtml(item.preferredDate || '-')} · ${escapeHtml(item.guestCount || '-')} guests</span></td><td class="enquiry-message">${escapeHtml(item.message)}</td><td class="small">${escapeHtml(formatDate(item.createdAt))}</td><td><select class="form-select form-select-sm status-select" data-enquiry-status data-id="${item.id}" aria-label="Update status for enquiry ${item.id}"><option value="NEW" ${item.status === 'NEW' ? 'selected' : ''}>New</option><option value="IN_PROGRESS" ${item.status === 'IN_PROGRESS' ? 'selected' : ''}>In progress</option><option value="RESOLVED" ${item.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option></select></td></tr>`).join('');
    } catch (error) { rows.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-ink-soft">Unable to load enquiries.</td></tr>'; showError(error?.message || 'Unable to load contact enquiries.'); }
  };
  rows.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-enquiry-status]');
    if (!select) return;
    select.disabled = true;
    try { await bbFetchJson(window.bbApiUrl(`/api/admin/contact-enquiries/${encodeURIComponent(select.dataset.id)}/status`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: select.value }) }); }
    catch (error) { showError(error?.message || 'Unable to update enquiry status.'); await load(); }
    finally { select.disabled = false; }
  });
  refresh?.addEventListener('click', load);
  load();
});
