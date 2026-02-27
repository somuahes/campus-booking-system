const API = "https://campus-booking-system-ve16.onrender.com";
document.getElementById("apiUrl").textContent = API;


const el = (id) => document.getElementById(id);

let facilitiesCache = [];
let bookingsCache = [];

// Multi-slot selection
let slotSelectionStart = null;
let slotSelectionEnd = null;
let allSlots = [];

const CURRENT_USER_ID = 1;
let editingBookingId = null;
const updateModalEl = document.getElementById('updateBookingModal');
let updateModal = null;
if (updateModalEl && window.bootstrap) updateModal = new bootstrap.Modal(updateModalEl);

// =========================================================
// ICON LIBRARY — pure text / Unicode so SVGs don't block clicks
// =========================================================
// NOTE: we use role="img" aria-hidden="true" text spans so nothing
//       in the button intercepts pointer events.
function icon(ch, title = '') {
  return `<span class="ic" aria-hidden="true" style="pointer-events:none;font-style:normal;line-height:1;">${ch}</span>`;
}
const IC = {
  calendar: '&#x1F4C5;', // 📅
  clock: '&#x23F0;',  // ⏰
  note: '&#x1F4DD;', // 📝
  edit: '&#x270E;',  // ✎
  cancel: '&#x2715;',  // ✕
  trash: '&#x1F5D1;', // 🗑
  check: '&#x2713;',  // ✓
  cross: '&#x2717;',  // ✗
  pin: '&#x25CE;',  // ◎  (location dot)
  users: '&#x22EF;',  // ⋯  (capacity dots)
  flash: '&#x26A1;',  // ⚡
  building: '&#x25A3;',  // ▣  (generic building)
  warning: '&#x26A0;',  // ⚠
  inbox: '&#x1F4EC;', // 📬
  refresh: '&#x21BB;',  // ↻
  search: '&#x2315;',  // ⌕
  booking: '&#x25A4;',  // ▤
  available: '&#x25CF;',  // ● green dot (styled via class)
  unavailable: '&#x25CB;',  // ○ red dot
  star: '&#x2605;',  // ★
  time: '&#x25B7;',  // ▷ upcoming
};

// =========================================================
// FACILITY TYPE GRADIENT
// =========================================================
function getFacilityStyle(name) {
  const n = (name || '').toLowerCase();
  if (n.match(/lab|computer|science|tech/))
    return { symbol: '&#x1F5A5;', gradient: 'linear-gradient(135deg,#1E40AF 0%,#2563EB 100%)' };
  if (n.match(/sport|gym|court|pool|field|track/))
    return { symbol: '&#x26BD;', gradient: 'linear-gradient(135deg,#064E3B 0%,#10B981 100%)' };
  if (n.match(/lecture|class|auditor|seminar/))
    return { symbol: '&#x1F393;', gradient: 'linear-gradient(135deg,#5B21B6 0%,#A78BFA 100%)' };
  if (n.match(/library|study|reading/))
    return { symbol: '&#x1F4DA;', gradient: 'linear-gradient(135deg,#78350F 0%,#FBBF24 100%)' };
  if (n.match(/meeting|conference|board/))
    return { symbol: '&#x1F91D;', gradient: 'linear-gradient(135deg,#0C4A6E 0%,#38BDF8 100%)' };
  if (n.match(/dorm|resident|hostel|hall of/))
    return { symbol: '&#x1F3E0;', gradient: 'linear-gradient(135deg,#6D28D9 0%,#DB2777 100%)' };
  if (n.match(/engin|block/))
    return { symbol: '&#x2692;', gradient: 'linear-gradient(135deg,#1E3A5F 0%,#06B6D4 100%)' };
  return { symbol: '&#x1F3DB;', gradient: 'linear-gradient(135deg,#1A3A52 0%,#06B6D4 100%)' };
}

// =========================================================
// FACILITY TYPE for max-duration
// =========================================================
function getFacilityType(facilityId) {
  const f = facilitiesCache.find(x => x.id === facilityId);
  if (!f) return 'academic';
  const n = (f.name || '').toLowerCase();
  if (n.match(/dorm|resident|hostel|hall of/)) return 'residential';
  return 'academic';
}

