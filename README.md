## ADT Partners Shipment Management Prototype

This project is a prototype internal web application developed during an internship at ADT Partners.

It consists of:
- **Backend**: Node.js + Express API serving shipment data (in memory).
- **Frontend**: Simple HTML, CSS, and vanilla JavaScript to view and create shipment records.

### Backend Setup

1. Open a terminal and navigate to the project folder:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the backend server:

   ```bash
   npm start
   ```

The API will run on `http://localhost:3001`.

### Frontend Usage

1. With the backend running, open the frontend file in your browser:

   - Open `frontend/index.html` directly (e.g. via Finder / Explorer, or by using "Open with Browser").

2. The page will:

   - Load all existing shipments from `GET /api/shipments`.
   - Display them in a table.
   - Provide a form to add new shipments via `POST /api/shipments`.

### Data Storage

Currently, all shipment data is stored in memory inside the backend (`server.js`) for development purposes only.  
Whenever you restart the Node.js server, the data resets to the initial seeded sample shipments.

