# Finance Module

Complete financial management for household income, expenses, investments, and savings.

## Features

### 1. Bank Accounts
- Multiple account management
- Balance tracking
- Account types: Savings, Current, Credit

### 2. Transactions
- Income tracking (salary, business, rental)
- Expense tracking with categories
- Transaction history with search/filter
- Monthly/yearly reports

### 3. Cards
- Credit/debit card management
- Credit limit tracking
- Billing and due date reminders
- Card usage analytics

### 4. Bills
- Utility bills (electricity, water, gas, internet)
- Subscription management
- Recurring bill automation
- Payment reminders and alerts
- Overdue tracking

### 5. Investments
- Stocks portfolio
- Mutual funds tracking
- Fixed deposits (FD)
- Bonds and securities
- Returns calculation
- Maturity date tracking

### 6. Savings Goals
- Target-based savings
- Progress tracking
- Goal completion status
- Multiple goals support

## Database Schema

```sql
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    account_name VARCHAR(255),
    account_number VARCHAR(50),
    bank_name VARCHAR(255),
    account_type VARCHAR(50),
    balance DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES bank_accounts(id),
    type VARCHAR(20),
    category VARCHAR(100),
    amount DECIMAL(15,2),
    description TEXT,
    transaction_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    card_number_last4 VARCHAR(4),
    card_type VARCHAR(50),
    bank_name VARCHAR(255),
    credit_limit DECIMAL(15,2),
    billing_date INT,
    due_date INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    bill_name VARCHAR(255),
    category VARCHAR(100),
    amount DECIMAL(15,2),
    due_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE investments (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    investment_type VARCHAR(100),
    name VARCHAR(255),
    amount_invested DECIMAL(15,2),
    current_value DECIMAL(15,2),
    purchase_date DATE,
    maturity_date DATE,
    returns DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE savings_goals (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    goal_name VARCHAR(255),
    target_amount DECIMAL(15,2),
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

```
POST   /api/v1/finance/accounts              - Create bank account
GET    /api/v1/finance/accounts              - List all accounts
GET    /api/v1/finance/accounts/{id}         - Get account details
PUT    /api/v1/finance/accounts/{id}         - Update account
DELETE /api/v1/finance/accounts/{id}         - Delete account

POST   /api/v1/finance/transactions          - Create transaction
GET    /api/v1/finance/transactions          - List transactions
GET    /api/v1/finance/transactions/{id}     - Get transaction details
PUT    /api/v1/finance/transactions/{id}     - Update transaction
DELETE /api/v1/finance/transactions/{id}     - Delete transaction

POST   /api/v1/finance/cards                 - Add card
GET    /api/v1/finance/cards                 - List cards
PUT    /api/v1/finance/cards/{id}            - Update card
DELETE /api/v1/finance/cards/{id}            - Delete card

POST   /api/v1/finance/bills                 - Create bill
GET    /api/v1/finance/bills                 - List bills
GET    /api/v1/finance/bills/upcoming        - Get upcoming bills
PUT    /api/v1/finance/bills/{id}/pay        - Mark bill as paid

POST   /api/v1/finance/investments           - Add investment
GET    /api/v1/finance/investments           - List investments
GET    /api/v1/finance/investments/summary   - Portfolio summary

POST   /api/v1/finance/savings-goals         - Create savings goal
GET    /api/v1/finance/savings-goals         - List goals
PUT    /api/v1/finance/savings-goals/{id}    - Update goal

GET    /api/v1/finance/reports/monthly       - Monthly report
GET    /api/v1/finance/reports/yearly        - Yearly report
GET    /api/v1/finance/reports/category      - Category-wise spending
```

## Implementation Priority

1. Bank Accounts (Week 3)
2. Transactions (Week 3-4)
3. Bills Management (Week 4)
4. Cards & Investments (Week 5)
5. Savings Goals (Week 5)
6. Reports & Analytics (Week 5)