// =========================================================
// MODALS / TOAST / ALERT
// =========================================================
const confirmModalEl = document.getElementById('confirmModal');
const alertModalEl = document.getElementById('alertModal');
let confirmModal = null, alertModal = null;
if (window.bootstrap) {
  if (confirmModalEl) confirmModal = new bootstrap.Modal(confirmModalEl);
  if (alertModalEl) alertModal = new bootstrap.Modal(alertModalEl);
}

function showAlert(title, message) {
  if (!alertModalEl) { toast(message, 'info'); return; }
  document.getElementById('alertModalTitle').textContent = title || 'Notice';
  document.getElementById('alertModalBody').innerHTML = message;
  alertModal.show();
}

function showConfirm(message) {
  return new Promise(resolve => {
    if (!confirmModalEl) { resolve(window.confirm(message)); return; }
    const body = document.getElementById('confirmModalBody');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    body.textContent = message;
    const cleanup = () => { okBtn.onclick = null; cancelBtn.onclick = null; };
    okBtn.onclick = () => { cleanup(); confirmModal.hide(); resolve(true); };
    cancelBtn.onclick = () => { cleanup(); confirmModal.hide(); resolve(false); };
    confirmModal.show();
  });
}

function toast(html, type = 'info') {
  const msgEl = el('msg');
  if (!msgEl) return;
  const cls = type === 'success' ? 'alert-success'
    : type === 'danger' ? 'alert-danger'
      : type === 'warning' ? 'alert-warning'
        : 'alert-info';
  msgEl.innerHTML = `<div class="alert ${cls}" role="alert">${html}</div>`;
  clearTimeout(msgEl._timer);
  msgEl._timer = setTimeout(() => { msgEl.innerHTML = ''; }, 5000);
}

// =========================================================
// FRIENDLY ERROR PARSER
// =========================================================
async function friendlyError(responseOrError, context) {
  if (responseOrError && typeof responseOrError.json === 'function') {
    try {
      const data = await responseOrError.clone().json();
      if (data && data.message) return data.message;
      if (data && data.error) return data.error;
    } catch (_) { }
    const status = responseOrError.status;
    if (status === 404) return 'Booking or facility not found.';
    if (status === 409) return 'That time slot is already taken. Please choose a different time.';
    if (status === 400) return 'Invalid request — please check your details and try again.';
    if (status === 500) return 'Server issue. Please try again in a moment.';
  }
  if (responseOrError instanceof Error) {
    const msg = responseOrError.message || '';
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror'))
      return 'Cannot reach the server. Please ensure the backend is running and try again.';
    if (msg.toLowerCase().includes('already cancelled'))
      return 'This booking is already cancelled. No further action needed.';
  }
  if (context === 'cancel') return 'Failed to cancel booking. Please try again.';
  if (context === 'delete') return 'Failed to remove booking. Please try again.';
  if (context === 'create') return 'Failed to create booking. Please check your details and try again.';
  if (context === 'update') return 'Failed to update booking. Please check your details and try again.';
  return 'Something went wrong. Please try again.';
}

// =========================================================
// TAB MANAGEMENT
// =========================================================
function showTab(key) {
  ['facilities', 'availability', 'create', 'history'].forEach(s => {
    const sec = document.getElementById('section-' + s);
    const btn = document.getElementById('tab-' + s + '-btn');
    if (sec) sec.classList.toggle('active', s === key);
    if (btn) btn.classList.toggle('active', s === key);
  });
  document.querySelectorAll('.nav-links a[data-tab]').forEach(a => {
    a.classList.toggle('active-nav', a.dataset.tab === key);
  });
}
document.addEventListener('DOMContentLoaded', () => showTab('facilities'));

// =========================================================
// DATA HELPERS
// =========================================================
function normalizeBooking(b) {
  const facilityId = b.facilityId ?? b.facility_id ?? b.facility?.id ?? b.facility;
  const userId = b.userId ?? b.user_id ?? b.user?.id ?? b.user;
  const startTime = b.startTime ?? b.start_time;
  const endTime = b.endTime ?? b.end_time;
  return {
    id: b.id,
    facilityId: Number(facilityId),
    userId: Number(userId),
    date: b.date,
    startTime,
    endTime,
    status: b.status,
    purpose: b.purpose
  };
}

