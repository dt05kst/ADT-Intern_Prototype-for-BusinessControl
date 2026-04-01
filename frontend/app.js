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
let currentUser = {
  role: localStorage.getItem('adtRole') || 'manager',
  name: localStorage.getItem('adtUserName') || 'manager1'
};

function getAuthHeaders() {
  return {
    'x-user-role': currentUser.role,
    'x-user-name': currentUser.name
  };
}

function formatMoney(value) {
  const number = Number(value) || 0;
  return `$${number.toLocaleString()}`;
}

// Show top message box and auto-hide it
function showMessage(text, type = 'info') {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;

  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
  }, 3500);
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
  if (value.includes('wheat')) return '🌾';
  return '🌾';
}

function canModifyRow(shipment) {
  if (currentUser.role === 'boss') return true;
  return shipment.createdBy === currentUser.name;
}

// fetchShipments(): get data from backend and render
async function fetchShipments() {
  const loadingEl = document.getElementById('loading-text');
  loadingEl.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/shipments`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch shipments');

    allShipments = await response.json();
    applyFilterAndSort();
  } catch (error) {
    console.error(error);
    showMessage('Could not load shipments. Check backend server.', 'error');
  } finally {
    loadingEl.style.display = 'none';
  }
}

// renderTable(): draw all table rows
function renderTable(shipments) {
  const tbody = document.getElementById('shipments-body');
  tbody.innerHTML = '';

  if (shipments.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="17">No shipments found.</td>';
    tbody.appendChild(tr);
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

function updateSummary(shipments) {
  const totalSales = shipments.reduce((sum, s) => sum + Number(s.saleAmountUsd || 0), 0);
  const totalProfit = shipments.reduce((sum, s) => sum + Number(s.estimatedProfitUsd || 0), 0);

  document.getElementById('summary-count').textContent = shipments.length.toString();
  document.getElementById('summary-sales').textContent = formatMoney(totalSales);
  document.getElementById('summary-profit').textContent = formatMoney(totalProfit);
}

function applyFilterAndSort() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();

  filteredShipments = allShipments.filter((shipment) => {
    return (
      shipment.destinationCountry.toLowerCase().includes(query) ||
      shipment.productType.toLowerCase().includes(query) ||
      shipment.vesselName.toLowerCase().includes(query)
    );
  });

  if (currentSort.field === 'shipmentDate') {
    filteredShipments.sort((a, b) => {
      const dateA = new Date(a.shipmentDate);
      const dateB = new Date(b.shipmentDate);
      return currentSort.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  if (currentSort.field === 'quantityTons') {
    filteredShipments.sort((a, b) => {
      return currentSort.direction === 'asc'
        ? Number(a.quantityTons) - Number(b.quantityTons)
        : Number(b.quantityTons) - Number(a.quantityTons);
    });
  }

  renderTable(filteredShipments);
}

function toggleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
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

// handleEdit(): populate form from selected row
async function handleEdit(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/shipments/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      showMessage('Could not load shipment for editing.', 'error');
      return;
    }

    const shipment = await response.json();
    setFormData(shipment);
    editingShipmentId = id;
    document.getElementById('submit-button').textContent = 'Update Shipment';
    showMessage(`Editing shipment ${id}`, 'info');
  } catch (error) {
    console.error(error);
    showMessage('Failed to enter edit mode.', 'error');
  }
}

// handleDelete(): confirm and remove shipment
async function handleDelete(id) {
  const confirmed = window.confirm(`Delete shipment ${id}?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/shipments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      showMessage('Failed to delete shipment.', 'error');
      return;
    }

    if (editingShipmentId === id) resetFormState();
    showMessage('Shipment deleted.', 'info');
    await fetchShipments();
  } catch (error) {
    console.error(error);
    showMessage('Network error while deleting shipment.', 'error');
  }
}

function bindRowActionButtons() {
  const editButtons = document.querySelectorAll('.edit-button');
  const deleteButtons = document.querySelectorAll('.delete-button');

  editButtons.forEach((button) => {
    button.addEventListener('click', () => handleEdit(button.dataset.id));
  });

  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => handleDelete(button.dataset.id));
  });
}

// handleSubmit(): create or update shipment
async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  if (!validateForm(payload)) {
    showMessage('Please correct form errors.', 'error');
    return;
  }

  payload.quantityTons = Number(payload.quantityTons);
  const isEditing = editingShipmentId !== null;
  const requestUrl = isEditing
    ? `${API_BASE_URL}/shipments/${editingShipmentId}`
    : `${API_BASE_URL}/shipments`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });

    if (response.status === 409) {
      showInlineError('shipmentId', 'Shipment ID already exists.');
      showMessage('Duplicate ID error.', 'error');
      return;
    }

    if (response.status === 400) {
      showMessage('Invalid data. Check required fields.', 'error');
      return;
    }

    if (!response.ok) {
      showMessage('Could not save shipment.', 'error');
      return;
    }

    resetFormState();
    showMessage(isEditing ? 'Shipment updated.' : 'Shipment added successfully.', 'info');
    await fetchShipments();
  } catch (error) {
    console.error(error);
    showMessage('Network error. Please check backend server.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('role-select').value = currentUser.role;
  document.getElementById('username-input').value = currentUser.name;
  document.getElementById('apply-user-button').addEventListener('click', () => {
    const role = document.getElementById('role-select').value;
    const name = document.getElementById('username-input').value.trim().toLowerCase() || 'guest';
    currentUser = { role, name };

    localStorage.setItem('adtRole', role);
    localStorage.setItem('adtUserName', name);

    resetFormState();
    showMessage(`Access applied: ${role} (${name})`, 'info');
    fetchShipments();
  });

  document.getElementById('shipment-form').addEventListener('submit', handleSubmit);
  document.getElementById('search-input').addEventListener('input', applyFilterAndSort);
  document.getElementById('sort-date').addEventListener('click', () => toggleSort('shipmentDate'));
  document.getElementById('sort-quantity').addEventListener('click', () => toggleSort('quantityTons'));

  fetchShipments();
});

