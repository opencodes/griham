# Health Module

Comprehensive health management for all family members including medical records, appointments, and vaccinations.

## Features

### 1. Health Profiles
- Blood group
- Height and weight tracking
- Allergies list
- Chronic conditions
- Emergency contact

### 2. Medical Records
- Doctor visits
- Diagnoses
- Prescriptions
- Lab reports
- Medical history
- File attachments

### 3. Vaccinations
- Vaccination schedule
- Dose tracking
- Next dose reminders
- Vaccination certificates

### 4. Appointments
- Doctor appointment scheduling
- Specialty tracking
- Appointment reminders
- Visit history
- Status tracking (scheduled, completed, cancelled)

### 5. Health Insurance
- Policy details
- Coverage information
- Claim tracking
- Renewal reminders

## Database Schema

```sql
CREATE TABLE health_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    blood_group VARCHAR(10),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    allergies TEXT[],
    chronic_conditions TEXT[],
    emergency_contact VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_records (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    record_type VARCHAR(50),
    doctor_name VARCHAR(255),
    hospital VARCHAR(255),
    diagnosis TEXT,
    prescription TEXT,
    record_date DATE,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vaccinations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    vaccine_name VARCHAR(255),
    dose_number INT,
    vaccination_date DATE,
    next_dose_date DATE,
    administered_by VARCHAR(255)
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    doctor_name VARCHAR(255),
    specialty VARCHAR(100),
    appointment_date TIMESTAMP,
    location VARCHAR(255),
    reason TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

```
POST   /api/v1/health/profiles               - Create health profile
GET    /api/v1/health/profiles/{userId}      - Get health profile
PUT    /api/v1/health/profiles/{userId}      - Update profile

POST   /api/v1/health/records                - Add medical record
GET    /api/v1/health/records                - List medical records
GET    /api/v1/health/records/{id}           - Get record details
PUT    /api/v1/health/records/{id}           - Update record

POST   /api/v1/health/vaccinations           - Add vaccination
GET    /api/v1/health/vaccinations           - List vaccinations
GET    /api/v1/health/vaccinations/upcoming  - Upcoming doses

POST   /api/v1/health/appointments           - Schedule appointment
GET    /api/v1/health/appointments           - List appointments
GET    /api/v1/health/appointments/upcoming  - Upcoming appointments
PUT    /api/v1/health/appointments/{id}      - Update appointment
```

## Implementation Priority

1. Health profiles (Week 10)
2. Medical records (Week 10)
3. Vaccination tracking (Week 11)
4. Appointment scheduling (Week 11)
5. Reminders and notifications (Week 11)
