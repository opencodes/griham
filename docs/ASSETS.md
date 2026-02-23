# Assets Module

Track and manage household assets including property, vehicles, gadgets, and important documents.

## Features

### 1. Asset Types
- **Property**: Houses, land, apartments, rental properties
- **Vehicles**: Cars, bikes, scooters
- **Gadgets**: Electronics, appliances, expensive items
- **Documents**: Passports, certificates, legal papers

### 2. Asset Management
- Purchase date and price tracking
- Current valuation
- Location tracking
- Document storage (S3/cloud)
- Warranty information
- Insurance details

### 3. Property Details
- Property type (house, land, apartment)
- Area and measurements
- Ownership type (owned, rented)
- Property documents

### 4. Vehicle Details
- Make, model, year
- Registration number
- Insurance expiry tracking
- Service history
- Service reminders

### 5. Document Management
- Document type categorization
- Issue and expiry dates
- Expiry notifications
- File upload and storage
- Quick search

## Database Schema

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    asset_type VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    current_value DECIMAL(15,2),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE properties (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    property_type VARCHAR(50),
    address TEXT,
    area DECIMAL(10,2),
    area_unit VARCHAR(20),
    ownership_type VARCHAR(50)
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    vehicle_type VARCHAR(50),
    make VARCHAR(100),
    model VARCHAR(100),
    year INT,
    registration_number VARCHAR(50),
    insurance_expiry DATE,
    last_service_date DATE
);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    asset_id UUID REFERENCES assets(id),
    document_type VARCHAR(100),
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    file_url TEXT,
    notes TEXT
);
```

## API Endpoints

```
POST   /api/v1/assets                        - Create asset
GET    /api/v1/assets                        - List assets
GET    /api/v1/assets?type=property          - Filter by type
GET    /api/v1/assets/{id}                   - Get asset details
PUT    /api/v1/assets/{id}                   - Update asset
DELETE /api/v1/assets/{id}                   - Delete asset

GET    /api/v1/assets/expiring-documents     - Documents expiring soon
GET    /api/v1/assets/vehicles/service-due   - Vehicles needing service
GET    /api/v1/assets/valuation              - Total asset valuation
```

## Implementation Priority

1. Asset CRUD operations (Week 8)
2. Property management (Week 8)
3. Vehicle tracking (Week 9)
4. Document management (Week 9)
5. Expiry notifications (Week 9)
