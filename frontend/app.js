// Frontend logic for ADT Partners Shipment Management Prototype
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://adt-intern-prototype-for-businesscontrol.onrender.com/api';

const requiredFields = [
  'shipmentId',
  'productType',
  'grade',
  'quantityTons',
  'originCountry',
  'destinationCountry',
  'portDeparture',
  'portArrival',
  'vesselName',
  'shipmentDate',
  'status'
];

let allShipments = [];
let filteredShipments = [];
let editingShipmentId = null;
let currentSort = { field: null, direction: 'asc' };
let authToken = localStorage.getItem('adtAuthToken') || '';
let currentUser = JSON.parse(localStorage.getItem('adtCurrentUser') || 'null') || {
  username: 'yerzhan95',
  role: 'manager'
};

function showMessage(text, type = 'info') {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
  }, 3500);
}

function formatMoney(value) {
  const number = Number(value) || 0;
  return `$${number.toLocaleString()}`;
}

function clearStaleAuth() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('adtAuthToken');
  localStorage.removeItem('adtCurrentUser');
}

function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(currentUser
        ? {
            'x-user-role': currentUser.role,
            'x-user-name': currentUser.username
          }
        : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  }).then(async (response) => {
    // Stale session after Render restart: retry without token (demo fallback).
    if (response.status === 401 && authToken) {
      clearStaleAuth();
      if (typeof setAuthView === 'function') setAuthView(false);
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: { ...headers }
      });
    }
    return response;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearInlineErrors() {
  requiredFields.forEach((field) => {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = '';
  });
}

function showInlineError(field, text) {
  const errorEl = document.querySelector(`[data-error-for="${field}"]`);
  if (errorEl) errorEl.textContent = text;
}

function validateForm(payload) {
  clearInlineErrors();
  let valid = true;
  requiredFields.forEach((field) => {
    if (!payload[field] || payload[field].toString().trim() === '') {
      showInlineError(field, 'This field is required.');
      valid = false;
    }
  });
  if (payload.quantityTons && Number(payload.quantityTons) <= 0) {
    showInlineError('quantityTons', 'Quantity must be greater than 0.');
    valid = false;
  }
  return valid;
}

function setAuthView(isLoggedIn) {
  document.getElementById('auth-section').classList.toggle('hidden', isLoggedIn);
  document.getElementById('app-shell').classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn && currentUser) {
    document.getElementById('current-username').value = currentUser.username;
    document.getElementById('current-role').value = currentUser.role;
    document.getElementById('boss-section').classList.toggle('hidden', currentUser.role !== 'boss');
  }
}

function logout() {
  authToken = '';
  currentUser = { username: 'yerzhan95', role: 'manager' };
  localStorage.removeItem('adtAuthToken');
  localStorage.setItem('adtCurrentUser', JSON.stringify(currentUser));
  setAuthView(true);
  showMessage('Logged out. Switched to demo mode (manager).', 'info');
  fetchShipments();
}

function getStatusClass(status) {
  if (status === 'Planned') return 'status-planned';
  if (status === 'In Progress') return 'status-in-progress';
  if (status === 'Completed') return 'status-completed';
  if (status === 'Draft') return 'status-draft';
  return 'status-planned';
}

function getProductIcon(productType) {
  const value = (productType || '').toLowerCase();
  if (value.includes('corn')) return '🌽';
  if (value.includes('barley')) return '🌱';
  return '🌾';
}

function canModifyRow(shipment) {
  if (!currentUser) return false;
  if (currentUser.role === 'boss') return true;
  return shipment.createdBy === currentUser.username;
}

async function fetchBossOverall() {
  if (!currentUser || currentUser.role !== 'boss') return;
  const response = await apiFetch('/analytics/overall');
  if (!response.ok) return;
  const data = await response.json();
  document.getElementById('boss-total-shipments').textContent = data.totalShipments;
  document.getElementById('boss-total-sales').textContent = formatMoney(data.totalSalesUsd);
  document.getElementById('boss-total-profit').textContent = formatMoney(data.totalProfitUsd);
}

