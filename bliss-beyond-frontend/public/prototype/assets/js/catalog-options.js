(function () {
  const page = document.body?.dataset.catalogService;
  if (!page) return;
  const selectors = { decoration: '[data-decoration-option]', photography: '[data-photo-option]', entertainment: '[data-ent-option]', 'lighting-av': '[data-price-input]', cake: '[data-price-input]', florals: '[data-price-input]' };
  const selector = selectors[page];
  if (!selector) return;
  const keyFor = (input) => input.dataset.decorationId || input.dataset.photoId || input.dataset.entId || input.id?.replace(/^cake-choice-/, '') || input.id || input.dataset.label || input.value;
  const cardFor = (input) => input.closest('.choice-card, .food-card, .decoration-theme-card, .decoration-option-card, .av-package, .option-card, label') || input.parentElement;
  const setCardVisibility = (card, visible) => {
    if (!card) return;
    card.hidden = !visible;
    card.classList.toggle('d-none', !visible);
    if (visible) {
      card.style.removeProperty('display');
      card.removeAttribute('aria-hidden');
    } else {
      // Service cards use page-specific !important display rules.
      card.style.setProperty('display', 'none', 'important');
      card.setAttribute('aria-hidden', 'true');
    }
  };
  const money = (value) => `${Number(value || 0).toLocaleString('en-US')} MMK`;
  fetch(window.bbApiUrl(`/api/services/key/${encodeURIComponent(page)}/options`), { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((options) => {
      const availableOptions = options.filter((option) => option && option.available === true);
      const byKey = new Map(availableOptions.map((option) => [String(option.optionKey), option]));
      document.querySelectorAll(selector).forEach((input) => {
        const option = byKey.get(String(keyFor(input)));
        const card = cardFor(input);
        if (!option) {
          input.checked = false;
          input.disabled = true;
          input.tabIndex = -1;
          setCardVisibility(card, false);
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        setCardVisibility(card, true);
        input.dataset.backendCatalogOptionId = String(option.id);
        input.dataset.price = String(option.price || 0);
        input.disabled = false;
        input.removeAttribute('tabindex');
        const price = card?.querySelector('.text-gold, [data-option-price]');
        if (price && Number(option.price) > 0) price.textContent = money(option.price);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      document.body.dataset.catalogLoaded = 'true';
      document.dispatchEvent(new CustomEvent('bb:catalog-loaded', { detail: { service: page, options } }));
    })
    .catch(() => {
      document.body.dataset.catalogLoaded = 'false';
      document.querySelectorAll('[data-service-save], [data-service-continue]').forEach((button) => { button.disabled = true; });
      document.dispatchEvent(new CustomEvent('bb:catalog-failed', { detail: { service: page } }));
    });
})();
