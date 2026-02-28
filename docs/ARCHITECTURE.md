# System Architecture

Detailed architecture and design decisions for Griham Home Automation System.

> **Visual Diagram**: Open [architecture.drawio](architecture.drawio) in Draw.io for an interactive architecture diagram.

## System Layers

### 1. Presentation Layer
- **Web Application**: React.js/Vue.js/Angular
- **Mobile Application**: React Native/Flutter
- **Desktop Application**: Electron
- **API Clients**: Third-party integrations

### 2. API Gateway Layer
- Authentication & Authorization (JWT)
- Rate limiting
- Request validation
- API versioning
- Load balancing

### 3. Application Layer
Microservices architecture with independent services:
- Finance Service
- Event Service
- Contact Service
- Asset Service
- Health Service
- Organizer Service
- Messaging Service

### 4. Data Access Layer
- Repository pattern
- ORM (SQLAlchemy/Prisma/Hibernate)
- Database connection pooling
- Query optimization

### 5. Database Layer
- **PostgreSQL**: Primary relational database
- **Redis**: Caching and session management
- **S3/MinIO**: File storage
- **RabbitMQ/Kafka**: Message queue

### 6. External Services
- SMS Gateway (Twilio)
- Email Service (SendGrid/AWS SES)
- Push Notifications (FCM)
- Payment Gateway (Stripe/Razorpay)

## Admin Portal - Functional Features

This section outlines the user interactions, views, and actions available in the Griham Admin Portal. The portal is designed for administrators to manage the application's data, users, and overall system health.

### 1. Admin Dashboard
- **View**: A summary of key system metrics.
    - Total users.
    - Active sessions.
    - Service health status (e.g., Finance Service: Online, Event Service: Degraded).
    - Recent high-priority alerts.
- **Actions**:
    - Navigate to different management sections.

### 2. User Management
- **View**: A paginated list of all registered users with search and filter capabilities.
    - Columns: User ID, Name, Email, Role (e.g., Admin, User), Status (Active, Suspended), Last Login.
- **Actions**:
    - **Create User**: Manually create a new user account.
    - **Edit User**: Modify user details, change roles.
    - **Suspend/Unsuspend User**: Temporarily disable or re-enable a user's account.
    - **Delete User**: Permanently remove a user account.
    - **Impersonate User**: Log in as a specific user for troubleshooting purposes (with strict auditing).

### 3. Finance Management (Finance Service)
- **View**:
    - **Global Transactions**: A view of all transactions across all users, with powerful filtering (by user, date range, category, amount).
    - **Category Management**: View and manage the default expense/income categories available to users.
- **Actions**:
    - **Edit/Delete Transactions**: Admins can correct or remove erroneous transaction entries.
    - **Add/Edit/Delete Categories**: Manage the global list of transaction categories.

### 4. System Health & Monitoring (Health Service)
- **View**:
    - **Service Status**: Detailed dashboard showing the real-time status of each microservice (e.g., API Gateway, Finance Service).
    - **Logs Explorer**: An interface to search and view application logs from the centralized logging system (ELK).
    - **Metrics Dashboard**: View key performance indicators from Prometheus/Grafana (e.g., API latency, error rates, CPU/memory usage).
- **Actions**:
    - **Trigger Health Checks**: Manually initiate health checks for a specific service.
    - **Set Alert Rules**: Configure alerting thresholds and notification channels (e.g., alert if API error rate > 5% for 5 minutes).

### 5. Content & Asset Management (Asset Service)
- **View**:
    - **Global Asset Registry**: A list of all user-uploaded assets (e.g., receipts, documents).
    - Filter by user, file type, upload date.
- **Actions**:
    - **View Asset**: Open and inspect an asset.
    - **Delete Asset**: Remove assets that violate terms of service or for data cleanup.

### 6. Settings & Configuration
- **View**:
    - **Application Settings**: View and manage global application settings (e.g., feature flags, external service API keys).
    - **API Gateway Config**: View rate limits, and API versioning rules.
- **Actions**:
    - **Update Settings**: Modify application settings. (e.g., enable/disable a new feature for all users).
    - **Manage API Keys**: Rotate or revoke keys for external services (Twilio, SendGrid).

## Technology Stack

### Backend
```
Language: Python 3.11+
Framework: FastAPI
Database: PostgreSQL 14+
Cache: Redis 7+
Queue: RabbitMQ
ORM: SQLAlchemy
```

### Frontend
```
Framework: React.js 18+
State Management: Redux/Zustand
UI Library: Material-UI/Tailwind CSS
Build Tool: Vite
```

### DevOps
```
Containerization: Docker
Orchestration: Kubernetes
CI/CD: GitHub Actions
Monitoring: Prometheus + Grafana
Logging: ELK Stack
```

## Design Patterns

### 1. Repository Pattern
Abstracts data access logic from business logic.

### 2. Service Layer Pattern
Encapsulates business logic in service classes.

### 3. Factory Pattern
Creates objects without specifying exact classes.

### 4. Observer Pattern
Notification system for event-driven updates.

### 5. Strategy Pattern
Different algorithms for calculations (interest, returns).

## Security

### Authentication
- JWT-based token authentication
- Refresh token mechanism
- Token expiration and rotation

### Authorization
- Role-based access control (RBAC)
- Household-level permissions
- Resource-level access control

### Data Security
- Password hashing (bcrypt)
- Data encryption at rest
- HTTPS/TLS for data in transit
- SQL injection prevention (ORM)
- XSS protection
- CSRF tokens

## Performance Optimization

### Caching Strategy
- Redis for session data
- API response caching
- Database query result caching
- Cache invalidation policies

### Database Optimization
- Proper indexing
- Query optimization
- Connection pooling
- Read replicas for scaling

### API Optimization
- Pagination for large datasets
- Lazy loading
- Response compression
- CDN for static assets

## Scalability

### Horizontal Scaling
- Stateless application servers
- Load balancer distribution
- Database sharding (future)

### Vertical Scaling
- Resource optimization
- Efficient algorithms
- Memory management

## Monitoring & Logging

### Metrics
- API response times
- Error rates
- Database query performance
- Cache hit rates

### Logging
- Structured logging (JSON)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Centralized log aggregation (ELK)
- Log retention policies

### Alerting
- Performance degradation alerts
- Error threshold alerts
- Resource utilization alerts
- Uptime monitoring