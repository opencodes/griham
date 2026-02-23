#!/bin/bash

# Get auth token (use your actual credentials)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@griham.com","password":"admin123"}' | jq -r '.data.token')

echo "Token: $TOKEN"

# Get family ID
FAMILY_ID=$(curl -s -X GET http://localhost:8000/api/families \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

echo "Family ID: $FAMILY_ID"

# 1. Create Bank Account
echo "Creating bank account..."
ACCOUNT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/finance/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"family_id\": \"$FAMILY_ID\",
    \"account_name\": \"HDFC Savings\",
    \"account_number\": \"1234567890\",
    \"bank_name\": \"HDFC Bank\",
    \"account_type\": \"savings\",
    \"balance\": 50000.00
  }")

ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | jq -r '.data.id')
echo "Account created: $ACCOUNT_ID"

# 2. Create Transaction (Income)
echo "Creating income transaction..."
curl -s -X POST http://localhost:8000/api/finance/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"family_id\": \"$FAMILY_ID\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"type\": \"income\",
    \"category\": \"Salary\",
    \"amount\": 75000.00,
    \"description\": \"Monthly salary\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }"

echo ""

# 3. Create Transaction (Expense)
echo "Creating expense transaction..."
curl -s -X POST http://localhost:8000/api/finance/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"family_id\": \"$FAMILY_ID\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"type\": \"expense\",
    \"category\": \"Food\",
    \"amount\": 5000.00,
    \"description\": \"Groceries\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }"

echo ""

# 4. Create Bill
echo "Creating bill..."
NEXT_WEEK=$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d "+7 days" +%Y-%m-%d)
curl -s -X POST http://localhost:8000/api/finance/bills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"family_id\": \"$FAMILY_ID\",
    \"bill_name\": \"Electricity Bill\",
    \"category\": \"Electricity\",
    \"amount\": 2500.00,
    \"due_date\": \"$NEXT_WEEK\",
    \"is_recurring\": true,
    \"recurrence_pattern\": \"monthly\",
    \"status\": \"pending\"
  }"

echo ""
echo "Sample data inserted successfully!"