async function fetchShipments() {
  const loadingEl = document.getElementById('loading-text');
  if (loadingEl) loadingEl.style.display = 'block';

  const maxAttempts = 4;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await apiFetch('/shipments');

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`HTTP ${response.status} ${text.slice(0, 120)}`);
        await sleep(1500 * attempt);
        continue;
      }

      allShipments = await response.json();
      applyFilterAndSort();
      await fetchBossOverall();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await sleep(1500 * attempt);
    }
  }

  if (lastError) {
    showMessage(
      'Could not load shipments. Open /api/health on Render to wake the server, then refresh. (Render free tier may sleep.)',
      'error'
    );
  }

  if (loadingEl) loadingEl.style.display = 'none';
}

function updateSummary(shipments) {
  const totalSales = shipments.reduce((sum, s) => sum + Number(s.saleAmountUsd || 0), 0);
  const totalProfit = shipments.reduce((sum, s) => sum + Number(s.estimatedProfitUsd || 0), 0);
  document.getElementById('summary-count').textContent = shipments.length.toString();
  document.getElementById('summary-sales').textContent = formatMoney(totalSales);
  document.getElementById('summary-profit').textContent = formatMoney(totalProfit);
}

function renderTable(shipments) {
  const tbody = document.getElementById('shipments-body');
  tbody.innerHTML = '';
  if (shipments.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="17">No shipments found.</td>';
    tbody.appendChild(tr);
    updateSummary([]);
    return;
  }

  shipments.forEach((shipment) => {
    const statusClass = getStatusClass(shipment.status);
    const editable = canModifyRow(shipment);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${shipment.shipmentId}</td>
      <td>${shipment.createdBy || '-'}</td>
      <td class="grain-icon">${getProductIcon(shipment.productType)}</td>
      <td>${shipment.productType}</td>
      <td>${shipment.grade}</td>
      <td>${shipment.quantityTons}</td>
      <td>${shipment.originCountry}</td>
      <td>${shipment.destinationCountry}</td>
      <td>${shipment.portDeparture}</td>
      <td>${shipment.portArrival}</td>
      <td>${shipment.vesselName}</td>
      <td>${shipment.shipmentDate}</td>
      <td>${formatMoney(shipment.saleAmountUsd)}</td>
      <td>${formatMoney(shipment.estimatedProfitUsd)}</td>
      <td><span class="status-badge ${statusClass}">${shipment.status}</span></td>
      <td><button class="row-button edit-button" data-id="${shipment.shipmentId}" ${editable ? '' : 'disabled'}>Edit</button></td>
      <td><button class="row-button delete-button" data-id="${shipment.shipmentId}" ${editable ? '' : 'disabled'}>Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  updateSummary(shipments);
  bindRowActionButtons();
}

function applyFilterAndSort() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  filteredShipments = allShipments.filter(
    (s) =>
      s.destinationCountry.toLowerCase().includes(query) ||
      s.productType.toLowerCase().includes(query) ||
      s.vesselName.toLowerCase().includes(query)
  );

  if (currentSort.field === 'shipmentDate') {
    filteredShipments.sort((a, b) =>
      currentSort.direction === 'asc'
        ? new Date(a.shipmentDate) - new Date(b.shipmentDate)
        : new Date(b.shipmentDate) - new Date(a.shipmentDate)
    );
  }
  if (currentSort.field === 'quantityTons') {
    filteredShipments.sort((a, b) =>
      currentSort.direction === 'asc'
        ? Number(a.quantityTons) - Number(b.quantityTons)
        : Number(b.quantityTons) - Number(a.quantityTons)
    );
  }
  renderTable(filteredShipments);
}

function toggleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort = { field, direction: 'asc' };
  }
  applyFilterAndSort();
}

function setFormData(shipment) {
  document.getElementById('shipmentId').value = shipment.shipmentId;
  document.getElementById('productType').value = shipment.productType;
  document.getElementById('grade').value = shipment.grade;
  document.getElementById('quantityTons').value = shipment.quantityTons;
  document.getElementById('originCountry').value = shipment.originCountry;
  document.getElementById('destinationCountry').value = shipment.destinationCountry;
  document.getElementById('portDeparture').value = shipment.portDeparture;
  document.getElementById('portArrival').value = shipment.portArrival;
  document.getElementById('vesselName').value = shipment.vesselName;
  document.getElementById('shipmentDate').value = shipment.shipmentDate;
  document.getElementById('status').value = shipment.status;
  document.getElementById('saleAmountUsd').value = shipment.saleAmountUsd || '';
  document.getElementById('estimatedProfitUsd').value = shipment.estimatedProfitUsd || '';
}

