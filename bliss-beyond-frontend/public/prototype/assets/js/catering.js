document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbRequireAuth === 'function' && bbRequireAuth()) return;

  const root = document.querySelector('[data-catering-page]');
  if (!root) return;

  const venue = typeof bbGetVenue === 'function' ? bbGetVenue() : {};
  const eventContext = typeof bbGetEventContext === 'function' ? bbGetEventContext() : {};
  const stored = typeof bbGetCatering === 'function' ? bbGetCatering() : null;

  const foodGrid = root.querySelector('[data-food-grid]');
  const summaryEl = root.querySelector('[data-catering-summary]');
  const totalEl = root.querySelector('[data-catering-total]');
  const styleSummary = root.querySelector('[data-summary-style]');
  const guestsSummary = root.querySelector('[data-summary-guests]');
  const foodSummary = root.querySelector('[data-summary-food]');
  const addonsSummary = root.querySelector('[data-summary-addons]');
  const styleCostSummary = root.querySelector('[data-summary-style-cost]');
  const previewDetails = root.querySelector('[data-catering-preview-details]');
  const previewEmptyState = root.querySelector('[data-catering-empty-state]');
  const recommendationCopy = root.querySelector('[data-recommendation-copy]');
  const recommendationMenu = root.querySelector('[data-recommendation-menu]');
  const saveBtn = root.querySelector('[data-save-catering]');
  const continueBtns = [...root.querySelectorAll('[data-continue-review]')];
  const continueBtn = continueBtns[0] || null;
  const recommendBtn = root.querySelector('[data-add-recommended]');
  const notesInput = root.querySelector('[data-notes]');
  const eventTypeSelect = root.querySelector('[data-catering-event]');
  const guestInput = root.querySelector('[data-catering-guests]');
  const statusEl = root.querySelector('[data-catering-status]');
  const statusDefaultText = statusEl?.textContent?.trim() || 'Estimated prices vary by guests and selections.';
  const cuisineChecks = [...root.querySelectorAll('[data-cuisine]')];
  const dietChecks = [...root.querySelectorAll('[data-diet]')];
  const styleInputs = [...root.querySelectorAll('[data-dining-style]')];
  const cuisineFilter = root.querySelector('[data-cuisine-filter]');
  const categoryFilter = root.querySelector('[data-category-filter]');
  const dietFilter = root.querySelector('[data-diet-filter]');
  const searchInput = root.querySelector('[data-food-search]');
  const addonGroups = {
    beverage: root.querySelector('[data-addon-group="beverage"]'),
    dessert: root.querySelector('[data-addon-group="dessert"]'),
    specialty: root.querySelector('[data-addon-group="specialty"]'),
    traditional: root.querySelector('[data-addon-group="traditional"]')
  };

  const formatMoney = (value) => `${Number(value || 0).toLocaleString('en-US')} MMK`;
  let catalogAvailability = 'fallback';
  let diningStyleCatalogState = 'loading';
  let addonCatalogState = 'loading';
  let catalogAuthorityReady = false;

  continueBtns.forEach((button) => {
    if (!button.dataset.originalHref) {
      button.dataset.originalHref = button.getAttribute('href') || '/prototype/customer/review.html';
    }
  });

  const foods = [
    { id: 'spring-rolls', name: 'Spring Rolls', cuisine: 'Asian', category: 'Appetizers', description: 'Crisp vegetable rolls served with a sweet dipping sauce.', pricePerGuest: 2.5, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'samosa', name: 'Samosa', cuisine: 'Asian', category: 'Appetizers', description: 'Golden pastry pockets with spiced potato filling.', pricePerGuest: 2.2, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'chicken-satay', name: 'Chicken Satay', cuisine: 'Asian', category: 'Appetizers', description: 'Grilled chicken skewers with peanut sauce.', pricePerGuest: 3.1, image: '/prototype/assets/img/venue-3.jpg', vegetarian: false, vegan: false, halal: true, glutenFree: true, nutFree: false, available: true },
    { id: 'caesar-salad', name: 'Caesar Salad', cuisine: 'Western', category: 'Appetizers', description: 'Crisp romaine with parmesan and croutons.', pricePerGuest: 2.8, image: '/prototype/assets/img/venue-1.jpg', vegetarian: false, vegan: false, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'fresh-garden-salad', name: 'Fresh Garden Salad', cuisine: 'Western', category: 'Appetizers', description: 'Seasonal greens with citrus dressing.', pricePerGuest: 2.6, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'chicken-biryani', name: 'Chicken Biryani', cuisine: 'Indian', category: 'Main Course', description: 'Fragrant basmati rice with spiced chicken and herbs.', pricePerGuest: 8, image: '/prototype/assets/img/catering.jpg', vegetarian: false, vegan: false, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'butter-chicken', name: 'Butter Chicken', cuisine: 'Indian', category: 'Main Course', description: 'Creamy tomato-based chicken curry with aromatic spices.', pricePerGuest: 7, image: '/prototype/assets/img/venue-3.jpg', vegetarian: false, vegan: false, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'fried-rice', name: 'Fried Rice', cuisine: 'Asian', category: 'Main Course', description: 'Wok-fried rice with vegetables and savory seasoning.', pricePerGuest: 5, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'beef-steak', name: 'Beef Steak', cuisine: 'Western', category: 'Main Course', description: 'Chargrilled steak with rich jus and vegetables.', pricePerGuest: 9, image: '/prototype/assets/img/venue-2.jpg', vegetarian: false, vegan: false, halal: false, glutenFree: true, nutFree: true, available: true },
    { id: 'vegetable-curry', name: 'Vegetable Curry', cuisine: 'Traditional', category: 'Main Course', description: 'Comforting local vegetable curry with fragrant spices.', pricePerGuest: 4.5, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'seafood-curry', name: 'Seafood Curry', cuisine: 'International', category: 'Main Course', description: 'A rich seafood curry finished with coconut cream.', pricePerGuest: 9.5, image: '/prototype/assets/img/venue-3.jpg', vegetarian: false, vegan: false, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'naan', name: 'Naan', cuisine: 'Asian', category: 'Side Dishes', description: 'Soft oven-baked flatbread served warm.', pricePerGuest: 1.4, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'mashed-potatoes', name: 'Mashed Potatoes', cuisine: 'Western', category: 'Side Dishes', description: 'Creamy mashed potatoes with herbs.', pricePerGuest: 1.8, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: false, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'seasonal-salad', name: 'Seasonal Salad', cuisine: 'International', category: 'Side Dishes', description: 'Seasonal vegetables with a light vinaigrette.', pricePerGuest: 1.6, image: '/prototype/assets/img/venue-3.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'chocolate-cake', name: 'Chocolate Cake', cuisine: 'Western', category: 'Desserts', description: 'Rich chocolate sponge with silky ganache.', pricePerGuest: 3.2, image: '/prototype/assets/img/catering.jpg', vegetarian: true, vegan: false, halal: true, glutenFree: false, nutFree: false, available: true },
    { id: 'cheesecake', name: 'Cheesecake', cuisine: 'Western', category: 'Desserts', description: 'Smooth cheesecake with a biscuit base.', pricePerGuest: 3.8, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: false, halal: true, glutenFree: false, nutFree: true, available: true },
    { id: 'fruit-platter', name: 'Fruit Platter', cuisine: 'International', category: 'Desserts', description: 'Fresh seasonal fruit arranged beautifully.', pricePerGuest: 2.9, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'soft-drinks', name: 'Soft Drinks', cuisine: 'International', category: 'Drinks', description: 'Assorted soft drinks served chilled.', pricePerGuest: 2.0, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'fresh-juice', name: 'Fresh Juice', cuisine: 'International', category: 'Drinks', description: 'Fresh fruit juices prepared on the day.', pricePerGuest: 2.4, image: '/prototype/assets/img/venue-3.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'coffee', name: 'Coffee', cuisine: 'International', category: 'Drinks', description: 'Freshly brewed coffee service.', pricePerGuest: 1.8, image: '/prototype/assets/img/venue-1.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'tea', name: 'Tea', cuisine: 'International', category: 'Drinks', description: 'Selection of premium tea service.', pricePerGuest: 1.4, image: '/prototype/assets/img/venue-2.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true },
    { id: 'mocktails', name: 'Mocktails', cuisine: 'International', category: 'Drinks', description: 'Signature alcohol-free drinks.', pricePerGuest: 3.2, image: '/prototype/assets/img/venue-3.jpg', vegetarian: true, vegan: true, halal: true, glutenFree: true, nutFree: true, available: true }
  ];

  const foodBackendIds = {
    'spring-rolls': 1,
    'samosa': 12,
    'chicken-satay': 2,
    'caesar-salad': 13,
    'fresh-garden-salad': 14,
    'chicken-biryani': 3,
    'butter-chicken': 4,
    'fried-rice': 5,
    'beef-steak': 15,
    'vegetable-curry': 16,
    'seafood-curry': 17,
    'naan': 18,
    'mashed-potatoes': 19,
    'seasonal-salad': 7,
    'chocolate-cake': 20,
    'cheesecake': 21,
    'fruit-platter': 8,
    'soft-drinks': 10,
    'fresh-juice': 22,
    'coffee': 23,
    'tea': 24,
    'mocktails': 25
  };

  foods.forEach((food) => {
    food.backendFoodId = foodBackendIds[food.id] || null;
  });

  const foodCatalog = new Map();
  let foodCatalogState = 'loading';
  let foodCatalogWarnings = [];

  const getBackendFood = (food) => {
    const backendId = Number(food?.backendFoodId || 0);
    if (!Number.isFinite(backendId) || backendId <= 0) return null;
    return foodCatalog.get(backendId) || null;
  };

  const isFoodSelectable = (food) => {
    if (foodCatalogState !== 'ready') return true;
    const backendFood = getBackendFood(food);
    return Boolean(backendFood && backendFood.available !== false);
  };

  const validateFoodSelection = (selectedFoods) => {
    if (foodCatalogState !== 'ready') return [];
    return selectedFoods.filter((food) => !isFoodSelectable(food));
  };

  const addons = [
    { id: 'soft-drinks-package', name: 'Soft Drinks Package', group: 'beverage', pricingType: 'perGuest', price: 10000, description: 'A basic drinks package for all guests.' },
    { id: 'fresh-juice-package', name: 'Fresh Juice Package', group: 'beverage', pricingType: 'perGuest', price: 14000, description: 'Fresh juice selection for a brighter reception.' },
    { id: 'mocktail-package', name: 'Mocktail Package', group: 'beverage', pricingType: 'perGuest', price: 18000, description: 'Signature mocktails and presentation bar.' },
    { id: 'premium-beverage-package', name: 'Premium Beverage Package', group: 'beverage', pricingType: 'perGuest', price: 22000, description: 'Upgraded beverages and service styling.' },
    { id: 'coffee-tea-package', name: 'Coffee & Tea Package', group: 'beverage', pricingType: 'perGuest', price: 8000, description: 'Hot beverage station for all guests.' },
    { id: 'dessert-station', name: 'Dessert Station', group: 'dessert', pricingType: 'perGuest', price: 8000, description: 'A staffed dessert table with sweets and garnish.' },
    { id: 'premium-dessert-bar', name: 'Premium Dessert Bar', group: 'dessert', pricingType: 'perGuest', price: 12000, description: 'An elevated dessert installation for the event.' },
    { id: 'chocolate-fountain', name: 'Chocolate Fountain', group: 'dessert', pricingType: 'perGuest', price: 9000, description: 'Classic chocolate fountain station.' },
    { id: 'mini-pastries', name: 'Mini Pastries', group: 'dessert', pricingType: 'perGuest', price: 7000, description: 'Assorted miniature pastries for guests.' },
    { id: 'macaron-station', name: 'Macaron Station', group: 'dessert', pricingType: 'perGuest', price: 10000, description: 'Elegant macaron display and service.' },
    { id: 'ice-cream-station', name: 'Ice Cream Station', group: 'dessert', pricingType: 'perGuest', price: 9000, description: 'Live ice cream service with toppings.' },
    { id: 'live-chef-station', name: 'Live Chef Station', group: 'specialty', pricingType: 'perGuest', price: 18000, description: 'Chef-led live cooking experience.' },
    { id: 'sushi-station', name: 'Sushi Station', group: 'specialty', pricingType: 'perGuest', price: 20000, description: 'Fresh sushi prepared at the event.' },
    { id: 'carving-station', name: 'Carving Station', group: 'specialty', pricingType: 'perGuest', price: 17000, description: 'Premium carving station with service chef.' },
    { id: 'cheese-board', name: 'Cheese Board', group: 'specialty', pricingType: 'perGuest', price: 12000, description: 'A curated cheese board for grazing.' },
    { id: 'seafood-station', name: 'Seafood Station', group: 'specialty', pricingType: 'perGuest', price: 24000, description: 'Live seafood service and presentation.' },
    { id: 'late-night-snack-station', name: 'Late-Night Snack Station', group: 'specialty', pricingType: 'perGuest', price: 13000, description: 'A casual late-night food station.' },
    { id: 'mohinga-station', name: 'Mohinga Station', group: 'traditional', pricingType: 'perGuest', price: 12000, description: 'Fresh Mohinga served with classic toppings.' },
    { id: 'shan-noodle-station', name: 'Shan Noodle Station', group: 'traditional', pricingType: 'perGuest', price: 13000, description: 'Shan noodles with savoury toppings and garnishes.' },
    { id: 'traditional-snack-station', name: 'Traditional Snack Station', group: 'traditional', pricingType: 'perGuest', price: 10000, description: 'Popular traditional snacks for receptions and events.' },
    { id: 'traditional-dessert-station', name: 'Traditional Dessert Station', group: 'traditional', pricingType: 'perGuest', price: 11000, description: 'Traditional sweets and refreshing dessert favourites.' }
  ];

  const stylePrices = {
    Buffet: 25000,
    'Plated Dinner': 40000,
    'Cocktail / Finger Food': 22000,
    'Family Style': 32000,
    'Live Cooking Stations': 48000,
    'Set Menu': 36000,
    'High Tea / Afternoon Reception': 18000,
    'Traditional Food': 30000
  };

  const billingTypeToPricingType = (billingType) => {
    switch (String(billingType || '').toUpperCase()) {
      case 'FLAT':
        return 'flat';
      case 'PER_UNIT':
        return 'perUnit';
      case 'PER_GUEST':
      default:
        return 'perGuest';
    }
  };

  const styleCatalogFor = (styleName) => {
    const input = styleInputs.find((candidate) => candidate.value === styleName);
    return input?.dataset.backendDiningStyleId
      ? {
          id: Number(input.dataset.backendDiningStyleId),
          key: input.dataset.styleKey,
          name: input.value,
          pricePerGuest: Number(stylePrices[styleName] || 0)
        }
      : null;
  };

  const normalizeAddonId = (entry) => {
    const raw = typeof entry === 'object' && entry !== null
      ? entry.id || entry.frontendId || entry.key || entry.name
      : entry;
    const match = addons.find((addon) => addon.id === raw || addon.name === raw);
    return match?.id || raw;
  };

  const toIdList = (value) => (Array.isArray(value) ? value : []).map(normalizeAddonId).filter(Boolean);

  const state = {
    eventType: eventContext.eventType || 'Wedding',
    guestCount: Number(eventContext.guests || 150),
    style: 'Buffet',
    cuisines: [],
    dietary: [],
    foods: [],
    addons: [],
    notes: ''
  };

  if (stored) {
    state.eventType = stored.eventType || state.eventType;
    state.guestCount = Number(stored.guestCount || state.guestCount);
    state.style = typeof stored.style === 'object'
      ? stored.style?.key || stored.style?.name || stored.style?.label || stored.style?.value || state.style
      : stored.style || state.style;
    state.cuisines = Array.isArray(stored.cuisines) ? stored.cuisines : state.cuisines;
    state.dietary = Array.isArray(stored.dietary) ? stored.dietary : state.dietary;
    state.foods = toIdList(stored.foods);
    state.addons = toIdList(stored.addons);
    state.notes = stored.notes || state.notes;
  }

  if (eventTypeSelect) eventTypeSelect.value = state.eventType;
  if (guestInput) guestInput.value = state.guestCount;
  if (notesInput) notesInput.value = state.notes;

  const dietKey = (label) => {
    switch (label) {
      case 'Vegetarian':
        return 'vegetarian';
      case 'Vegan':
        return 'vegan';
      case 'Halal':
        return 'halal';
      case 'Gluten-Free':
        return 'glutenFree';
      case 'Nut-Free':
        return 'nutFree';
      default:
        return 'available';
    }
  };

  const renderAddonGroup = (groupName) => {
    const target = addonGroups[groupName];
    if (!target) return;

    const groupItems = addons.filter((item) => item.group === groupName);
    target.innerHTML = groupItems.map((item) => {
      const selectable = addonCatalogState !== 'ready' || item.available !== false;
      return `
      <label class="choice-card ${state.addons.includes(item.id) ? 'selected' : ''}" data-addon-card>
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <strong>${item.name}</strong>
            <div class="small text-ink-soft">${item.description}</div>
            <div class="text-gold small mt-1">${item.pricingType === 'perGuest' ? `${formatMoney(item.price)} / guest` : formatMoney(item.price)}</div>
          </div>
          <input class="form-check-input mt-1" type="checkbox" value="${item.id}" data-addon data-catalog-available="${selectable}" ${selectable ? '' : 'disabled'}>
        </div>
      </label>
    `;
    }).join('');

    target.querySelectorAll('[data-addon]').forEach((input) => {
      input.checked = state.addons.includes(input.value);
      input.addEventListener('change', syncAndRender);
    });
  };

  const renderFoodCards = () => {
    const cuisineValue = cuisineFilter?.value || 'all';
    const categoryValue = categoryFilter?.value || 'all';
    const dietValue = dietFilter?.value || 'all';
    const query = (searchInput?.value || '').trim().toLowerCase();
    const selectedCuisines = cuisineChecks.filter((input) => input.checked).map((input) => input.value);

    const filtered = foods.filter((food) => {
      const cuisineOk = cuisineValue === 'all' || food.cuisine === cuisineValue;
      const chipCuisineOk = !selectedCuisines.length || selectedCuisines.includes(food.cuisine);
      const categoryOk = categoryValue === 'all' || food.category === categoryValue;
      const dietOk = dietValue === 'all' || Boolean(food[dietKey(dietValue)]);
      const searchOk = !query || [food.name, food.description, food.cuisine, food.category].join(' ').toLowerCase().includes(query);
      return food.available && cuisineOk && chipCuisineOk && categoryOk && dietOk && searchOk;
    });

    if (!foodGrid) return;
    foodGrid.innerHTML = filtered.map((food) => {
      const selected = state.foods.includes(food.id);
      const backendFood = getBackendFood(food);
      const selectable = isFoodSelectable(food);
      const availabilityLabel = foodCatalogState === 'ready' && !selectable ? 'Unavailable' : (selected ? '&check; Added' : 'Tap to add');
      return `
        <article class="food-card ${selected ? 'selected' : ''}" data-food-card data-food-id="${food.id}">
          <div class="food-card__media" style="background-image:url('${food.image}')"></div>
          <div class="food-card__body">
            <div class="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div class="food-card__meta">${food.cuisine} &middot; ${food.category}</div>
                <h3 class="food-card__title">${food.name}</h3>
              </div>
              <button class="btn btn-sm ${selected ? 'btn-gold' : 'btn-outline-forest'}" type="button" data-food-toggle="${food.id}" ${selectable ? '' : 'disabled'}>${foodCatalogState === 'ready' && !selectable ? 'Unavailable' : (selected ? 'Added' : '+ Add')}</button>
            </div>
            <p class="small text-ink-soft mt-2 mb-2">${food.description}</p>
            <div class="food-card__badges">
              ${food.vegetarian ? '<span class="food-badge">Vegetarian</span>' : ''}
              ${food.vegan ? '<span class="food-badge">Vegan</span>' : ''}
              ${food.halal ? '<span class="food-badge">Halal</span>' : ''}
              ${food.glutenFree ? '<span class="food-badge">Gluten-Free</span>' : ''}
              ${food.nutFree ? '<span class="food-badge">Nut-Free</span>' : ''}
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3">
              <strong class="text-gold">${formatMoney(food.pricePerGuest)} / guest</strong>
              <span class="small text-ink-soft">${availabilityLabel}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  const updateSummaryCards = () => {
    root.querySelectorAll('[data-food-card]').forEach((card) => {
      card.classList.toggle('selected', state.foods.includes(card.dataset.foodId));
    });
    root.querySelectorAll('[data-addon-card]').forEach((card) => {
      const checkbox = card.querySelector('[data-addon]');
      card.classList.toggle('selected', checkbox?.checked);
    });
    styleInputs.forEach((input) => {
      input.closest('.choice-card')?.classList.toggle('selected', input.checked);
    });
  };

  const calculate = () => {
    const guestCount = Number(guestInput?.value || state.guestCount || 150);
    const style = styleInputs.find((input) => input.checked)?.value || 'Buffet';
    const selectedFoods = foods.filter((food) => state.foods.includes(food.id));
    const selectedAddons = addons.filter((addon) => state.addons.includes(addon.id));
    const invalidFoods = validateFoodSelection(selectedFoods);
    const styleCost = Number(stylePrices[style] || 0) * guestCount;
    const foodCost = selectedFoods.reduce((sum, food) => sum + Number(food.pricePerGuest || 0) * guestCount, 0);
    const addonCost = selectedAddons.reduce((sum, addon) => {
      return sum + (addon.pricingType === 'perGuest' ? Number(addon.price || 0) * guestCount : Number(addon.price || 0));
    }, 0);
    const groupTotal = (items) => items.reduce((sum, item) => sum + (item.pricingType === 'perGuest' ? Number(item.price || 0) * guestCount : Number(item.price || 0)), 0);
    const previewHasSelection = hasMeaningfulSelection({
      style,
      foods: selectedFoods,
      addons: selectedAddons,
      cuisines: cuisineChecks.filter((input) => input.checked).map((input) => input.value),
      dietary: dietChecks.filter((input) => input.checked).map((input) => input.value)
    });
    const estimatedTotal = previewHasSelection ? styleCost + foodCost + addonCost : 0;
    const diningStyle = styleCatalogFor(style);

    if (styleSummary) styleSummary.textContent = style;
    if (guestsSummary) guestsSummary.textContent = guestCount.toLocaleString();
    if (foodSummary) foodSummary.textContent = formatMoney(foodCost);
    if (addonsSummary) addonsSummary.textContent = formatMoney(addonCost);
    if (styleCostSummary) styleCostSummary.textContent = formatMoney(styleCost);
    if (totalEl) totalEl.textContent = formatMoney(estimatedTotal);
    if (previewDetails) previewDetails.classList.toggle('d-none', !previewHasSelection);
    if (previewEmptyState) previewEmptyState.classList.toggle('d-none', previewHasSelection);

    if (summaryEl) {
      const groupedFoods = selectedFoods.reduce((acc, food) => {
        acc[food.category] = acc[food.category] || [];
        acc[food.category].push(food.name);
        return acc;
      }, {});
      const groupedAddons = selectedAddons.reduce((acc, addon) => {
        acc[addon.group] = acc[addon.group] || [];
        acc[addon.group].push(addon.name);
        return acc;
      }, {});
      const selectedCuisines = cuisineChecks.filter((input) => input.checked).map((input) => input.value);
      const selectedDietary = dietChecks.filter((input) => input.checked).map((input) => input.value);

      summaryEl.innerHTML = `
        <li><span>Event</span><strong>${eventTypeSelect?.value || state.eventType || 'Wedding'}</strong></li>
        <li><span>Venue</span><strong>${venue?.name || 'Selected venue'}</strong></li>
        <li><span>Guests</span><strong>${guestCount.toLocaleString()}</strong></li>
        <li><span>Dining Style</span><strong>${style} - ${formatMoney(stylePrices[style] || 0)} / guest</strong></li>
        <li><span>Cuisine</span><strong>${selectedCuisines.length ? selectedCuisines.join(' + ') : 'None selected'}</strong></li>
        <li><span>Food</span><strong>${Object.keys(groupedFoods).length ? Object.values(groupedFoods).flat().join(' &middot; ') : 'No food selected'}</strong></li>
        <li><span>Beverage Packages</span><strong>${groupedAddons.beverage?.join(' &middot; ') || 'None selected'}</strong></li>
        <li><span>Dessert Add-ons</span><strong>${groupedAddons.dessert?.join(' &middot; ') || 'None selected'}</strong></li>
        <li><span>Specialty Add-ons</span><strong>${groupedAddons.specialty?.join(' &middot; ') || 'None selected'}</strong></li>
        <li><span>Dietary Requirements</span><strong>${selectedDietary.length ? selectedDietary.join(' + ') : 'None selected'}</strong></li>
      `;
    }

    const beverageAddons = selectedAddons.filter((addon) => addon.group === 'beverage');
    const dessertAddons = selectedAddons.filter((addon) => addon.group === 'dessert');
    const specialtyAddons = selectedAddons.filter((addon) => addon.group === 'specialty');
    const traditionalAddons = selectedAddons.filter((addon) => addon.group === 'traditional');

    const setText = (selector, value) => {
      const el = root.querySelector(selector);
      if (el) el.textContent = value;
    };
    const setList = (selector, items) => {
      const el = root.querySelector(selector);
      if (!el) return;
      el.innerHTML = items.length ? items.map((item) => `<ul class="summary-service-list mb-0"><li>${item}</li></ul>`).join('') : '-';
    };

    setText('[data-estimated-grand-total]', formatMoney(estimatedTotal));
    setText('[data-estimated-guests]', guestCount.toLocaleString());
    setText('[data-estimated-dining-style]', style || '-');
    setText('[data-estimated-dining-price]', style ? `${formatMoney(stylePrices[style] || 0)} / guest` : '-');
    setList('[data-estimated-beverage]', beverageAddons.map((item) => item.name));
    setText('[data-estimated-beverage-price]', beverageAddons.length ? formatMoney(groupTotal(beverageAddons)) : '-');
    setList('[data-estimated-dessert]', dessertAddons.map((item) => item.name));
    setText('[data-estimated-dessert-price]', dessertAddons.length ? formatMoney(groupTotal(dessertAddons)) : '-');
    setList('[data-estimated-specialty]', specialtyAddons.map((item) => item.name));
    setText('[data-estimated-specialty-price]', specialtyAddons.length ? formatMoney(groupTotal(specialtyAddons)) : '-');
    setList('[data-estimated-traditional]', traditionalAddons.map((item) => item.name));
    setText('[data-estimated-traditional-price]', traditionalAddons.length ? formatMoney(groupTotal(traditionalAddons)) : '-');
    setList('[data-estimated-dietary]', dietChecks.filter((input) => input.checked).map((input) => input.value));
    setText('[data-estimated-notes]', notesInput?.value?.trim() || '-');
    if (statusEl) {
      statusEl.textContent = invalidFoods.length
        ? 'One menu item is currently unavailable. Please review your Catering selection.'
        : statusDefaultText;
    }

    return {
      eventType: eventTypeSelect?.value || state.eventType || 'Wedding',
      guestCount,
      style,
      cuisines: cuisineChecks.filter((input) => input.checked).map((input) => input.value),
      foods: selectedFoods,
      addons: selectedAddons,
      dietary: dietChecks.filter((input) => input.checked).map((input) => input.value),
      notes: notesInput?.value || '',
      estimatedTotal,
      diningStyle
    };
  };

  const setFieldLock = (element, locked) => {
    if (!element) return;
    element.disabled = locked;
    element.setAttribute('aria-disabled', locked ? 'true' : 'false');
  };

  const setInteractiveLock = (element, locked) => {
    if (!element) return;
    element.style.pointerEvents = locked ? 'none' : '';
    element.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) {
      element.setAttribute('tabindex', '-1');
    } else {
      element.removeAttribute('tabindex');
    }
  };

  const lockFoodCard = (card, locked) => {
    if (!card) return;
    card.style.pointerEvents = locked ? 'none' : '';
    card.setAttribute('aria-disabled', locked ? 'true' : 'false');
    const button = card.querySelector('[data-food-toggle]');
    if (button) button.disabled = locked;
  };

  const applyAvailabilityState = () => {
    const locked = catalogAvailability === 'unavailable';
    const catalogLocked = !catalogAuthorityReady;

    setFieldLock(eventTypeSelect, locked);
    setFieldLock(guestInput, locked);
    setFieldLock(notesInput, locked);
    setFieldLock(cuisineFilter, locked);
    setFieldLock(categoryFilter, locked);
    setFieldLock(dietFilter, locked);
    setFieldLock(saveBtn, locked || catalogLocked);

    continueBtns.forEach((button) => {
      setInteractiveLock(button, locked || catalogLocked);
      if (locked || catalogLocked) {
        button.setAttribute('href', '#');
      } else if (button.dataset.originalHref) {
        button.setAttribute('href', button.dataset.originalHref);
      }
    });

    root.querySelectorAll('[data-dining-style]').forEach((input) => {
      const unavailable = input.dataset.catalogAvailable === 'false';
      setFieldLock(input, locked || unavailable);
      input.closest('.choice-card')?.style.setProperty('pointer-events', locked || unavailable ? 'none' : '');
    });

    root.querySelectorAll('[data-diet]').forEach((input) => {
      setFieldLock(input, locked);
      input.closest('.choice-card')?.style.setProperty('pointer-events', locked ? 'none' : '');
    });

    root.querySelectorAll('[data-addon-card]').forEach((card) => {
      lockFoodCard(card, locked);
      const input = card.querySelector('[data-addon]');
      if (input) setFieldLock(input, locked || input.dataset.catalogAvailable === 'false');
    });

    root.querySelectorAll('[data-food-card]').forEach((card) => lockFoodCard(card, locked));
    root.querySelectorAll('[data-explore-style], .addon-explore-btn').forEach((button) => setFieldLock(button, locked));

    if (locked) {
      if (statusEl) statusEl.textContent = 'Catering is currently unavailable.';
    } else if (catalogLocked && diningStyleCatalogState === 'failed' || catalogLocked && addonCatalogState === 'failed') {
      if (statusEl) statusEl.textContent = 'Catering pricing catalog unavailable. Please try again before saving.';
    } else if (catalogLocked) {
      if (statusEl) statusEl.textContent = 'Loading current Catering prices...';
    } else if (statusEl) {
      statusEl.textContent = statusDefaultText;
    }
  };

  const hasMeaningfulSelection = (payload) => {
    return Boolean(
      payload.style !== 'Buffet' ||
      payload.foods.length ||
      payload.addons.length ||
      payload.cuisines.length ||
      payload.dietary.length
    );
  };

  const syncAndRender = () => {
    renderFoodCards();
    renderAddonGroup('beverage');
    renderAddonGroup('dessert');
    renderAddonGroup('specialty');
    renderAddonGroup('traditional');
    updateSummaryCards();
    refreshRecommendationCopy();
    calculate();
  };

  const persist = () => {
    if (catalogAvailability === 'unavailable') {
      if (statusEl) statusEl.textContent = 'Catering is currently unavailable.';
      return null;
    }
    if (!catalogAuthorityReady) {
      if (statusEl) statusEl.textContent = 'Current Catering prices are not available yet. Please try again.';
      return null;
    }

    const payload = calculate();
    const invalidFoods = validateFoodSelection(payload.foods);
    if (invalidFoods.length) {
      if (statusEl) {
        statusEl.textContent = 'One menu item is currently unavailable. Please review your Catering selection.';
      }
      return null;
    }
    if (!hasMeaningfulSelection(payload)) {
      if (statusEl) {
        statusEl.textContent = 'Please choose your catering options before saving.';
      }
      return null;
    }

    state.eventType = payload.eventType;
    state.guestCount = payload.guestCount;
    state.style = payload.style;
    state.cuisines = payload.cuisines;
    state.dietary = payload.dietary;
    state.notes = payload.notes;

    const selectedStyle = payload.diningStyle || styleCatalogFor(payload.style);
    const savedStyle = selectedStyle
      ? {
          backendDiningStyleId: selectedStyle.id,
          key: selectedStyle.key,
          name: selectedStyle.name,
          pricePerGuest: selectedStyle.pricePerGuest
        }
      : payload.style;
    const savedAddons = payload.addons.map((addon) => ({
      ...addon,
      frontendId: addon.id,
      backendAddonId: addon.backendAddonId,
      billingType: addon.billingType || 'PER_GUEST'
    }));

    bbSetCatering({
      serviceId: 'catering',
      backendServiceId: 1,
      title: 'Catering',
      eventType: payload.eventType,
      guestCount: payload.guestCount,
      style: savedStyle,
      styleKey: selectedStyle?.key,
      cuisines: payload.cuisines,
      foods: payload.foods,
      addons: savedAddons,
      dietary: payload.dietary,
      notes: payload.notes,
      options: [
        payload.style,
        ...payload.cuisines,
        ...payload.foods.map((food) => food.name),
        ...savedAddons.map((addon) => addon.name),
        ...payload.dietary
      ],
      summary: {
        style: payload.style,
        cuisines: payload.cuisines,
        foods: payload.foods.map((food) => food.name),
        addons: savedAddons.map((addon) => addon.name),
        dietary: payload.dietary
      },
      estimatedTotal: payload.estimatedTotal
    });

    bbSetEventContext({
      eventType: payload.eventType,
      guests: payload.guestCount
    });

    bbSetServiceData('catering', {
      serviceId: 'catering',
      backendServiceId: 1,
      title: 'Catering',
      eventType: payload.eventType,
      guestCount: payload.guestCount,
      style: savedStyle,
      styleKey: selectedStyle?.key,
      cuisines: payload.cuisines,
      foods: payload.foods,
      addons: savedAddons,
      dietary: payload.dietary,
      notes: payload.notes,
      estimatedTotal: payload.estimatedTotal,
      options: [
        payload.style,
        ...payload.cuisines,
        ...payload.foods.map((food) => food.name),
        ...savedAddons.map((addon) => addon.name),
        ...payload.dietary
      ],
      summary: {
        style: payload.style,
        cuisines: payload.cuisines,
        foods: payload.foods.map((food) => food.name),
        addons: savedAddons.map((addon) => addon.name),
        dietary: payload.dietary
      }
    });

    const selectedServices = typeof bbGetSelectedServices === 'function' ? bbGetSelectedServices() : [];
    const without = selectedServices.filter((item) => item.id !== 'catering');
    without.push({ id: 'catering', title: 'Catering', estimatedTotal: payload.estimatedTotal });
    bbSetSelectedServices(without);
    return payload;
  };

  const toggleFood = (foodId) => {
    const food = foods.find((item) => item.id === foodId);
    if (food && !isFoodSelectable(food)) {
      if (statusEl) {
        statusEl.textContent = 'One menu item is currently unavailable. Please review your Catering selection.';
      }
      return;
    }
    state.foods = state.foods.includes(foodId)
      ? state.foods.filter((id) => id !== foodId)
      : [...state.foods, foodId];
    syncAndRender();
  };

  const toggleAddon = (addonId) => {
    state.addons = state.addons.includes(addonId)
      ? state.addons.filter((id) => id !== addonId)
      : [...state.addons, addonId];
    syncAndRender();
  };

  const refreshRecommendationCopy = () => {
    if (!recommendationCopy || !recommendationMenu) return;

    const guests = Number(guestInput?.value || state.guestCount || 150);
    const eventType = eventTypeSelect?.value || state.eventType || 'Wedding';
    const style = styleInputs.find((input) => input.checked)?.value || 'Buffet';
    const cuisines = cuisineChecks.filter((input) => input.checked).map((input) => input.value);

    let suggestion = '2 Appetizers · 3 Main Courses · 2 Side Dishes · 2 Desserts · 3 Drinks';
    if (style === 'Cocktail / Finger Food') {
      suggestion = '4 Appetizers · 3 Mini Mains · 2 Desserts · 4 Drinks';
    } else if (style === 'High Tea / Afternoon Reception') {
      suggestion = '2 Savouries · 2 Desserts · 4 Drinks';
    } else if (style === 'Live Cooking Stations') {
      suggestion = '2 Appetizers · 2 Live Stations · 2 Desserts · 3 Drinks';
    } else if (eventType === 'Corporate Event') {
      suggestion = '2 Appetizers · 2 Main Courses · 2 Side Dishes · 2 Drinks';
    } else if (guests >= 200) {
      suggestion = '3 Appetizers · 4 Main Courses · 3 Side Dishes · 3 Desserts · 4 Drinks';
    }

    recommendationCopy.textContent = `${eventType} for ${guests.toLocaleString()} guests works well with ${cuisines.length ? cuisines.join(' + ') : 'Asian + Western'} selections.`;
    recommendationMenu.textContent = suggestion;
  };

  const loadCatalogAvailability = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/services/1', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const service = await response.json();
      const valid = Number(service?.id) === 1 && String(service?.name || '').toLowerCase() === 'catering';
      if (!valid) throw new Error('Invalid catering catalog response');

      catalogAvailability = service?.available ? 'available' : 'unavailable';
      applyAvailabilityState();
    } catch (error) {
      catalogAvailability = 'fallback';
      applyAvailabilityState();
      console.log('Catering catalog unavailable; using frontend fallback.');
    }
  };

  const loadDiningStyleCatalog = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/dining-styles', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const catalog = await response.json();
      if (!Array.isArray(catalog) || catalog.length !== 8) {
        throw new Error('Invalid dining-style catalog response');
      }

      const unmatched = [];
      catalog.forEach((style) => {
        const input = styleInputs.find((candidate) => candidate.value === style.name);
        if (!input) {
          unmatched.push(style.name);
          return;
        }

        input.dataset.backendDiningStyleId = String(style.id);
        input.dataset.styleKey = style.key;
        input.dataset.catalogAvailable = String(style.available !== false);
        input.disabled = style.available === false;
        stylePrices[style.name] = Number(style.pricePerGuest || 0);

        const priceEl = input.closest('.choice-card')?.querySelector('.text-gold');
        if (priceEl) priceEl.textContent = `${formatMoney(style.pricePerGuest)} / guest`;
      });

      if (unmatched.length) throw new Error(`Unmatched dining styles: ${unmatched.join(', ')}`);
      diningStyleCatalogState = 'ready';
    } catch (error) {
      diningStyleCatalogState = 'failed';
      console.log('Catering dining-style catalog unavailable; Save is disabled.');
    }
  };

  const loadAddonCatalog = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/addons', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const catalog = await response.json();
      if (!Array.isArray(catalog) || catalog.length < addons.length) {
        throw new Error('Invalid add-on catalog response');
      }

      const byName = new Map(catalog.map((addon) => [String(addon.name || '').trim(), addon]));
      addons.forEach((addon) => {
        const backendAddon = byName.get(addon.name);
        addon.backendAddonId = backendAddon?.id || null;
        addon.backendAvailable = Boolean(backendAddon && backendAddon.available !== false);
        addon.available = addon.backendAvailable;
        if (backendAddon) {
          addon.price = Number(backendAddon.price || 0);
          addon.billingType = backendAddon.billingType;
          addon.pricingType = billingTypeToPricingType(backendAddon.billingType);
          addon.description = backendAddon.description || addon.description;
        }
      });

      if (addons.some((addon) => !addon.backendAddonId)) {
        throw new Error('One or more active add-ons are not mapped');
      }
      addonCatalogState = 'ready';
    } catch (error) {
      addonCatalogState = 'failed';
      console.log('Catering add-on catalog unavailable; Save is disabled.');
    }
  };

  const loadAuthoritativeCatalogs = async () => {
    await Promise.all([loadDiningStyleCatalog(), loadAddonCatalog()]);
    catalogAuthorityReady = diningStyleCatalogState === 'ready' && addonCatalogState === 'ready';
    applyAvailabilityState();
    syncAndRender();
  };

  const loadFoodCatalog = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/food', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const catalog = await response.json();
      if (!Array.isArray(catalog)) {
        throw new Error('Invalid food catalog response');
      }

      foodCatalog.clear();
      catalog.forEach((food) => {
        const id = Number(food?.id || 0);
        if (Number.isFinite(id) && id > 0) {
          foodCatalog.set(id, food);
        }
      });

      const warnings = [];
      foods.forEach((food) => {
        const backendFood = getBackendFood(food);
        if (!food.backendFoodId || !backendFood) {
          food.backendAvailable = false;
          warnings.push(`${food.name}: missing backend food mapping (${food.backendFoodId || 'none'})`);
          return;
        }

        food.backendAvailable = backendFood.available !== false;

        const backendName = String(backendFood.name || '').trim();
        if (backendName && backendName !== food.name) {
          warnings.push(`${food.name}: backend name mismatch (${backendName})`);
        }

        const backendPrice = Number(backendFood.pricePerGuest || 0);
        const frontendPrice = Number(food.pricePerGuest || 0);
        if (Number.isFinite(backendPrice) && backendPrice > 0) {
          if (backendPrice !== frontendPrice) {
            warnings.push(`${food.name}: price mismatch frontend=${frontendPrice} backend=${backendPrice}`);
          }
          food.pricePerGuest = backendPrice;
        }
      });

      foodCatalogWarnings = warnings;
      foodCatalogState = 'ready';
      if (warnings.length) {
        console.warn('Catering food catalog integrity warnings:', warnings);
      }
      syncAndRender();
    } catch (error) {
      foodCatalogState = 'fallback';
      console.log('Catering food catalog unavailable; using frontend fallback.');
      syncAndRender();
    }
  };

  const applyRecommendation = () => {
    const recommendedFoods = [
      'spring-rolls',
      'chicken-biryani',
      'butter-chicken',
      'fried-rice',
      'naan',
      'fruit-platter',
      'soft-drinks',
      'fresh-juice'
    ];
    const recommendedAddons = ['premium-beverage-package', 'dessert-station', 'live-chef-station'];

    recommendedFoods.forEach((id) => {
      if (!state.foods.includes(id)) state.foods.push(id);
    });
    recommendedAddons.forEach((id) => {
      if (!state.addons.includes(id)) state.addons.push(id);
    });

    syncAndRender();
  };

  cuisineChecks.forEach((input) => {
    input.checked = state.cuisines.includes(input.value);
  });
  dietChecks.forEach((input) => {
    input.checked = state.dietary.includes(input.value);
  });
  styleInputs.forEach((input) => {
    input.checked = input.value === state.style;
  });

  renderAddonGroup('beverage');
  renderAddonGroup('dessert');
  renderAddonGroup('specialty');
  renderAddonGroup('traditional');
  syncAndRender();

  foodGrid?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-food-toggle]');
    if (!button) return;
    toggleFood(button.dataset.foodToggle);
  });

  Object.values(addonGroups).forEach((group) => {
    group?.addEventListener('change', (event) => {
      const addon = event.target.closest('[data-addon]');
      if (!addon) return;
      toggleAddon(addon.value);
    });
  });

  [cuisineFilter, categoryFilter, dietFilter, searchInput].forEach((input) => {
    input?.addEventListener('input', syncAndRender);
    input?.addEventListener('change', syncAndRender);
  });

  styleInputs.forEach((input) => {
    input.addEventListener('change', () => {
      styleInputs.forEach((other) => {
        other.closest('.choice-card')?.classList.toggle('selected', other.checked);
      });
      refreshRecommendationCopy();
      calculate();
    });
  });

  cuisineChecks.forEach((input) => input.addEventListener('change', () => {
    refreshRecommendationCopy();
    syncAndRender();
  }));
  dietChecks.forEach((input) => input.addEventListener('change', calculate));
  [eventTypeSelect, guestInput, notesInput].forEach((input) => {
    input?.addEventListener('input', () => {
      refreshRecommendationCopy();
      calculate();
    });
    input?.addEventListener('change', () => {
      refreshRecommendationCopy();
      calculate();
    });
  });

  recommendBtn?.addEventListener('click', applyRecommendation);

  saveBtn?.addEventListener('click', () => {
    const result = persist();
    if (!result) return;
    saveBtn.textContent = 'Catering Saved';
    window.setTimeout(() => {
      saveBtn.textContent = 'Save Catering';
    }, 1200);
  });

  continueBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    const result = persist();
    if (!result) return;
    window.location.href = '/prototype/customer/review.html';
  });

  refreshRecommendationCopy();
  calculate();
  loadCatalogAvailability();
  loadAuthoritativeCatalogs();
  loadFoodCatalog();
});