function getFacilityName(facilityId) {
  const f = facilitiesCache.find(x => x.id === facilityId);
  return f ? f.name : `Facility #${facilityId}`;
}

function timeOverlap(aS, aE, bS, bE) { return aS < bE && aE > bS; }

function generateSlots() {
  const slots = [];
  let h = 8, m = 0;
  while (h < 20) {
    const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    m += 30;
    if (m === 60) { m = 0; h++; }
    const end = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ start, end });
  }
  return slots;
}

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

// Count booked slots for a facility on a given date
function countBookedSlots(facilityId, date) {
  const slots = generateSlots();
  const active = bookingsCache.map(normalizeBooking).filter(b =>
    b.facilityId === facilityId &&
    b.date === date &&
    String(b.status).toLowerCase() !== 'cancelled'
  );
  return slots.filter(s => active.some(b => timeOverlap(s.start, s.end, b.startTime, b.endTime))).length;
}

// =========================================================
// API CALLS
// =========================================================
async function fetchFacilities() {
  const res = await fetch(`${API}/facilities`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchBookings() {
  for (const url of [`${API}/bookings`, `${API}/booking`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) { /* try next */ }
  }
  throw new Error('Could not fetch bookings');
}

async function postBooking(payload) {
  const res = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text);
    err._response = res;
    throw err;
  }
  try { return JSON.parse(text); } catch { return text; }
}

// =========================================================
// POPULATE DROPDOWNS
// =========================================================
function populateFacilityDropdowns() {
  const options = facilitiesCache
    .map(f => `<option value="${f.id}">${f.name}</option>`)
    .join('');

  const ids = ['facilityId', 'availFacilitySelect', 'updateFacilityId'];
  ids.forEach(id => {
    const sel = el(id);
    if (!sel) return;
    if (id === 'updateFacilityId') { sel.innerHTML = options; return; }
    sel.innerHTML = `<option value="">Select a facility…</option>` + options;
  });

  const fsel = el('facilitySelect');
  if (fsel) fsel.innerHTML = `<option value="">All Facilities</option>` + options;
}

