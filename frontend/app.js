const API = "http://localhost:8081/api";
document.getElementById("apiUrl").textContent = API;

const el = (id) => document.getElementById(id);

let facilitiesCache = [];
let bookingsCache = [];
let selectedSlot = null;

// ---- Helpers ----
function toast(html, type = "info") {
  const cls =
    type === "success" ? "alert alert-success" :
      type === "danger" ? "alert alert-danger" :
        type === "warning" ? "alert alert-warning" :
          "alert alert-info";
  el("msg").innerHTML = `<div class="${cls} mb-0" role="alert">${html}</div>`;
}

function normalizeBooking(b) {
  // Backend might serialize differently; normalize common variants
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
    status: b.status
  };
}

function timeOverlap(aStart, aEnd, bStart, bEnd) {
  // strings "HH:MM" compare lexicographically correctly if zero-padded
  return (aStart < bEnd) && (aEnd > bStart);
}

// 30-min slots from 08:00 to 20:00
function generateSlots() {
  const slots = [];
  let h = 8, m = 0;
  while (h < 20) {
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    m += 30;
    if (m === 60) { m = 0; h += 1; }
    const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push({ start, end });
  }
  return slots;
}

// ---- API calls ----
async function fetchFacilities() {
  const res = await fetch(`${API}/facilities`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchBookings() {
  // We need the exact endpoint base for bookings
  // Most common: /api/bookings OR /api/booking
  // We'll try /bookings first, fallback to /booking
  const tryUrls = [`${API}/bookings`, `${API}/booking`];
  let lastErr = null;

  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Could not fetch bookings");
}

async function postBooking(payload) {
  const tryUrls = [`${API}/bookings`, `${API}/booking`];
  let lastErr = null;

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      // some backends return JSON, some return text
      try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Could not create booking");
}

// ---- Render ----
function renderFacilitiesList() {
  const cards = facilitiesCache.map(f => `
    <div class="p-3 bg-white border rounded-3">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">${f.name}</div>
          <div class="small-muted">${f.location}</div>
        </div>
        <div class="text-end">
          <div class="small-muted">Capacity</div>
          <div class="fw-semibold">${f.capacity}</div>
          <div class="small-muted">ID: ${f.id}</div>
        </div>
      </div>
    </div>
  `).join("");

  el("facilityCards").innerHTML = cards || `<div class="small-muted">No facilities yet.</div>`;

  // dropdown
  el("facilitySelect").innerHTML = facilitiesCache
    .map(f => `<option value="${f.id}">${f.name} (ID ${f.id})</option>`)
    .join("");

  if (facilitiesCache.length) {
    el("facilityId").value = facilitiesCache[0].id;
  }
}

function renderBookings() {
  const filterText = (el("filterText").value || "").toLowerCase().trim();
  const filterStatus = el("filterStatus").value;

  const items = bookingsCache
    .map(normalizeBooking)
    .filter(b => !filterStatus || String(b.status).toLowerCase() === filterStatus)
    .filter(b => {
      if (!filterText) return true;
      return (
        String(b.id).includes(filterText) ||
        String(b.facilityId).includes(filterText) ||
        String(b.userId).includes(filterText) ||
        String(b.status).toLowerCase().includes(filterText) ||
        String(b.date).includes(filterText)
      );
    })
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  el("bookings").innerHTML = items.map(b => {
    const status = String(b.status || "").toLowerCase();
    const badge =
      status === "confirmed" ? "badge badge-soft-success" :
        status === "cancelled" ? "badge badge-soft-danger" :
          "badge text-bg-warning";

    return `
      <div class="p-3 bg-white border rounded-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">Booking #${b.id}</div>
            <div class="small-muted">Facility ID: ${b.facilityId} • User ID: ${b.userId}</div>
            <div class="small-muted">Date: ${b.date} • ${b.startTime}–${b.endTime}</div>
          </div>
          <span class="${badge}">${b.status}</span>
        </div>
      </div>
    `;
  }).join("") || `<div class="small-muted">No bookings found.</div>`;
}

function renderSlots(availability) {
  // availability: array of {start, end, available}
  el("slots").innerHTML = availability.map(s => `
    <button class="slot-chip ${s.available ? "free" : "busy"}"
            ${s.available ? "" : "disabled"}
            onclick="window.__pickSlot('${s.start}','${s.end}', ${s.available})">
      <span class="mono">${s.start}–${s.end}</span>
      <span>${s.available ? "✅" : "❌"}</span>
    </button>
  `).join("");

  el("slotHint").textContent = selectedSlot
    ? `Selected slot: ${selectedSlot.start}–${selectedSlot.end} (click “Use selected slot to fill booking”)`
    : "Tip: Click an available slot to select it.";
}

// expose for inline onclick
window.__pickSlot = (start, end, available) => {
  if (!available) return;
  selectedSlot = { start, end };
  el("slotHint").textContent = `Selected slot: ${start}–${end}.`;
};

// ---- Actions ----
async function loadFacilities() {
  facilitiesCache = await fetchFacilities();
  renderFacilitiesList();
}

async function loadBookings() {
  bookingsCache = await fetchBookings();
  renderBookings();
}

async function loadAvailability() {
  selectedSlot = null;

  const facilityId = Number(el("facilitySelect").value);
  const date = el("availDate").value;

  if (!facilityId || !date) {
    el("slots").innerHTML = `<div class="small-muted">Pick a facility and date first.</div>`;
    return;
  }

  // compute availability by comparing to bookings (works even if /availability endpoint not implemented)
  const bookings = bookingsCache.map(normalizeBooking).filter(b =>
    b.facilityId === facilityId &&
    b.date === date &&
    String(b.status).toLowerCase() !== "cancelled"
  );

  const slots = generateSlots();
  const availability = slots.map(s => {
    const busy = bookings.some(b => timeOverlap(s.start, s.end, b.startTime, b.endTime));
    return { ...s, available: !busy };
  });

  renderSlots(availability);
}

async function createBooking() {
  const payload = {
    facilityId: Number(el("facilityId").value),
    userId: Number(el("userId").value),
    date: el("date").value,
    startTime: el("startTime").value,
    endTime: el("endTime").value,
    status: el("status").value
  };

  // basic validation
  if (!payload.facilityId || !payload.userId || !payload.date || !payload.startTime || !payload.endTime) {
    toast("Please fill <b>Facility ID</b>, <b>User ID</b>, <b>Date</b>, <b>Start</b>, and <b>End</b>.", "warning");
    return;
  }
  if (payload.startTime >= payload.endTime) {
    toast("End time must be after start time.", "warning");
    return;
  }

  try {
    await postBooking(payload);
    toast("✅ Booking created successfully.", "success");
    await loadBookings();
    await loadAvailability();
  } catch (e) {
    toast(`❌ Booking failed: <span class="mono">${String(e.message).slice(0, 300)}</span>`, "danger");
  }
}

function resetForm() {
  el("userId").value = "";
  el("date").value = "";
  el("startTime").value = "";
  el("endTime").value = "";
  el("status").value = "pending";
  el("msg").innerHTML = "";
}

function autoFillBookingFromSlot() {
  const facilityId = el("facilitySelect").value;
  const date = el("availDate").value;

  if (!facilityId) return;
  el("facilityId").value = facilityId;

  if (date) el("date").value = date;

  if (selectedSlot) {
    el("startTime").value = selectedSlot.start;
    el("endTime").value = selectedSlot.end;
    toast(`Filled booking time with selected slot: <span class="mono">${selectedSlot.start}–${selectedSlot.end}</span>`, "info");
  } else {
    toast("Select an available slot first (green).", "warning");
  }
}

// ---- Wire buttons ----
el("btnRefreshFacilities").addEventListener("click", loadFacilities);
el("btnRefreshBookings").addEventListener("click", loadBookings);
el("btnCheckAvailability").addEventListener("click", loadAvailability);
el("btnCreateBooking").addEventListener("click", createBooking);
el("btnResetForm").addEventListener("click", resetForm);
el("btnAutoFillBooking").addEventListener("click", autoFillBookingFromSlot);
el("filterText").addEventListener("input", renderBookings);
el("filterStatus").addEventListener("change", renderBookings);
el("facilitySelect").addEventListener("change", () => {
  el("facilityId").value = el("facilitySelect").value;
  loadAvailability();
});

// ---- Init ----
(async function init() {
  // default date = today
  const today = new Date().toISOString().slice(0, 10);
  el("availDate").value = today;

  await loadFacilities();
  await loadBookings();
  await loadAvailability();
})();