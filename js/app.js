/**
 * MIRA – app.js
 * Main application controller: routing, form handling, CRUD UI, table rendering.
 */

/* ── State ── */
let editingId   = null;
let currentView = 'dashboard';

/* ── Routing ── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${name}`)?.classList.add('active');
  document.querySelector(`[data-view="${name}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', patients: 'Patients', add: editingId ? 'Edit Patient' : 'Add Patient' };
  document.getElementById('page-title').textContent = titles[name] || name;
  currentView = name;

  if (name === 'dashboard') refreshDashboard();
  if (name === 'patients')  renderTable();
  if (name === 'add' && !editingId) clearForm();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── Dashboard ── */
function refreshDashboard() {
  const s = db.stats();
  document.getElementById('stat-total').textContent    = s.total;
  document.getElementById('stat-high').textContent     = s.high;
  document.getElementById('stat-moderate').textContent = s.moderate;
  document.getElementById('stat-low').textContent      = s.low;

  const recent = db.getAll().slice(0, 6);
  const list   = document.getElementById('dashboard-recent');

  if (recent.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:20px 0;">No patient records yet. Add your first patient to get started.</p>';
    return;
  }

  list.innerHTML = recent.map(p => `
    <div class="recent-item" onclick="viewPatient('${p.id}')">
      <div class="recent-avatar">${initials(p.name)}</div>
      <div class="recent-info">
        <div class="recent-name">${esc(p.name)}</div>
        <div class="recent-meta">${esc(p.email)} · DOB ${formatDate(p.dob)}</div>
      </div>
      <span class="risk-badge risk-${p.riskLevel}">${p.riskLevel}</span>
    </div>
  `).join('');
}