// =========================================================
// FACILITY CARDS — with date availability
// =========================================================
function renderFacilitiesList() {
  populateFacilityDropdowns();

  const filterVal = (el('facilitySelect')?.value || '').toString();
  const filterDate = el('facilityDate')?.value || new Date().toISOString().slice(0, 10);
  const TOTAL_SLOTS = generateSlots().length; // 24 half-hour slots

  const list = filterVal
    ? facilitiesCache.filter(f => String(f.id) === filterVal)
    : facilitiesCache;

  if (!list.length) {
    el('facilityCards').innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.warning}</div><p>No facilities found.</p></div>`;
    return;
  }

  el('facilityCards').innerHTML = list.map(f => {
    const style = getFacilityStyle(f.name);
    const bookedCnt = countBookedSlots(f.id, filterDate);
    const pct = Math.round((bookedCnt / TOTAL_SLOTS) * 100);
    const isFull = bookedCnt >= TOTAL_SLOTS;
    const statusLabel = isFull
      ? `<span class="fac-unavail">&#x2715; Fully Booked</span>`
      : bookedCnt > 0
        ? `<span class="fac-partial">&#x25D1; ${pct}% Booked</span>`
        : `<span class="fac-avail">&#x2713; Available</span>`;

    // Occupancy bar
    const barColor = pct >= 90 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#10B981';
    const occupancyBar = `
      <div class="occ-bar-wrap" title="${bookedCnt} of ${TOTAL_SLOTS} slots booked">
        <div class="occ-bar-track">
          <div class="occ-bar-fill" style="width:${pct}%;background:${barColor};"></div>
        </div>
        <span class="occ-label">${pct}% occupied</span>
      </div>`;

    return `
      <div class="facility-card${isFull ? ' card-full' : ''}" onclick="quickBookFacility(${f.id})">
        <div class="facility-image" style="background:${style.gradient};">
          <div class="facility-icon-overlay" style="pointer-events:none;font-size:2.8rem;">${style.symbol}</div>
          <span class="facility-badge${isFull ? ' unavailable' : ''}">${isFull ? 'Fully Booked' : 'Open'}</span>
        </div>
        <div class="facility-info">
          <div class="facility-name">${f.name}</div>
          <div class="facility-meta">
            <div class="facility-meta-item">&#x25CE; ${f.location || 'Campus'}</div>
            <div class="facility-meta-item">&#x22EF; Capacity: ${f.capacity || 'N/A'}</div>
          </div>
          <div class="facility-status-row">${statusLabel}</div>
          ${occupancyBar}
          ${f.description ? `<div class="fac-desc">${f.description}</div>` : ''}
          <button class="btn-facility${isFull ? ' btn-facility-full' : ''}"
                  onclick="event.stopPropagation();quickBookFacility(${f.id})"
                  ${isFull ? 'style="opacity:0.6;"' : ''}>
            &#x26A1; ${isFull ? 'View Slots' : 'Book This Facility'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.quickBookFacility = (facilityId) => {
  showTab('create');
  const fEl = el('facilityId');
  if (fEl) fEl.value = facilityId;
  if (el('date') && !el('date').value)
    el('date').value = new Date().toISOString().slice(0, 10);
  const section = document.getElementById('section-create');
  if (section) {
    const top = section.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

// =========================================================
// BOOKING HISTORY with STATS
// =========================================================
function renderBookings() {
  const filterText = (el('filterText')?.value || '').toLowerCase().trim();
  const filterStatus = el('filterStatus')?.value || '';

  const allMine = bookingsCache
    .map(normalizeBooking)
    .filter(b => b.userId === CURRENT_USER_ID);

  // --- Stats bar ---
  const total = allMine.length;
  const confirmed = allMine.filter(b => String(b.status).toLowerCase() === 'confirmed').length;
  const cancelled = allMine.filter(b => String(b.status).toLowerCase() === 'cancelled').length;
  const pending = allMine.filter(b => String(b.status).toLowerCase() === 'pending').length;
  const statsEl = el('bookingStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stats-pill">&#x25A4; <b>${total}</b> Total</div>
      <div class="stats-pill stats-pill-green">&#x2713; <b>${confirmed}</b> Confirmed</div>
      ${pending > 0 ? `<div class="stats-pill stats-pill-yellow">&#x23F3; <b>${pending}</b> Pending</div>` : ''}
      <div class="stats-pill stats-pill-red">&#x2715; <b>${cancelled}</b> Cancelled</div>
    `;
  }

  // --- Upcoming today (using GMT/UTC time) ---
  const nowUTC = new Date();
  const today = nowUTC.toISOString().slice(0, 10);
  const nowMins = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();
  const upcomingToday = allMine.filter(b => {
    const bookingDate = String(b.date).split('T')[0];
    return bookingDate === today &&
      String(b.status).toLowerCase() !== 'cancelled' &&
      toMinutes(b.startTime) >= nowMins;
  });
  const upcomingEl = el('upcomingToday');
  if (upcomingEl) {
    upcomingEl.innerHTML = upcomingToday.length
      ? upcomingToday.map(b => `
          <div class="upcoming-item">
            <span class="upcoming-dot"></span>
            <span><b>${getFacilityName(b.facilityId)}</b> &nbsp; ${b.startTime}–${b.endTime}</span>
            ${b.purpose ? `<span class="upcoming-purpose">&nbsp;— ${b.purpose}</span>` : ''}
          </div>`).join('')
      : `<p style="color:var(--gray-dark);font-size:0.88rem;margin:0;">No more bookings for today.</p>`;
  }

  // --- Filtered list ---
  const items = allMine
    .filter(b => !filterStatus || String(b.status).toLowerCase() === filterStatus)
    .filter(b => {
      if (!filterText) return true;
      const fn = getFacilityName(b.facilityId).toLowerCase();
      return String(b.id).includes(filterText) ||
        fn.includes(filterText) ||
        String(b.status).toLowerCase().includes(filterText) ||
        String(b.date).includes(filterText) ||
        (b.purpose || '').toLowerCase().includes(filterText);
    })
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  if (!items.length) {
    el('bookings').innerHTML = `<div class="empty-state"><div class="empty-icon" style="font-size:2rem;">&#x1F4EC;</div><p>No bookings found. Try adjusting your filters.</p></div>`;
    return;
  }

  el('bookings').innerHTML = items.map(b => {
    const status = String(b.status || '').toLowerCase();
    const badgeClass = status === 'confirmed' ? 'badge-confirmed'
      : status === 'cancelled' ? 'badge-cancelled'
        : 'badge-pending';
    const facilityName = getFacilityName(b.facilityId);
    const purposeText = b.purpose ? ` &nbsp;&#x1F4DD; ${b.purpose}` : '';

    // Extract just the date part (handle ISO dates like "2026-02-25" or "2026-02-25T00:00:00")
    const bookingDate = String(b.date).split('T')[0];
    const isToday = bookingDate === today;

    // Time-until for today's confirmed bookings
    let timeUntil = '';
    const isOngoing = isToday && toMinutes(b.startTime) <= nowMins && toMinutes(b.endTime) > nowMins;
    if (isToday && status === 'confirmed') {
      const diff = toMinutes(b.startTime) - nowMins;
      if (diff > 0 && diff <= 120)
        timeUntil = `<span class="time-until">in ${diff} min</span>`;
      else if (isOngoing)
        timeUntil = `<span class="time-until ongoing">Ongoing</span>`;
    }

    const canCancel = (status === 'confirmed' || status === 'pending') && !isOngoing;
    const canEdit = status !== 'cancelled' && b.userId === CURRENT_USER_ID && !isOngoing;
    const isCancelled = status === 'cancelled';

    // IMPORTANT: buttons use plain text — no SVG children to intercept clicks
    const editBtn = canEdit
      ? `<button class="btn-sm-action btn-sm-edit"   onclick="openUpdateModal(${b.id})">&#x270E; Edit</button>` : '';
    const cancelBtn = canCancel
      ? `<button class="btn-sm-action btn-sm-cancel" onclick="cancelBooking(${b.id})">&#x2715; Cancel</button>` : '';
    const deleteBtn = isCancelled
      ? `<button class="btn-sm-action btn-sm-delete" onclick="deleteBooking(${b.id})">&#x1F5D1; Delete</button>` : '';

    return `
      <div class="booking-item" id="booking-row-${b.id}">
        <div class="booking-item-header">
          <div class="booking-item-info">
            <h5>&#x25A4; Booking #${b.id} &mdash; ${facilityName} ${timeUntil}</h5>
            <div class="meta">
              &#x1F4C5; ${b.date} &nbsp; &#x23F0; ${b.startTime}&ndash;${b.endTime}${purposeText}
            </div>
          </div>
          <div class="booking-item-actions">
            <span class="badge-status ${badgeClass}">${b.status}</span>
            ${editBtn}
            ${cancelBtn}
            ${deleteBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

// =========================================================
// AVAILABILITY SLOTS — uniform bright highlight
// =========================================================
function clearSlotSelection() {
  slotSelectionStart = null;
  slotSelectionEnd = null;
  document.querySelectorAll('.slot-chip').forEach(c =>
    c.classList.remove('selected', 'in-range', 'range-end')
  );
}

function updateSlotRangeHighlight() {
  document.querySelectorAll('.slot-chip').forEach(c =>
    c.classList.remove('selected', 'in-range', 'range-end')
  );
  if (!slotSelectionStart) return;

  const lo = allSlots.findIndex(s => s.start === slotSelectionStart.start);
  const hi = slotSelectionEnd
    ? allSlots.findIndex(s => s.start === slotSelectionEnd.start)
    : lo;

  allSlots.forEach((s, i) => {
    const chip = document.getElementById(`slot-${s.start.replace(':', '-')}`);
    if (!chip) return;
    if (i === lo) chip.classList.add('selected');
    else if (i > lo && i < hi) chip.classList.add('in-range');
    else if (i === hi && hi !== lo) chip.classList.add('range-end');
  });

  // Update hint
  const startSlot = allSlots[lo];
  const endSlot = allSlots[hi];
  const dMins = toMinutes(endSlot.end) - toMinutes(startSlot.start);
  const h = Math.floor(dMins / 60), m = dMins % 60;
  const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  const hint = el('slotHint');
  if (hint) {
    hint.innerHTML = slotSelectionEnd
      ? `<span class="hint-selected">&#x2713; ${startSlot.start} &ndash; ${endSlot.end} &nbsp;(${dur}) &nbsp;&mdash;&nbsp; click "Quick Book" to proceed</span>`
      : `<span class="hint-partial">Start: ${startSlot.start} &mdash; click a second slot to set range end</span>`;
  }
}

