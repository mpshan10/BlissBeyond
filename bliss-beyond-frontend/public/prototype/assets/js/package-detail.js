(function () {
  const venueStrip = document.querySelector('.venue-strip');
  const packageHeading = document.querySelector('header.hero h1');
  if (!venueStrip || !packageHeading) return;

  const configuredApiBase = '__BB_API_BASE_URL__';
  const hostname = window.location.hostname;
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const apiBase = window.bbApiUrl
    ? null
    : (configuredApiBase.startsWith('__')
      ? (localHost ? `http://${hostname}:8081` : 'https://blissbeyond.onrender.com')
      : configuredApiBase.replace(/\/+$/, ''));
  const apiUrl = (path) => window.bbApiUrl ? window.bbApiUrl(path) : `${apiBase}${path}`;
  const packageSlug = document.body.dataset.packageSlug;

  const normalize = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const formatMoney = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `MMK ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
      : 'Price on request';
  };
  const formatGuests = (value) => {
    const guests = Number(value);
    return Number.isFinite(guests) ? `Up to ${new Intl.NumberFormat('en-US').format(guests)} Guests` : 'Guest limit not set';
  };
  const categoryLabel = (value) => String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const setElementText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };
  const setIconText = (element, value) => {
    if (!element) return;
    const icon = element.querySelector('i');
    if (icon) element.replaceChildren(icon, document.createTextNode(` ${value}`));
    else element.textContent = value;
  };
  const serviceKey = (value) => {
    const key = normalize(value);
    return key === 'soundlightingav' ? 'lightingav' : key;
  };

  const showUnavailable = () => {
    packageHeading.textContent = 'Package unavailable';
    setElementText('.hero-copy', 'This package is currently unavailable.');
    setElementText('.price-card .price', 'Unavailable');
    setElementText('.price-card small', 'Please return to Packages to view available options.');
    document.querySelectorAll('a[href*="booking.html"]').forEach((link) => { link.hidden = true; });
    const actions = document.querySelector('.hero-actions');
    if (actions) {
      actions.innerHTML = '<a class="btn btn-outline" href="/prototype/packages.html">Back to Packages</a>';
    }
    const finalCta = document.querySelector('.final-cta');
    if (finalCta) finalCta.hidden = true;
  };

  const renderPackage = (current) => {
    const venue = current.venue || {};
    const guests = formatGuests(current.maxGuests);
    const category = categoryLabel(current.category);
    const venueName = venue.name || 'Venue not set';
    const venueLocation = venue.location || 'Location not set';

    packageHeading.textContent = current.name || packageHeading.textContent;
    setElementText('.hero-copy', current.description || '');
    const badges = document.querySelectorAll('.hero-badge');
    if (badges[0]) badges[0].textContent = `${category} package`;
    if (badges[1]) badges[1].textContent = venueLocation;
    setIconText(document.querySelectorAll('.hero-detail')[0], venueName);
    setIconText(document.querySelectorAll('.hero-detail')[1], guests);
    setElementText('.price-card .price', formatMoney(current.finalPrice));
    setElementText('.price-card small', guests);
    setElementText('#venue-title', venueName);
    setElementText('.venue-content p', `${venueLocation} · ${guests}`);
    setElementText('#cta-title', current.name || '');
    setElementText('.final-cta p', `${formatMoney(current.finalPrice)} · ${guests}`);

    document.querySelectorAll('.benefit').forEach((benefit) => {
      const label = benefit.querySelector('span')?.textContent?.toLowerCase() || '';
      const value = benefit.querySelector('strong');
      if (!value) return;
      if (label.includes('maximum guests')) value.textContent = Number(current.maxGuests).toLocaleString('en-US');
      if (label.includes('celebration location')) value.textContent = venueLocation;
      if (label.includes('services included')) value.textContent = String((current.services || []).length);
    });

    const serviceCards = [...document.querySelectorAll('.service-card')];
    (current.services || []).forEach((service) => {
      const card = serviceCards.find((item) => serviceKey(item.querySelector('h3')?.textContent) === serviceKey(service.serviceName));
      if (!card) return;
      const heading = card.querySelector('h3');
      const list = card.querySelector('.package-inclusions');
      if (heading) heading.textContent = service.serviceName;
      if (list) {
        list.innerHTML = (service.inclusions || []).map(() =>
          `<li><i class="bi bi-check2" aria-hidden="true"></i><span></span></li>`
        ).join('');
        [...list.querySelectorAll('li span')].forEach((item, index) => {
          item.textContent = service.inclusions[index];
        });
      }
    });

    const websiteUrl = String(venue.websiteUrl || '').trim();
    const validWebsite = /^https?:\/\/.+/i.test(websiteUrl);
    document.querySelectorAll('.hero-actions a, .venue-strip a').forEach((link) => {
      if (!/view venue/i.test(link.textContent || '')) return;
      link.hidden = !validWebsite;
      if (validWebsite) {
        link.href = websiteUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
    document.querySelector('[data-dynamic-venue-website]')?.remove();
    if (validWebsite) {
      const link = document.createElement('a');
      link.className = 'btn btn-gold';
      link.href = websiteUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.dynamicVenueWebsite = 'true';
      link.textContent = 'Visit Hotel Website';
      venueStrip.appendChild(link);
    }

    document.body.dataset.packageActive = String(Boolean(current.active));
  };

  fetch(apiUrl(packageSlug ? `/api/packages/${encodeURIComponent(packageSlug)}` : '/api/packages'), {
    headers: { Accept: 'application/json' }
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Package request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const current = Array.isArray(data)
        ? data.find((item) => normalize(item.slug) === normalize(packageSlug))
        : data;
      if (!current) throw new Error('Package was not found in the catalog.');
      if (current.active !== true) {
        showUnavailable();
        return;
      }
      renderPackage(current);
    })
    .catch((error) => {
      if (error.message.includes('404')) {
        showUnavailable();
        return;
      }
      console.warn('Package catalog unavailable; using page fallback.', error.message);
    });
})();
