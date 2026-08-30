(function () {
  const page = document.body?.dataset.catalogService;
  if (!page) return;
  const selectors = { decoration: '[data-decoration-option]', photography: '[data-photo-option]', entertainment: '[data-ent-option]', 'lighting-av': '[data-price-input]', cake: '[data-price-input]', florals: '[data-price-input]' };
  const selector = selectors[page];
  if (!selector) return;
  const keyFor = (input) => input.dataset.decorationId || input.dataset.photoId || input.dataset.entId || input.id?.replace(/^cake-choice-/, '') || input.id || input.dataset.label || input.value;
  const money = (value) => `${Number(value || 0).toLocaleString('en-US')} MMK`;
  fetch(window.bbApiUrl(`/api/services/key/${encodeURIComponent(page)}/options`), { cache: 'no-store' })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((options) => {
      const byKey = new Map(options.map((option) => [String(option.optionKey), option]));
      document.querySelectorAll(selector).forEach((input) => {
        const option = byKey.get(String(keyFor(input)));
        if (!option) return;
        input.dataset.backendCatalogOptionId = String(option.id);
        input.dataset.price = String(option.price || 0);
        input.disabled = option.available === false;
        const price = input.closest('.choice-card, .food-card, label')?.querySelector('.text-gold, [data-option-price]');
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
