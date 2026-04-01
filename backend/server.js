// ADT Partners Internal Shipment Management API (prototype)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (simple for prototype)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// In-memory shipment data store (prototype only)
let shipments = [
  {
    shipmentId: 'SH-001',
    productType: 'Wheat',
    grade: 'Milling',
    quantityTons: 25000,
    originCountry: 'Kazakhstan',
    destinationCountry: 'Italy',
    portDeparture: 'Aktau',
    portArrival: 'Genoa',
    vesselName: 'MV Black Sea',
    shipmentDate: '2025-02-05',
    status: 'Planned',
    saleAmountUsd: 6000000,
    estimatedProfitUsd: 875000,
    createdBy: 'manager1'
  },
  {
    shipmentId: 'SH-002',
    productType: 'Wheat',
    grade: 'Feed',
    quantityTons: 18500,
    originCountry: 'Kazakhstan',
    destinationCountry: 'Spain',
    portDeparture: 'Aktau',
    portArrival: 'Valencia',
    vesselName: 'MV Atlas',
    shipmentDate: '2025-02-10',
    status: 'In Progress',
    saleAmountUsd: 4255000,
    estimatedProfitUsd: 555000,
    createdBy: 'manager1'
  },
  {
    shipmentId: 'SH-003',
    productType: 'Barley',
    grade: 'Feed',
    quantityTons: 12000,
    originCountry: 'Kazakhstan',
    destinationCountry: 'Turkey',
    portDeparture: 'Aktau',
    portArrival: 'Mersin',
    vesselName: 'MV Horizon',
    shipmentDate: '2025-02-14',
    status: 'Planned',
    saleAmountUsd: 2580000,
    estimatedProfitUsd: 384000,
    createdBy: 'worker1'
  },
  {
    shipmentId: 'SH-004',
    productType: 'Wheat',
    grade: 'Milling',
    quantityTons: 30000,
    originCountry: 'Kazakhstan',
    destinationCountry: 'Netherlands',
    portDeparture: 'Aktau',
    portArrival: 'Rotterdam',
    vesselName: 'MV North Star',
    shipmentDate: '2025-02-20',
    status: 'Draft',
    saleAmountUsd: 7350000,
    estimatedProfitUsd: 1095000,
    createdBy: 'manager2'
  },
  {
    shipmentId: 'SH-005',
    productType: 'Corn',
    grade: 'Feed',
    quantityTons: 15750,
    originCountry: 'Kazakhstan',
    destinationCountry: 'Greece',
    portDeparture: 'Aktau',
    portArrival: 'Piraeus',
    vesselName: 'MV Blue Wave',
    shipmentDate: '2025-02-25',
    status: 'Planned',
    saleAmountUsd: 3071250,
    estimatedProfitUsd: 441000,
    createdBy: 'worker2'
  }
];

// In-memory users and sessions (prototype only, no database)
let users = [
  { username: 'boss1', password: 'boss123', role: 'boss' },
  { username: 'manager1', password: 'manager123', role: 'manager' },
  { username: 'manager2', password: 'manager123', role: 'manager' },
  { username: 'worker1', password: 'worker123', role: 'worker' },
  { username: 'worker2', password: 'worker123', role: 'worker' }
];

let sessions = [];

function createSessionToken() {
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getSessionByToken(token) {
  return sessions.find((session) => session.token === token);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  const session = getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  req.user = { role: session.role, name: session.username };
  next();
}

function getCurrentUser(req) {
  const role = (req.headers['x-user-role'] || 'worker').toString().toLowerCase();
  const name = (req.headers['x-user-name'] || 'guest').toString().toLowerCase();
  return {
    role: ['boss', 'manager', 'worker'].includes(role) ? role : 'worker',
    name
  };
}

function canViewShipment(user, shipment) {
  if (user.role === 'boss' || user.role === 'manager') return true;
  return shipment.createdBy === user.name;
}

function canModifyShipment(user, shipment) {
  if (user.role === 'boss') return true;
  return shipment.createdBy === user.name;
}

function normalizeMoney(value, fallbackValue) {
  if (value === undefined || value === null || value === '') return fallbackValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallbackValue : parsed;
}

// AUTH: Sign up
app.post('/api/auth/signup', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'username, password and role are required' });
  }

  const normalizedRole = role.toLowerCase();
  if (!['boss', 'manager', 'worker'].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const normalizedUserName = username.toLowerCase();
  const exists = users.find((user) => user.username === normalizedUserName);
  if (exists) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  users.push({
    username: normalizedUserName,
    password,
    role: normalizedRole
  });

  res.status(201).json({ message: 'User created successfully' });
});

// AUTH: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const normalizedUserName = username.toLowerCase();
  const user = users.find(
    (existingUser) => existingUser.username === normalizedUserName && existingUser.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = createSessionToken();
  sessions.push({
    token,
    username: user.username,
    role: user.role,
    createdAt: new Date().toISOString()
  });

  res.json({
    token,
    user: {
      username: user.username,
      role: user.role
    }
  });
});

