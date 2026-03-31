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
    status: 'Planned'
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
    status: 'In Progress'
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
    status: 'Planned'
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
    status: 'Draft'
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
    status: 'Planned'
  }
];

// GET /api/shipments - return all shipments
app.get('/api/shipments', (req, res) => {
  res.json(shipments);
});

// GET /api/shipments/:id - return single shipment by ID
app.get('/api/shipments/:id', (req, res) => {
  const { id } = req.params;
  const shipment = shipments.find((s) => s.shipmentId === id);

  if (!shipment) {
    return res.status(404).json({ message: 'Shipment not found' });
  }

  res.json(shipment);
});

// POST /api/shipments - create a new shipment
app.post('/api/shipments', (req, res) => {
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
    status
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
    status
  };

  shipments.push(newShipment);

  res.status(201).json(newShipment);
});

// PUT /api/shipments/:id - update existing shipment
app.put('/api/shipments/:id', (req, res) => {
  const { id } = req.params;
  const shipmentIndex = shipments.findIndex((s) => s.shipmentId === id);

  if (shipmentIndex === -1) {
    return res.status(404).json({ message: 'Shipment not found' });
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
    status
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
    status
  };

  shipments[shipmentIndex] = updatedShipment;
  res.json(updatedShipment);
});

// DELETE /api/shipments/:id - remove shipment
app.delete('/api/shipments/:id', (req, res) => {
  const { id } = req.params;
  const shipmentIndex = shipments.findIndex((s) => s.shipmentId === id);

  if (shipmentIndex === -1) {
    return res.status(404).json({ message: 'Shipment not found' });
  }

  shipments.splice(shipmentIndex, 1);
  res.json({ message: 'Shipment deleted successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`ADT Partners Internal Shipment Management API is running on port ${PORT}`);
});

