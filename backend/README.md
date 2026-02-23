# Griham Backend - PHP API

Foundation backend for Griham Home Automation System.

## Setup

1. Install dependencies:
```bash
composer install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run migrations:
```bash
php database/migrate.php
```

4. Start server:
```bash
php -S localhost:8000 -t public
```

## API Endpoints

### Auth
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user (protected)

### Households
- POST `/api/households` - Create household (protected)
- GET `/api/households` - List user households (protected)
- GET `/api/households/{id}` - Get household details (protected)
- POST `/api/households/{id}/members` - Add member (protected)

## Structure

```
backend/
├── config/          # Configuration files
├── database/        # Migrations
├── public/          # Entry point
└── src/
    ├── Core/        # Base classes
    ├── Middleware/  # Auth middleware
    ├── Modules/     # Feature modules
    │   ├── Auth/
    │   ├── User/
    │   └── Household/
    └── Utils/       # Helpers
```
