# Griham Frontend

React + TypeScript + Vite frontend for Griham Home Automation System.

## Features

- ✅ User Authentication (Login/Register)
- ✅ Dashboard with Household Management
- ✅ Create and List Households
- ✅ Protected Routes
- ✅ JWT Token Management

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide Icons

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:8000/api
```

## Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Pages

- `/login` - Login/Register page
- `/` - Dashboard (protected)

## API Integration

All API calls are handled through `src/lib/api.ts` with automatic JWT token injection.
