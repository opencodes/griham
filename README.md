# Griham - Home Automation System

A comprehensive home management platform to track and organize all aspects of household life including finances, events, contacts, assets, health, and more.

## 📚 Documentation

Detailed documentation for each module:

- [System Architecture](docs/ARCHITECTURE.md) - System design, technology stack, and patterns
- [Finance Module](docs/FINANCE.md) - Income, expenses, bills, investments, savings
- [Events Module](docs/EVENTS.md) - Birthdays, anniversaries, cultural events
- [Contacts Module](docs/CONTACTS.md) - Family, neighbors, vendors
- [Assets Module](docs/ASSETS.md) - Property, vehicles, gadgets, documents
- [Health Module](docs/HEALTH.md) - Medical records, appointments, vaccinations
- [Organizer Module](docs/ORGANIZER.md) - Tasks, notes, shopping lists
- [Messaging Module](docs/MESSAGING.md) - Internal messaging and notifications

---

## 🏗️ System Architecture

![System Architecture](docs/architecture.drawio.png)

---

## 🎯 Core Modules

1. **Finance Track** - Income, expenses, cards, bills, investments, savings, transactions
2. **Event Track** - Birthdays, anniversaries, cultural events with reminders
3. **Contacts** - Family, neighbors, vendors with emergency contacts
4. **Assets** - Property, vehicles, gadgets, documents with expiry tracking
5. **Health** - Medical records, vaccinations, appointments, prescriptions
6. **Organizer** - Tasks, notes, shopping lists, reminders
7. **Messaging** - Internal messaging, notifications, alerts

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.1+
- MySQL 5.7+
- Node.js 18+
- Composer

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/griham.git
cd griham

# Setup backend
cd backend
composer install
cp .env.example .env
# Edit .env with your database credentials
php database/migrate.php

# Setup frontend
cd ../frontend
npm install

# Start both servers
cd ..
./start-dev.sh
```

### Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

### Test Credentials
- Email: `admin@griham.com`
- Password: `admin123`

---

## 📋 Implementation Phases

- **Phase 1** (Weeks 1-2): Foundation & User Management
- **Phase 2** (Weeks 3-5): Finance Module
- **Phase 3** (Weeks 6-7): Event & Contact Modules
- **Phase 4** (Weeks 8-9): Asset Module
- **Phase 5** (Weeks 10-11): Health Module
- **Phase 6** (Weeks 12-13): Organizer & Messaging
- **Phase 7** (Weeks 14-16): Advanced Features
- **Phase 8** (Weeks 17-18): Testing & Deployment

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Contact

Project Link: [https://github.com/yourusername/griham](https://github.com/yourusername/griham)