// GET /api/shipments - return all shipments
app.get('/api/shipments', authMiddleware, (req, res) => {
  const user = req.user;
  const visibleShipments = shipments.filter((shipment) => canViewShipment(user, shipment));
  res.json(visibleShipments);
});

// GET /api/shipments/:id - return single shipment by ID
app.get('/api/shipments/:id', authMiddleware, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const shipment = shipments.find((s) => s.shipmentId === id);

  if (!shipment) {
    return res.status(404).json({ message: 'Shipment not found' });
  }
  if (!canViewShipment(user, shipment)) {
    return res.status(403).json({ message: 'Access denied for this shipment' });
  }

  res.json(shipment);
});

// POST /api/shipments - create a new shipment
app.post('/api/shipments', authMiddleware, (req, res) => {
  const user = req.user;
  const {
    shipmentId,
    productType,
    grade,
    quantityTons,
    originCountry,
    destinationCountry,
    portDeparture,
    portArrival,
    vesselName,
    shipmentDate,
    status,
    saleAmountUsd,
    estimatedProfitUsd
  } = req.body;

  // Basic required field validation
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

  const missingFields = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: 'Missing required fields',
      missingFields
    });
  }

  // Ensure shipmentId is unique
  const existing = shipments.find((s) => s.shipmentId === shipmentId);
  if (existing) {
    return res.status(409).json({
      message: 'Shipment with this ID already exists'
    });
  }

  // Normalize quantity to number
  const quantityNumber = Number(quantityTons);
  if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
    return res.status(400).json({
      message: 'quantityTons must be a positive number'
    });
  }

  const newShipment = {
    shipmentId,
    productType,
    grade,
    quantityTons: quantityNumber,
    originCountry,
    destinationCountry,
    portDeparture,
    portArrival,
    vesselName,
    shipmentDate,
    status,
    saleAmountUsd: normalizeMoney(saleAmountUsd, quantityNumber * 240),
    estimatedProfitUsd: normalizeMoney(estimatedProfitUsd, quantityNumber * 35),
    createdBy: user.name
  };

  shipments.push(newShipment);

  res.status(201).json(newShipment);
});

// PUT /api/shipments/:id - update existing shipment
app.put('/api/shipments/:id', authMiddleware, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const shipmentIndex = shipments.findIndex((s) => s.shipmentId === id);

  if (shipmentIndex === -1) {
    return res.status(404).json({ message: 'Shipment not found' });
  }
  if (!canModifyShipment(user, shipments[shipmentIndex])) {
    return res.status(403).json({ message: 'You can only modify your own shipments' });
  }

  const {
    shipmentId,
    productType,
    grade,
    quantityTons,
    originCountry,
    destinationCountry,
    portDeparture,
    portArrival,
    vesselName,
    shipmentDate,
    status,
    saleAmountUsd,
    estimatedProfitUsd
  } = req.body;

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

  const missingFields = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: 'Missing required fields',
      missingFields
    });
  }

  // If ID changed, ensure new ID is unique
  const duplicate = shipments.find((s) => s.shipmentId === shipmentId && s.shipmentId !== id);
  if (duplicate) {
    return res.status(409).json({
      message: 'Shipment with this ID already exists'
    });
  }

  const quantityNumber = Number(quantityTons);
  if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
    return res.status(400).json({
      message: 'quantityTons must be a positive number'
    });
  }

  const updatedShipment = {
    shipmentId,
    productType,
    grade,
    quantityTons: quantityNumber,
    originCountry,
    destinationCountry,
    portDeparture,
    portArrival,
    vesselName,
    shipmentDate,
    status,
    saleAmountUsd: normalizeMoney(saleAmountUsd, quantityNumber * 240),
    estimatedProfitUsd: normalizeMoney(estimatedProfitUsd, quantityNumber * 35),
    createdBy: shipments[shipmentIndex].createdBy
  };

  shipments[shipmentIndex] = updatedShipment;
  res.json(updatedShipment);
});

// DELETE /api/shipments/:id - remove shipment
app.delete('/api/shipments/:id', authMiddleware, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const shipmentIndex = shipments.findIndex((s) => s.shipmentId === id);

  if (shipmentIndex === -1) {
    return res.status(404).json({ message: 'Shipment not found' });
  }
  if (!canModifyShipment(user, shipments[shipmentIndex])) {
    return res.status(403).json({ message: 'You can only delete your own shipments' });
  }

  shipments.splice(shipmentIndex, 1);
  res.json({ message: 'Shipment deleted successfully' });
});

// Boss-only: overall company totals
app.get('/api/analytics/overall', authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role !== 'boss') {
    return res.status(403).json({ message: 'Only boss can access overall analytics' });
  }

  const totalShipments = shipments.length;
  const totalSalesUsd = shipments.reduce((sum, shipment) => sum + Number(shipment.saleAmountUsd || 0), 0);
  const totalProfitUsd = shipments.reduce(
    (sum, shipment) => sum + Number(shipment.estimatedProfitUsd || 0),
    0
  );

  res.json({
    totalShipments,
    totalSalesUsd,
    totalProfitUsd
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`ADT Partners Internal Shipment Management API is running on port ${PORT}`);
});