function renderSlots(availability) {
  allSlots = availability;
  clearSlotSelection();

  el('slots').innerHTML = availability.map(s => `
    <button class="slot-chip ${s.available ? 'free' : 'busy'}"
            ${s.available ? '' : 'disabled'}
            id="slot-${s.start.replace(':', '-')}"
            onclick="window.__pickSlot('${s.start}','${s.end}',${s.available})">
      <span style="pointer-events:none;">${s.start}&ndash;${s.end}</span>
      <span class="slot-ic" style="pointer-events:none;">${s.available ? '&#x2713;' : '&#x2717;'}</span>
    </button>`).join('');

  const hint = el('slotHint');
  if (hint) hint.innerHTML = 'Click a green slot to start your selection, then click a second slot for the end of your range.';
}

window.__pickSlot = (start, end, available) => {
  if (!available) return;

  const facilityId = Number(el('availFacilitySelect')?.value);
  const maxMins = getFacilityType(facilityId) === 'residential' ? 24 * 60 : 6 * 60;
  const maxLabel = getFacilityType(facilityId) === 'residential' ? '24 hours' : '6 hours';

  if (!slotSelectionStart) {
    slotSelectionStart = { start, end };
    slotSelectionEnd = null;
    updateSlotRangeHighlight();
    return;
  }

  const startIdx = allSlots.findIndex(s => s.start === slotSelectionStart.start);
  const clickedIdx = allSlots.findIndex(s => s.start === start);

  // Same slot = deselect
  if (clickedIdx === startIdx) {
    clearSlotSelection();
    const hint = el('slotHint');
    if (hint) hint.innerHTML = 'Click a green slot to start your selection.';
    return;
  }

  const lo = Math.min(startIdx, clickedIdx);
  const hi = Math.max(startIdx, clickedIdx);

  // All slots free?
  if (allSlots.slice(lo, hi + 1).some(s => !s.available)) {
    toast('One or more slots in that range are unavailable. Please choose a continuous free range.', 'warning');
    return;
  }

  // Duration check
  const dMins = toMinutes(allSlots[hi].end) - toMinutes(allSlots[lo].start);
  if (dMins > maxMins) {
    toast(`Maximum booking for this space is ${maxLabel}. Please select a shorter range.`, 'warning');
    return;
  }

  slotSelectionStart = allSlots[lo];
  slotSelectionEnd = allSlots[hi];
  updateSlotRangeHighlight();
};

