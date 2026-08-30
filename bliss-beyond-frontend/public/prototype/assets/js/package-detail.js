(function () {
  const venueStrip = document.querySelector('.venue-strip');
  const packageHeading = document.querySelector('[data-package-title], header.hero h1');
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
  const packageImage = document.querySelector('[data-package-image]');
  const fallbackImage = '/prototype/assets/img/venue-1.jpg';
  const resolveImage = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
    const normalized = raw.replace(/^\.\//, '').replace(/^\/+/, '');
    if (normalized.startsWith('prototype/')) return `/${normalized}`;
    if (normalized.startsWith('assets/')) return `/prototype/${normalized}`;
    return `/prototype/assets/img/${normalized}`;
  };

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
    return Number.isFinite(guests) ? `PACKAGE: UP TO ${new Intl.NumberFormat('en-US').format(guests)} GUESTS` : 'Guest limit not set';
  };
  const formatCapacityValue = (value) => {
    const capacity = Number(value);
    return Number.isFinite(capacity) && capacity > 0
      ? `Up to ${new Intl.NumberFormat('en-US').format(capacity)} Guests`
      : 'Capacity not set';
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
  const setPackageImage = (current) => {
    if (!packageImage) return;
    let storedImage = '';
    try {
      const plan = JSON.parse(window.sessionStorage.getItem('bb_package_plan') || '{}');
      storedImage = plan.packageSlug === current.slug ? plan.packageImage : '';
    } catch (error) {
      storedImage = '';
    }
    const image = resolveImage(current.image) || resolveImage(storedImage);
    packageImage.alt = `${current.name || 'Package'} package image`;
    packageImage.classList.remove('is-fallback');
    packageImage.onerror = () => {
      packageImage.onerror = null;
      packageImage.src = fallbackImage;
      packageImage.classList.add('is-fallback');
    };
    packageImage.src = image || fallbackImage;
    if (!image) packageImage.classList.add('is-fallback');
  };
  const configureBookingLinks = (current) => {
    let plan = {};
    try {
      const raw = window.sessionStorage.getItem('bb_package_plan');
      plan = raw ? JSON.parse(raw) : {};
    } catch (error) {
      plan = {};
    }
    const venue = current.venue || {};
    const guests = Number(plan.guestCount);
    const availabilityChecked = String(plan.packageSlug || '') === String(current.slug || '')
      && Number(plan.packageId || current.id) === Number(current.id)
      && Number(plan.venueId) === Number(venue.id)
      && /^\d{4}-\d{2}-\d{2}$/.test(String(plan.eventDate || ''))
      && /^(?:0[9]|1\d|2[0-3]):00$/.test(String(plan.startTime || ''))
      && /^(?:0[9]|1\d|2[0-3]):00$/.test(String(plan.endTime || ''))
      && plan.startTime < plan.endTime
      && Number.isInteger(guests) && guests > 0
      && (!window.bbIsValidBookingDate || window.bbIsValidBookingDate(plan.eventDate))
      && guests <= Number(current.maxGuests)
      && (venue.capacity == null || guests <= Number(venue.capacity))
      && (plan.packageAvailable === true || plan.available === true);
    const target = availabilityChecked
      ? '/prototype/customer/booking.html'
      : `/prototype/packages.html?packageSlug=${encodeURIComponent(current.slug || '')}#package-availability`;
    const label = availabilityChecked ? 'Continue to Booking' : 'Check Package Availability';
    document.querySelectorAll('.hero-actions a, .final-cta a').forEach((link) => {
      link.href = target;
      link.textContent = label;
    });
  };
  const serviceKey = (value) => {
    const key = normalize(value);
    return key === 'soundlightingav' ? 'lightingav' : key;
  };
  const serviceCards = [...document.querySelectorAll('.service-card')];
  serviceCards.forEach((card) => { card.hidden = true; });
  const closeServiceCard = (card) => {
    const toggle = card.querySelector('.service-head');
    const panel = card.querySelector('.service-panel');
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', 'false');
    card.classList.remove('is-open');
    panel.hidden = true;
  };
  serviceCards.forEach((card) => {
    const toggle = card.querySelector('.service-head');
    const panel = card.querySelector('.service-panel');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      serviceCards.forEach((otherCard) => {
        if (otherCard !== card) closeServiceCard(otherCard);
      });
      toggle.setAttribute('aria-expanded', String(!isOpen));
      card.classList.toggle('is-open', !isOpen);
      panel.hidden = isOpen;
    });
  });

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
    setPackageImage(current);
    setElementText('[data-package-breadcrumb]', current.name || 'Package');
    setElementText('.hero-copy', current.description || '');
    const badges = document.querySelectorAll('.hero-badge');
    if (badges[0]) badges[0].textContent = `${category} package`;
    if (badges[1]) badges[1].textContent = venueLocation;
    setElementText('[data-hero-venue-capacity]', formatCapacityValue(venue.capacity));
    setElementText('[data-hero-package-capacity]', formatCapacityValue(current.maxGuests));
    setElementText('[data-hero-venue]', venueName);
    setElementText('[data-hero-location]', venueLocation);
    setElementText('.price-card .price', formatMoney(current.finalPrice));
    setElementText('.price-card small', guests);
    setElementText('#venue-title', venueName);
    setElementText('#cta-title', current.name || '');
    setElementText('.final-cta p', `${formatMoney(current.finalPrice)} · ${guests}`);

    setElementText('.venue-content p', venueLocation);
    serviceCards.forEach((card) => { card.hidden = true; closeServiceCard(card); });
    const renderedServiceKeys = new Set();
    (Array.isArray(current.services) ? current.services : []).forEach((service) => {
      const currentServiceKey = serviceKey(service?.serviceName);
      if (!currentServiceKey || renderedServiceKeys.has(currentServiceKey)) return;
      const card = serviceCards.find((item) => serviceKey(item.querySelector('.service-title')?.textContent) === serviceKey(service.serviceName));
      if (!card) return;
      renderedServiceKeys.add(currentServiceKey);
      card.hidden = false;
      const heading = card.querySelector('.service-title');
      const list = card.querySelector('.package-inclusions');
      if (heading) heading.textContent = service.serviceName;
      if (list) {
        const inclusions = Array.isArray(service.inclusions)
          ? service.inclusions.filter((item) => typeof item === 'string' && item.trim())
          : [];
        list.innerHTML = (inclusions.length ? inclusions : ['Included in this package.']).map(() =>
          `<li><i class="bi bi-check2" aria-hidden="true"></i><span></span></li>`
        ).join('');
        [...list.querySelectorAll('li span')].forEach((item, index) => {
          item.textContent = inclusions[index] || 'Included in this package.';
        });
      }
    });
    const inclusionEmpty = document.querySelector('.inclusion-empty');
    if (inclusionEmpty) inclusionEmpty.hidden = serviceCards.every((card) => card.hidden);

    const websiteUrl = String(venue.websiteUrl || '').trim();
    const validWebsite = /^https?:\/\/.+/i.test(websiteUrl);
    const venueUrl = validWebsite ? websiteUrl : '';
    const websiteStatus = document.querySelector('[data-venue-website-status]');
    if (websiteStatus) websiteStatus.hidden = Boolean(venueUrl);
    document.querySelectorAll('.hero-actions a, .venue-strip a').forEach((link) => {
      if (!/view venue/i.test(link.textContent || '')) return;
      link.hidden = !venueUrl;
      if (venueUrl) {
        link.href = venueUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
    document.querySelector('[data-dynamic-venue-website]')?.remove();

    document.body.dataset.packageActive = String(Boolean(current.active));
    configureBookingLinks(current);
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