function resetFormState() {
  editingShipmentId = null;
  document.getElementById('shipment-form').reset();
  document.getElementById('submit-button').textContent = 'Add Shipment';
  clearInlineErrors();
}

async function handleEdit(id) {
  const response = await apiFetch(`/shipments/${id}`);
  if (!response.ok) {
    showMessage('Could not load shipment for editing.', 'error');
    return;
  }
  const shipment = await response.json();
  setFormData(shipment);
  editingShipmentId = id;
  document.getElementById('submit-button').textContent = 'Update Shipment';
  showMessage(`Editing shipment ${id}`, 'info');
}

async function handleDelete(id) {
  if (!window.confirm(`Delete shipment ${id}?`)) return;
  const response = await apiFetch(`/shipments/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    showMessage('Failed to delete shipment.', 'error');
    return;
  }
  if (editingShipmentId === id) resetFormState();
  showMessage('Shipment deleted.', 'info');
  await fetchShipments();
}

function bindRowActionButtons() {
  document.querySelectorAll('.edit-button').forEach((button) => {
    button.addEventListener('click', () => handleEdit(button.dataset.id));
  });
  document.querySelectorAll('.delete-button').forEach((button) => {
    button.addEventListener('click', () => handleDelete(button.dataset.id));
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  if (!validateForm(payload)) {
    showMessage('Please correct form errors.', 'error');
    return;
  }

  payload.quantityTons = Number(payload.quantityTons);
  const isEditing = editingShipmentId !== null;
  const response = await apiFetch(isEditing ? `/shipments/${editingShipmentId}` : '/shipments', {
    method: isEditing ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.status === 409) {
    showInlineError('shipmentId', 'Shipment ID already exists.');
    showMessage('Duplicate ID error.', 'error');
    return;
  }
  if (!response.ok) {
    showMessage('Could not save shipment.', 'error');
    return;
  }

  resetFormState();
  showMessage(isEditing ? 'Shipment updated.' : 'Shipment added successfully.', 'info');
  await fetchShipments();
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    showMessage('Login failed. Check username/password.', 'error');
    return;
  }
  const data = await response.json();
  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem('adtAuthToken', authToken);
  localStorage.setItem('adtCurrentUser', JSON.stringify(currentUser));
  setAuthView(true);
  showMessage(`Welcome ${currentUser.username}`, 'info');
  await fetchShipments();
}

async function handleSignUp() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });
  if (!response.ok) {
    showMessage('Sign-up failed (username may already exist).', 'error');
    return;
  }
  showMessage('Account created. Now login.', 'info');
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-button').addEventListener('click', handleLogin);
  document.getElementById('signup-button').addEventListener('click', handleSignUp);
  document.getElementById('logout-button').addEventListener('click', logout);
  document.getElementById('shipment-form').addEventListener('submit', handleSubmit);
  document.getElementById('search-input').addEventListener('input', applyFilterAndSort);
  document.getElementById('sort-date').addEventListener('click', () => toggleSort('shipmentDate'));
  document.getElementById('sort-quantity').addEventListener('click', () => toggleSort('quantityTons'));
  document.getElementById('apply-demo-user-button').addEventListener('click', async () => {
    const username = document.getElementById('current-username').value.trim().toLowerCase();
    const role = document.getElementById('current-role').value;

    if (!username) {
      showMessage('Enter username for demo role switch.', 'error');
      return;
    }

    currentUser = { username, role };
    localStorage.setItem('adtCurrentUser', JSON.stringify(currentUser));
    showMessage(`Demo role applied: ${role} (${username})`, 'info');
    resetFormState();
    await fetchShipments();
  });
  // Always show app shell for reliable demo. Login remains optional.
  setAuthView(true);
  await fetchShipments();
});

