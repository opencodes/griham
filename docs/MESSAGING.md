# Messaging Module

Internal family communication, notifications, and alert system.

## Features

### 1. Internal Messaging
- Direct messages between family members
- Broadcast messages to all members
- Message threads
- Read receipts
- Message priority levels

### 2. Notifications
- System notifications
- Event reminders
- Bill payment alerts
- Document expiry warnings
- Appointment reminders
- Custom notifications

### 3. Notification Channels
- In-app notifications
- Email notifications
- SMS alerts
- Push notifications (mobile)

### 4. Notification Preferences
- Channel preferences per user
- Notification frequency settings
- Do not disturb mode
- Priority-based filtering

## Database Schema

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    sender_id UUID REFERENCES users(id),
    message_type VARCHAR(50),
    subject VARCHAR(255),
    content TEXT,
    priority VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_recipients (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES messages(id),
    recipient_id UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    notification_type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

```
POST   /api/v1/messages                      - Send message
GET    /api/v1/messages                      - List messages
GET    /api/v1/messages/{id}                 - Get message
PUT    /api/v1/messages/{id}/read            - Mark as read
DELETE /api/v1/messages/{id}                 - Delete message

GET    /api/v1/notifications                 - List notifications
GET    /api/v1/notifications/unread          - Unread notifications
PUT    /api/v1/notifications/{id}/read       - Mark as read
PUT    /api/v1/notifications/read-all        - Mark all as read
DELETE /api/v1/notifications/{id}            - Delete notification
```

## Implementation Priority

1. Internal messaging (Week 13)
2. Notification system (Week 13)
3. Email/SMS integration (Week 13)
4. Notification preferences (Week 13)
