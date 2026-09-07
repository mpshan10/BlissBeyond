(function () {
  'use strict';

  const apiUrl = (path) => typeof window.bbApiUrl === 'function'
    ? window.bbApiUrl(path)
    : `${window.bbApiUrl || ''}${path}`;
  const escapeHtml = window.bbCateringEscapeHtml || ((value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char])));
  const addonImages = {
    'soft-drinks-package': '/prototype/assets/img/catering10.jpg',
    'fresh-juice-package': '/prototype/assets/img/catering11.jpg',
    'mocktail-package': '/prototype/assets/img/catering12.jpg',
    'premium-beverage-package': '/prototype/assets/img/catering13.jpg',
    'coffee-tea-package': '/prototype/assets/img/catering14.jpg',
    'dessert-station': '/prototype/assets/img/catering15.jpg',
    'premium-dessert-bar': '/prototype/assets/img/catering16.jpg',
    'chocolate-fountain': '/prototype/assets/img/catering17.jpg',
    'mini-pastries': '/prototype/assets/img/catering18.jpg',
    'macaron-station': '/prototype/assets/img/catering19.jpg',
    'ice-cream-station': '/prototype/assets/img/catering20.jpg',
    'live-chef-station': '/prototype/assets/img/catering21.jpg',
    'sushi-station': '/prototype/assets/img/catering22.jpg',
    'carving-station': '/prototype/assets/img/catering23.jpg',
    'cheese-board': '/prototype/assets/img/catering24.jpg',
    'seafood-station': '/prototype/assets/img/catering25.jpg',
    'late-night-snack-station': '/prototype/assets/img/catering26.jpg',
    'mohinga-station': '/prototype/assets/img/catering27.jpg',
    'shan-noodle-station': '/prototype/assets/img/catering28.jpg',
    'traditional-snack-station': '/prototype/assets/img/catering29.jpg',
    'traditional-dessert-station': '/prototype/assets/img/catering30.jpg'
  };

  let addonPromise;
  const includedItemsPromises = new Map();
  const formatPrice = (addon) => `${Number(addon?.price || 0).toLocaleString('en-US')} MMK${addon?.billingType === 'PER_GUEST' ? ' / guest' : ''}`;

  async function loadAddons() {
    addonPromise ||= fetch(apiUrl('/api/addons'), { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load catering add-ons.');
        return response.json();
      });
    return addonPromise;
  }

  async function loadIncludedItems(addonId) {
    if (!includedItemsPromises.has(addonId)) {
      const url = apiUrl(`/api/addons/${encodeURIComponent(addonId)}/included-items`);
      const request = window.bbFetchCustomerJson || window.bbFetchJson;
      includedItemsPromises.set(addonId, request(url, { method: 'GET' }));
    }
    return includedItemsPromises.get(addonId);
  }

  function addonForInput(input, addons, card) {
    const id = Number(input?.dataset.backendAddonId || 0);
    const cardName = card?.querySelector('strong')?.textContent?.trim();
    return addons.find((addon) => Number(addon.id) === id)
      || addons.find((addon) => addon.name === input?.dataset.addonName)
      || addons.find((addon) => addon.name === cardName);
  }

  function bodyHtml(addon, items) {
    const content = items.length
      ? `<ul class="catering-modal-items">${items.map((item) => `<li>${escapeHtml(item.name)}</li>`).join('')}</ul>`
      : '<p class="small text-ink-soft mb-0">Included details are temporarily unavailable.</p>';
    return `<section class="catering-modal-category">
      <div class="catering-modal-category__head"><i class="bi bi-circle-fill" aria-hidden="true"></i><h6 class="catering-modal-category__title">Included Items</h6></div>
      <p class="small text-ink-soft mb-3">${escapeHtml(addon.description || '')}</p>
      ${content}
    </section>`;
  }

  async function openAddon(input, addon) {
    const openModal = window.bbCateringModalAPI?.open;
    if (!openModal) return;
    const items = await loadIncludedItems(addon.id);
    openModal({
      kind: 'addon', value: input.value, kicker: 'Add-on Details', title: addon.name,
      description: addon.description || '', price: formatPrice(addon), metaLabel: 'Add-on', metaValue: addon.name,
      image: addonImages[input.value] || '/prototype/assets/img/catering.jpg', imageAlt: addon.name,
      bodyHtml: bodyHtml(addon, items), chooseText: 'Choose This Option'
    });
  }

  async function enhanceAddonCards() {
    const addons = await loadAddons();
    document.querySelectorAll('[data-addon-card]').forEach((card) => {
      const input = card.querySelector('[data-addon]');
      const addon = addonForInput(input, addons, card);
      if (!input || !addon) return;
      input.dataset.backendAddonId = addon.id;
      input.dataset.addonName = addon.name;
      const description = card.querySelector('.small.text-ink-soft');
      if (description) description.textContent = addon.description || '';
      const price = [...card.querySelectorAll('.text-gold')].find((element) => element.textContent.includes('MMK'));
      if (price) price.textContent = formatPrice(addon);
      card.parentElement?.querySelectorAll(`.addon-explore-btn[data-button-key="addon-explore-${input.value}"]`).forEach((button) => button.remove());
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn btn-outline-forest btn-sm w-100 addon-explore-btn';
      button.dataset.buttonKey = `addon-explore-${input.value}`; button.dataset.addonExplore = input.value; button.textContent = 'Explore';
      button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        openAddon(input, addon).catch(() => window.bbShowToast?.('Included details could not be loaded.', 'error'));
      });
      card.appendChild(button);
    });
  }

  async function renderDetailPage(addonKey, addons) {
    const input = [...document.querySelectorAll('[data-addon]')].find((candidate) => candidate.value === addonKey);
    const addon = addonForInput(input, addons, input?.closest('[data-addon-card]')) || addons.find((candidate) => candidate.name === addonKey);
    const main = document.querySelector('[data-catering-page]');
    if (!addon || !main) return;
    const items = await loadIncludedItems(addon.id);
    main.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><span class="eyebrow">Enhance Your Catering Details</span><h1 class="h2 mt-1 mb-1">${escapeHtml(addon.name)}</h1><p class="text-ink-soft mb-0">${escapeHtml(addon.description || '')}</p></div><button class="btn btn-outline-forest" type="button" id="backFromAddon"><i class="bi bi-arrow-left me-1"></i> Back to Catering</button></div>
      <div class="row g-4"><div class="col-lg-12"><div class="panel addon-detail-compact"><div class="panel__head"><h4 class="mb-0">What's Included</h4><span class="bb-badge gold">Package Details</span></div><div class="panel__body"><p class="small text-ink-soft addon-detail-intro">This package includes the following items for your event.</p><div class="addon-detail-items"><h6>Included Items</h6>${items.length ? `<ul class="small text-ink-soft mb-0">${items.map((item) => `<li>${escapeHtml(item.name)}</li>`).join('')}</ul>` : '<p class="small text-ink-soft mb-0">Included details are temporarily unavailable.</p>'}</div></div></div></div></div>
      <div class="d-flex flex-wrap gap-2 justify-content-end mt-4"><button class="btn btn-outline-forest" type="button" id="backFromAddonBottom">Back</button><button class="btn btn-gold" type="button" id="chooseAddonFromDetails">Add ${escapeHtml(addon.name)}</button></div>`;
    const back = () => { const url = new URL(window.location.href); url.searchParams.delete('addon'); window.location.href = url.toString(); };
    document.getElementById('backFromAddon')?.addEventListener('click', back);
    document.getElementById('backFromAddonBottom')?.addEventListener('click', back);
    document.getElementById('chooseAddonFromDetails')?.addEventListener('click', () => { if (input && !input.checked) input.click(); back(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAddons().then(async (addons) => {
      await enhanceAddonCards();
      const addonKey = new URLSearchParams(window.location.search).get('addon');
      if (addonKey) await renderDetailPage(addonKey, addons);
      document.querySelectorAll('[data-addon-group]').forEach((container) => new MutationObserver(() => enhanceAddonCards()).observe(container, { childList: true }));
    }).catch(() => {});
  });
}());
