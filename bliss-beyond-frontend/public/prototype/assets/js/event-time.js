(function () {
  const FIRST_HOUR = 9;
  const LAST_HOUR = 23;

  function pad(value) { return String(value).padStart(2, '0'); }
  function valueFor(hour) { return `${pad(hour)}:00`; }
  function labelFor(hour) {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:00 ${suffix}`;
  }
  function populate(select, placeholder) {
    if (!select) return;
    select.replaceChildren(new Option(placeholder, ''));
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
      select.appendChild(new Option(labelFor(hour), valueFor(hour)));
    }
  }
  function syncEnd(start, end, placeholder) {
    if (!end) return;
    const selected = end.value;
    const startHour = Number(String(start?.value || '').slice(0, 2));
    end.replaceChildren(new Option(placeholder, ''));
    for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
      if (!Number.isInteger(startHour) || hour <= startHour) continue;
      end.appendChild(new Option(labelFor(hour), valueFor(hour)));
    }
    if ([...end.options].some((option) => option.value === selected)) end.value = selected;
  }
  function initialize(start, end, savedStart, savedEnd) {
    populate(start, 'Select start time');
    populate(end, 'Select end time');
    if (savedStart) start.value = savedStart;
    syncEnd(start, end, 'Select end time');
    if (savedEnd && [...end.options].some((option) => option.value === savedEnd)) end.value = savedEnd;
    start?.addEventListener('change', () => syncEnd(start, end, 'Select end time'));
  }
  function isWholeHour(value) { return /^(?:0[9]|1\d|2[0-3]):00$/.test(String(value || '')); }
  function format(value) {
    const hour = Number(String(value || '').slice(0, 2));
    return Number.isInteger(hour) ? labelFor(hour) : '';
  }

  window.bbEventTime = { FIRST_HOUR, LAST_HOUR, format, initialize, isWholeHour, populate, syncEnd };
}());