/* ── Table ── */
function renderTable() {
  const q    = document.getElementById('search-input').value.toLowerCase().trim();
  let data   = db.getAll();
  if (q) data = data.filter(p =>
    p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );

  const tbody = document.getElementById('table-body');

  if (data.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td class="mono" style="color:var(--text-muted)">${i + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="recent-avatar" style="width:28px;height:28px;font-size:11px;flex-shrink:0">${initials(p.name)}</div>
          <span style="font-weight:500">${esc(p.name)}</span>
        </div>
      </td>
      <td>${formatDate(p.dob)}</td>
      <td style="color:var(--text-secondary)">${esc(p.email)}</td>
      <td class="mono">${p.glucose}</td>
      <td class="mono">${p.haemoglobin}</td>
      <td class="mono">${p.cholesterol}</td>
      <td><span class="risk-badge risk-${p.riskLevel}">${p.riskLevel}</span></td>
      <td>
        <div class="action-btns">
          <button class="icon-btn" onclick="viewPatient('${p.id}')" title="View">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn" onclick="startEdit('${p.id}')" title="Edit">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn delete" onclick="deletePatient('${p.id}')" title="Delete">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ── View Patient Modal ── */
function viewPatient(id) {
  const p = db.getById(id);
  if (!p) return;

  document.getElementById('modal-title').textContent = 'Patient Details';
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Full Name</span>
        <span class="detail-value" style="font-weight:600">${esc(p.name)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date of Birth</span>
        <span class="detail-value">${formatDate(p.dob)} (Age ${calcAge(p.dob)})</span>
      </div>
      <div class="detail-item full">
        <span class="detail-label">Email Address</span>
        <span class="detail-value">${esc(p.email)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Glucose</span>
        <span class="detail-value mono">${p.glucose} mg/dL</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Haemoglobin</span>
        <span class="detail-value mono">${p.haemoglobin} g/dL</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Cholesterol</span>
        <span class="detail-value mono">${p.cholesterol} mg/dL</span>
      </div>
      <div class="detail-item full">
        <span class="detail-label">AI Health Remarks</span>
        <div class="remarks-box">
          <div class="remarks-risk-label">
            <span class="risk-badge risk-${p.riskLevel}">${p.riskLevel} RISK</span>
            <span style="font-size:11px;color:var(--text-muted)">Source: ${esc(p.aiSource || 'Clinical Rule Engine')}</span>
          </div>
          <div class="remarks-text">${esc(p.remarks)}</div>
        </div>
      </div>
    </div>
    <div class="modal-edit-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal(); startEdit('${p.id}')">Edit Record</button>
    </div>
  `;

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ── Form: Add / Edit ── */
function clearForm() {
  editingId = null;
  ['f-name','f-dob','f-email','f-glucose','f-hb','f-chol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  ['err-name','err-dob','err-email','err-glucose','err-hb','err-chol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.getElementById('form-heading').textContent    = 'New Patient Record';
  document.getElementById('form-subheading').textContent = 'Fill in the details below. AI will analyse the blood values and generate a health remark.';
  document.getElementById('submit-label').textContent    = 'Analyse & Save';
}

function startEdit(id) {
  const p = db.getById(id);
  if (!p) return;
  editingId = id;

  document.getElementById('f-name').value   = p.name;
  document.getElementById('f-dob').value    = p.dob;
  document.getElementById('f-email').value  = p.email;
  document.getElementById('f-glucose').value= p.glucose;
  document.getElementById('f-hb').value     = p.haemoglobin;
  document.getElementById('f-chol').value   = p.cholesterol;

  document.getElementById('form-heading').textContent    = 'Edit Patient Record';
  document.getElementById('form-subheading').textContent = 'Update the values below. AI will re-analyse and regenerate health remarks.';
  document.getElementById('submit-label').textContent    = 'Re-analyse & Update';

  showView('add');
}

function cancelForm() {
  editingId = null;
  showView(db.getAll().length > 0 ? 'patients' : 'dashboard');
}

/* ── Validation ── */
function validate() {
  let ok = true;

  const fields = [
    { id: 'f-name',    errId: 'err-name',    test: v => v.trim().length >= 2,               msg: 'Full name must be at least 2 characters.' },
    { id: 'f-dob',     errId: 'err-dob',     test: v => v && new Date(v) <= new Date(),      msg: 'Date of birth cannot be in the future.' },
    { id: 'f-email',   errId: 'err-email',   test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Enter a valid email address.' },
    { id: 'f-glucose', errId: 'err-glucose', test: v => !isNaN(v) && parseFloat(v) > 0,     msg: 'Glucose must be a positive number.' },
    { id: 'f-hb',      errId: 'err-hb',      test: v => !isNaN(v) && parseFloat(v) > 0,     msg: 'Haemoglobin must be a positive number.' },
    { id: 'f-chol',    errId: 'err-chol',    test: v => !isNaN(v) && parseFloat(v) > 0,     msg: 'Cholesterol must be a positive number.' },
  ];

  fields.forEach(({ id, errId, test, msg }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    const val = el.value.trim();
    if (!test(val)) {
      el.classList.add('error');
      if (err) err.textContent = msg;
      ok = false;
    } else {
      el.classList.remove('error');
      if (err) err.textContent = '';
    }
  });

  return ok;
}

/* ── Submit ── */
async function submitForm() {
  if (!validate()) return;

  const btn     = document.getElementById('submit-btn');
  const label   = document.getElementById('submit-label');
  const spinner = document.getElementById('submit-spinner');

  btn.disabled     = true;
  label.textContent= 'Analysing…';
  spinner.classList.remove('hidden');

  const name  = document.getElementById('f-name').value.trim();
  const dob   = document.getElementById('f-dob').value;
  const email = document.getElementById('f-email').value.trim();
  const g     = document.getElementById('f-glucose').value.trim();
  const hb    = document.getElementById('f-hb').value.trim();
  const chol  = document.getElementById('f-chol').value.trim();

  try {
    const result = await AI.predict(name, g, hb, chol);

    const payload = {
      name, dob, email,
      glucose:      parseFloat(g),
      haemoglobin:  parseFloat(hb),
      cholesterol:  parseFloat(chol),
      remarks:   result.remarks,
      riskLevel: result.riskLevel,
      aiSource:  result.aiSource,
    };

    if (editingId) {
      db.update(editingId, payload);
      toast('Patient record updated successfully.', 'success');
    } else {
      db.create(payload);
      toast('Patient added and AI analysis complete.', 'success');
    }

    editingId = null;
    showView('patients');

  } catch (err) {
    console.error(err);
    toast('Something went wrong during analysis. Please try again.', 'error');
  } finally {
    btn.disabled     = false;
    label.textContent= editingId ? 'Re-analyse & Update' : 'Analyse & Save';
    spinner.classList.add('hidden');
  }
}

/* ── Delete ── */
function deletePatient(id) {
  const p = db.getById(id);
  if (!p) return;
  if (!confirm(`Delete record for "${p.name}"? This cannot be undone.`)) return;
  db.delete(id);
  toast('Patient record deleted.', 'success');
  renderTable();
  refreshDashboard();
}

/* ── Helpers ── */
function esc(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dateStr) {
  if (!dateStr) return '?';
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

/* ── Boot ── */
showView('dashboard');
