// Mock AI recommendation engine — purely client-side placeholder logic
const CATALOG = [
  { name: 'Eternal Vows Wedding', type: 'wedding', min: 12000, guests: 250, venue: 'Lumière Ballroom', style: 'classic' },
  { name: 'Garden Whisper Wedding', type: 'wedding', min: 8500, guests: 150, venue: 'Willow Garden Estate', style: 'rustic' },
  { name: 'Golden Hour Engagement', type: 'engagement', min: 4200, guests: 80, venue: 'Skyline Terrace', style: 'modern' },
  { name: 'Confetti Birthday Bash', type: 'birthday', min: 2400, guests: 60, venue: 'The Atrium Loft', style: 'modern' },
  { name: 'Boardroom Prestige', type: 'corporate', min: 6800, guests: 200, venue: 'Meridian Conference Hall', style: 'minimal' },
  { name: 'Cap & Gown Celebration', type: 'graduation', min: 3100, guests: 120, venue: 'Willow Garden Estate', style: 'rustic' },
  { name: 'Silver Anniversary Soirée', type: 'anniversary', min: 5400, guests: 100, venue: 'Lumière Ballroom', style: 'classic' }
];
const MENUS = { classic: 'Plated 4-course · Beef Wellington', rustic: 'Farm-table buffet · Wood-fired mains', modern: 'Live stations · Fusion small plates', minimal: 'Working lunch · Seasonal bowls' };

export function recommend({ type, guests, budget, style }) {
  const scored = CATALOG.map((p) => {
    let score = 40;
    if (p.type === type) score += 35;
    if (p.style === style) score += 12;
    score += Math.max(0, 15 - Math.abs(p.guests - guests) / 20);
    if (budget >= p.min) score += 10; else score -= 18;
    return { ...p, score: Math.max(38, Math.min(98, Math.round(score))) };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  const est = Math.round((Number(guests) * 45 + scored[0].min * 0.35) / 50) * 50;
  return {
    picks: scored,
    estimate: est,
    menu: MENUS[style] || MENUS.classic,
    notes: [
      `${guests} guests fits ${scored[0].venue} comfortably`,
      budget >= scored[0].min ? 'Budget aligns with premium décor' : 'Consider trimming floral scope to fit budget',
      'Book 4–6 months ahead for weekend dates'
    ]
  };
}

export function renderResult(el, data, guests) {
  el.classList.remove('d-none');
  el.innerHTML = `
    <div class="eyebrow mb-2">AI recommendation</div>
    <h3 class="mb-1">${data.picks[0].name}</h3>
    <p class="text-ink-soft small mb-3">Best match for your brief · suggested venue <strong>${data.picks[0].venue}</strong></p>
    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3"><div class="stat-label">Match</div><div class="bb-price">${data.picks[0].score}%</div></div>
      <div class="col-6 col-md-3"><div class="stat-label">Estimate</div><div class="bb-price">$${data.estimate.toLocaleString()}</div></div>
      <div class="col-6 col-md-3"><div class="stat-label">Guests</div><div class="bb-price">${guests}</div></div>
      <div class="col-6 col-md-3"><div class="stat-label">Menu</div><div class="small pt-2">${data.menu}</div></div>
    </div>
    <div class="mb-3">${data.notes.map((n) => `<span class="ai-chip">${n}</span>`).join('')}</div>
    <div class="row g-3">
      ${data.picks.slice(1).map((p) => `
        <div class="col-md-6"><div class="bb-card"><div class="bb-card__body">
          <span class="bb-badge gold">${p.score}% match</span>
          <h5 class="mt-2 mb-1">${p.name}</h5>
          <p class="small text-ink-soft mb-0">${p.venue} · from $${p.min.toLocaleString()}</p>
        </div></div></div>`).join('')}
    </div>
    <div class="mt-4 d-flex flex-wrap gap-2">
      <a class="btn btn-gold" href="/prototype/customer/booking.html">Book this package</a>
      <a class="btn btn-outline-forest" href="/prototype/customer/consultation.html">Talk to a planner</a>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#aiForm');
  if (!form) return;
  const out = document.querySelector('#aiResult');
  const loader = document.querySelector('#aiLoading');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = { type: fd.get('type'), guests: Number(fd.get('guests')) || 100, budget: Number(fd.get('budget')) || 5000, style: fd.get('style') };
    out.classList.add('d-none');
    loader.classList.remove('d-none');
    setTimeout(() => {
      loader.classList.add('d-none');
      renderResult(out, recommend(payload), payload.guests);
    }, 900);
  });
});
