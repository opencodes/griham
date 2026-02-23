# Griham - Quick Reference

## 🚀 Start Application

```bash
./start-dev.sh
```

## 📍 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api

## 🔐 Test Account

- **Email**: admin@griham.com
- **Password**: admin123

## 📁 Key Files

### Backend
- `backend/public/index.php` - Entry point & router
- `backend/src/Modules/Auth/Controllers/AuthController.php` - Auth logic
- `backend/src/Modules/Household/Controllers/HouseholdController.php` - Household logic
- `backend/database/migrations/` - Database schema

### Frontend
- `frontend/src/pages/Login.tsx` - Login/Register page
- `frontend/src/pages/Dashboard.tsx` - Main dashboard
- `frontend/src/hooks/useAuth.tsx` - Auth context
- `frontend/src/lib/api.ts` - API service

## 🔌 API Endpoints

### Public
```
POST /api/auth/register
POST /api/auth/login
```

### Protected (requires Bearer token)
```
GET  /api/auth/me
POST /api/households
GET  /api/households
GET  /api/households/{id}
POST /api/households/{id}/members
```

## 🗄️ Database

**Tables**: users, households, household_members

**Reset Database**:
```bash
cd backend
php database/migrate.php
```

## 📦 Install Dependencies

**Backend**:
```bash
cd backend && composer install
```

**Frontend**:
```bash
cd frontend && npm install
```

## 🛠️ Development

**Backend Only**:
```bash
cd backend
php -S localhost:8000 -t public
```

**Frontend Only**:
```bash
cd frontend
npm run dev
```

## ✅ Phase 1 Complete

- [x] User Authentication
- [x] User Registration
- [x] JWT Tokens
- [x] Household Management
- [x] Protected Routes
- [x] Responsive UI

## 🎯 Next: Phase 2 - Finance Module

- [ ] Bank Accounts
- [ ] Transactions
- [ ] Bills Management
- [ ] Cards & Investments
