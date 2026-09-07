(function () {
  'use strict';

  const apiUrl = (path) => typeof window.bbApiUrl === 'function'
    ? window.bbApiUrl(path)
    : path;
  const imageByStyle = {
    'Buffet': '/prototype/assets/img/catering2.jpg',
    'Plated Dinner': '/prototype/assets/img/catering3.jpg',
    'Cocktail / Finger Food': '/prototype/assets/img/catering4.jpg',
    'Family Style': '/prototype/assets/img/catering5.jpg',
    'Live Cooking Stations': '/prototype/assets/img/catering6.jpg',
    'Set Menu': '/prototype/assets/img/catering7.jpg',
    'High Tea / Afternoon Reception': '/prototype/assets/img/catering8.jpg',
    'Traditional Food': '/prototype/assets/img/catering9.jpg'
  };
  const escapeHtml = window.bbCateringEscapeHtml || ((value) => String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character])));
  const requestJson = (path) => {
    const request = window.bbFetchJson;
    if (typeof request !== 'function') {
      return Promise.reject(new Error('Catering details are temporarily unavailable.'));
    }
    return request(apiUrl(path), { method: 'GET' });
  };

  let stylesPromise;
  const loadStyles = () => {
    stylesPromise ||= requestJson('/api/dining-styles');
    return stylesPromise;
  };

  async function findStyle(name) {
    const styles = await loadStyles();
    const wanted = String(name || '').trim().toLowerCase();
    return styles.find((style) => String(style.name || '').toLowerCase() === wanted
      || String(style.key || '').toLowerCase() === wanted);
  }

  async function loadMenu(name) {
    const style = await findStyle(name);
    if (!style) throw new Error('Dining style is not available.');
    const menu = await requestJson(`/api/dining-styles/${encodeURIComponent(style.id)}/menu`);
    return { style, menu };
  }

  function showMenuError(message) {
    const openModal = window.bbCateringModalAPI?.open;
    if (openModal) openModal({
      kind: 'style',
      value: '',
      kicker: 'Dining Style Details',
      title: 'Menu unavailable',
      description: message,
      metaLabel: 'Dining Style',
      metaValue: 'Please try again later',
      image: '/prototype/assets/img/catering.jpg',
      imageAlt: 'Catering menu'
    });
  }

  async function openStyleModal(button) {
    const styleName = button.dataset.exploreStyle;
    const openModal = window.bbCateringModalAPI?.open;
    const renderMenuHtml = window.bbCateringRenderMenuHtml;
    if (!openModal || !renderMenuHtml) return;
    button.disabled = true;
    try {
      const { style, menu } = await loadMenu(styleName);
      openModal({
        kind: 'style',
        value: style.name,
        kicker: 'Dining Style Details',
        title: style.name,
        description: style.description || '',
        price: button.closest('.choice-card')?.querySelector('.text-gold')?.textContent?.trim() || '-',
        metaLabel: 'Dining Style',
        metaValue: style.name,
        image: imageByStyle[style.name] || '/prototype/assets/img/catering.jpg',
        imageAlt: `${style.name} catering`,
        bodyHtml: renderMenuHtml(menu.categories),
        chooseText: 'Choose This Option'
      });
    } catch (error) {
      showMenuError(error.message || 'Menu details are temporarily unavailable.');
    } finally {
      button.disabled = false;
    }
  }

  async function renderDetailPage(styleName) {
    const main = document.querySelector('[data-catering-page]');
    if (!main || !styleName) return;
    try {
      const { style, menu } = await loadMenu(styleName);
      const renderMenuHtml = window.bbCateringRenderMenuHtml;
      main.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div><span class="eyebrow">Dining Style Details</span><h1 class="h2 mt-1 mb-1">${escapeHtml(style.name)}</h1><p class="text-ink-soft mb-0">${escapeHtml(style.description || '')}</p></div>
          <button class="btn btn-outline-forest" type="button" id="backToCatering"><i class="bi bi-arrow-left me-1"></i> Back to Catering</button>
        </div>
        <div class="panel dining-detail-menu-panel">
          <div class="panel__head"><h5 class="mb-0">Available Menu</h5></div>
          <div class="panel__body"><div class="catering-modal-menu-grid">${renderMenuHtml(menu.categories)}</div></div>
        </div>`;
      document.getElementById('backToCatering')?.addEventListener('click', () => { window.location.href = 'catering.html'; });
    } catch (error) {
      main.innerHTML = `<div class="panel"><div class="panel__body"><p class="text-ink-soft mb-0">${escapeHtml(error.message || 'Menu details are temporarily unavailable.')}</p></div></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.explore-style-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openStyleModal(button);
      });
    });
    renderDetailPage(new URLSearchParams(window.location.search).get('style'));
  });
}());