// =========================================================
// LOAD ACTIONS
// =========================================================
async function loadFacilities() {
  try {
    facilitiesCache = await fetchFacilities();
    renderFacilitiesList();
  } catch (e) {
    el('facilityCards').innerHTML = `<div class="empty-state"><div class="empty-icon">&#x26A0;</div><p>Could not load facilities. Is the backend running?</p></div>`;
  }
}

async function loadBookings() {
  try {
    bookingsCache = await fetchBookings();
    renderBookings();
    renderFacilitiesList(); // refresh occupancy after bookings load
  } catch (e) {
    if (el('bookings')) el('bookings').innerHTML = `<div class="empty-state"><div class="empty-icon">&#x26A0;</div><p>Could not load bookings. Please refresh.</p></div>`;
  }
}

async function loadAvailability() {
  clearSlotSelection();
  const facilityId = Number(el('availFacilitySelect')?.value);
  const date = el('availDate')?.value;

  if (!facilityId || !date) {
    if (el('slots')) el('slots').innerHTML = `<div class="empty-state" style="padding:24px;"><div class="empty-icon">&#x1F4C5;</div><p>Pick a facility and date to see available slots.</p></div>`;
    return;
  }

  const active = bookingsCache.map(normalizeBooking).filter(b => {
    const bookingDate = String(b.date).split('T')[0];
    return b.facilityId === facilityId &&
      bookingDate === date &&
      String(b.status).toLowerCase() !== 'cancelled';
  });

  const slots = generateSlots();

  // Use GMT/UTC time to determine if slots are in the past
  const nowUTC = new Date();
  const selectedDate = date; // date format: "YYYY-MM-DD"
  const todayUTC = nowUTC.toISOString().slice(0, 10);
  const nowMinsUTC = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();

  const availability = slots.map(s => {
    const isBooked = active.some(b => timeOverlap(s.start, s.end, b.startTime, b.endTime));
    const isPast = selectedDate === todayUTC && toMinutes(s.end) <= nowMinsUTC;
    return {
      ...s,
      available: !isBooked && !isPast
    };
  });

  renderSlots(availability);
}

