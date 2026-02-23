# Contacts Module

Manage all household contacts including family, neighbors, and service vendors.

## Features

### 1. Contact Types
- **Family**: Immediate and extended family members
- **Neighbors**: Apartment/house neighbors with location
- **Vendors**: Service providers (plumber, electrician, grocer, etc.)

### 2. Contact Information
- Full name and relationship
- Phone numbers (multiple)
- Email addresses
- Physical address
- Emergency contact flag
- Notes and additional info

### 3. Vendor Management
- Service type categorization
- Rating system (1-5 stars)
- Last service date tracking
- Service history

## Database Schema

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    contact_type VARCHAR(50),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    relationship VARCHAR(100),
    notes TEXT,
    is_emergency BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_services (
    id UUID PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    service_type VARCHAR(100),
    rating DECIMAL(2,1),
    last_service_date DATE
);
```

## API Endpoints

```
POST   /api/v1/contacts                      - Create contact
GET    /api/v1/contacts                      - List contacts
GET    /api/v1/contacts?type=vendor          - Filter by type
GET    /api/v1/contacts?emergency=true       - Emergency contacts
GET    /api/v1/contacts/{id}                 - Get contact details
PUT    /api/v1/contacts/{id}                 - Update contact
DELETE /api/v1/contacts/{id}                 - Delete contact

POST   /api/v1/contacts/{id}/services        - Add vendor service
GET    /api/v1/contacts/{id}/services        - Get service history
```

## Implementation Priority

1. Contact CRUD operations (Week 7)
2. Contact categorization (Week 7)
3. Vendor service tracking (Week 7)
4. Emergency contacts (Week 7)
