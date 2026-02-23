# Events Module

Track and manage important family events, birthdays, anniversaries, and cultural celebrations.

## Features

### 1. Event Types
- **Birthdays**: Family member birthdays with age tracking
- **Anniversaries**: Wedding, work, relationship milestones
- **Cultural Events**: Mundan, naming ceremony, thread ceremony
- **Custom Events**: User-defined special occasions

### 2. Event Management
- Recurring event support (yearly, monthly)
- Multiple reminder notifications (7, 3, 1 days before)
- Calendar integration
- Event history tracking

### 3. Notifications
- Email reminders
- SMS alerts
- Push notifications
- In-app notifications

## Database Schema

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    event_type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    event_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50),
    reminder_days INT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

```
POST   /api/v1/events                        - Create event
GET    /api/v1/events                        - List events
GET    /api/v1/events/upcoming               - Upcoming events
GET    /api/v1/events/{id}                   - Get event details
PUT    /api/v1/events/{id}                   - Update event
DELETE /api/v1/events/{id}                   - Delete event
GET    /api/v1/events/calendar/{month}       - Calendar view
```

## Implementation Priority

1. Event CRUD operations (Week 6)
2. Recurring events logic (Week 6)
3. Reminder system (Week 7)
4. Calendar view (Week 7)