// =========================================================
// CREATE BOOKING
// =========================================================
async function createBooking() {
  const payload = {
    facilityId: Number(el('facilityId')?.value),
    userId: CURRENT_USER_ID,
    date: el('date')?.value,
    startTime: el('startTime')?.value,
    endTime: el('endTime')?.value,
    purpose: el('purpose')?.value || null
  };

  if (!payload.facilityId || !payload.date || !payload.startTime || !payload.endTime) {
    toast('Please fill <b>Facility</b>, <b>Date</b>, <b>Start Time</b>, and <b>End Time</b>.', 'warning');
    return;
  }
  if (payload.startTime >= payload.endTime) {
    toast('End time must be after start time.', 'warning');
    return;
  }

  const facilityName = getFacilityName(payload.facilityId);
  try {
    el('btnCreateBooking').disabled = true;
    el('btnCreateBooking').textContent = 'Booking…';
    await postBooking(payload);
    resetForm();
    await loadBookings();
    await loadAvailability();
    if (window.showSuccessOverlay)
      showSuccessOverlay(`${facilityName} reserved on ${payload.date} from ${payload.startTime} to ${payload.endTime}.`);
  } catch (e) {
    const msg = await friendlyError(e._response || e, 'create');
    showAlert('Booking Failed', msg);
  } finally {
    if (el('btnCreateBooking')) {
      el('btnCreateBooking').disabled = false;
      el('btnCreateBooking').textContent = 'Create Booking';
    }
  }
}

// =========================================================
// CANCEL BOOKING
// =========================================================
window.cancelBooking = async function (bookingId) {
  const ok = await showConfirm('Are you sure you want to cancel this booking?');
  if (!ok) return;
  try {
    const res = await fetch(`${API}/bookings/${bookingId}/cancel`, { method: 'PUT' });
    if (!res.ok) {
      const msg = await friendlyError(res, 'cancel');
      throw Object.assign(new Error(msg), { _friendly: true });
    }
    toast('Booking cancelled successfully.', 'success');
    await loadBookings();
    await loadAvailability();
  } catch (e) {
    const msg = e._friendly ? e.message : await friendlyError(e, 'cancel');
    showAlert('Cancel Failed', msg);
  }
};

// =========================================================
// DELETE BOOKING
// =========================================================
window.deleteBooking = async (bookingId) => {
  const ok = await showConfirm('Permanently delete this cancelled booking?');
  if (!ok) return;
  try {
    const res = await fetch(`${API}/bookings/${bookingId}`, { method: 'DELETE' });
    if (!res.ok) {
      const msg = await friendlyError(res, 'delete');
      throw Object.assign(new Error(msg), { _friendly: true });
    }
    toast('Booking removed successfully.', 'success');
    const row = document.getElementById(`booking-row-${bookingId}`);
    if (row) {
      row.style.transition = 'all 0.3s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(24px)';
      setTimeout(() => row.remove(), 310);
    }
    bookingsCache = bookingsCache.filter(b => b.id !== bookingId);
    // Also remove from stats
    renderBookings();
  } catch (e) {
    const msg = e._friendly ? e.message : await friendlyError(e, 'delete');
    showAlert('Delete Failed', msg);
  }
};

// =========================================================
// OPEN UPDATE MODAL
// =========================================================
window.openUpdateModal = (bookingId) => {
  const b = bookingsCache.map(normalizeBooking).find(x => x.id === bookingId);
  if (!b) { toast('Booking not found', 'warning'); return; }
  if (b.userId !== CURRENT_USER_ID) { toast("Cannot edit others' bookings", 'danger'); return; }

  const updFac = el('updateFacilityId');
  if (updFac) updFac.value = b.facilityId;
  el('updateDate').value = b.date;
  el('updateStartTime').value = b.startTime;
  el('updateEndTime').value = b.endTime;
  el('updatePurpose').value = b.purpose || '';
  editingBookingId = bookingId;
  if (updateModal) updateModal.show();
};

window.updateBooking = async () => {
  if (!editingBookingId) return toast('No booking selected', 'warning');
  const payload = {
    userId: CURRENT_USER_ID,
    facilityId: Number(el('updateFacilityId').value),
    date: el('updateDate').value,
    startTime: el('updateStartTime').value,
    endTime: el('updateEndTime').value,
    purpose: el('updatePurpose').value || null
  };

  if (!payload.facilityId || !payload.date || !payload.startTime || !payload.endTime)
    return toast('Please fill all required fields', 'warning');
  if (payload.startTime >= payload.endTime)
    return toast('End time must be after start time', 'warning');

  try {
    const res = await fetch(`${API}/bookings/${editingBookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const msg = await friendlyError(res, 'update');
      throw Object.assign(new Error(msg), { _friendly: true });
    }
    toast('Booking updated successfully.', 'success');
    if (updateModal) updateModal.hide();
    editingBookingId = null;
    await loadBookings();
    await loadAvailability();
  } catch (e) {
    const msg = e._friendly ? e.message : await friendlyError(e, 'update');
    showAlert('Update Failed', msg);
  }
};

// =========================================================
// RESET FORM
// =========================================================
function resetForm() {
  ['date', 'startTime', 'endTime', 'purpose'].forEach(id => { if (el(id)) el(id).value = ''; });
  if (el('msg')) el('msg').innerHTML = '';
}

// =========================================================
// AUTO-FILL FROM SLOT SELECTION
// =========================================================
function autoFillBookingFromSlot() {
  const facilityId = el('availFacilitySelect')?.value;
  const date = el('availDate')?.value;

  if (!facilityId) { toast('Please select a facility in the Availability tab first.', 'warning'); return; }
  if (!slotSelectionStart) { toast('Select a slot (or range) first.', 'warning'); return; }

  const rangeStart = slotSelectionStart.start;
  const rangeEnd = slotSelectionEnd ? slotSelectionEnd.end : slotSelectionStart.end;

  showTab('create');
  if (el('facilityId')) el('facilityId').value = facilityId;
  if (date && el('date')) el('date').value = date;
  el('startTime').value = rangeStart;
  el('endTime').value = rangeEnd;

  const section = document.getElementById('section-create');
  if (section) {
    setTimeout(() => {
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }, 50);
  }
  toast(`Form filled: ${getFacilityName(Number(facilityId))} &nbsp;${rangeStart}&ndash;${rangeEnd}`, 'success');
}

// =========================================================
// FACILITY FILTER
// =========================================================
window.onFacilitySelectChange = () => renderFacilitiesList();
window.onFacilityDateChange = () => renderFacilitiesList();

// =========================================================
// WIRE BUTTONS
// =========================================================
el('btnRefreshFacilities')?.addEventListener('click', loadFacilities);
el('btnRefreshBookings')?.addEventListener('click', loadBookings);
el('btnCheckAvailability')?.addEventListener('click', loadAvailability);
el('btnCreateBooking')?.addEventListener('click', createBooking);
el('btnResetForm')?.addEventListener('click', resetForm);
el('btnAutoFillBooking')?.addEventListener('click', autoFillBookingFromSlot);
el('btnUpdateBooking')?.addEventListener('click', window.updateBooking);
el('filterText')?.addEventListener('input', renderBookings);
el('filterStatus')?.addEventListener('change', renderBookings);
el('availFacilitySelect')?.addEventListener('change', loadAvailability);
el('availDate')?.addEventListener('change', loadAvailability);

// =========================================================
// INIT
// =========================================================
(async function init() {
  const today = new Date().toISOString().slice(0, 10);
  if (el('availDate')) el('availDate').value = today;
  if (el('date')) el('date').value = today;
  if (el('facilityDate')) el('facilityDate').value = today;

  await loadFacilities();
  await loadBookings();
  await loadAvailability();
  try { showTab('facilities'); } catch (_) { }
})();