# AI Module Technical Documentation

This document provides a technical overview of the AI-powered features within the Griham application. It is intended for developers and stakeholders to understand the architecture, implementation, and usage of the AI module.

## 1. High-Level Design (HLD)

The AI module is designed to provide intelligent financial analysis and automation capabilities to users. It integrates with a third-party AI service (Hugging Face) to perform complex tasks like natural language processing and data analysis.

### Key Features:

- **Financial Insights:** Analyzes a user's financial data to provide a health assessment, key observations, and actionable recommendations.
- **Savings Tips:** Generates personalized money-saving tips based on a user's spending habits.
- **SMS Parsing for Transactions:** Extracts transaction details from an SMS message, allowing for quick and easy data entry.
- **SMS Parsing for Cards:** Extracts credit/debit card details from an SMS message.

### Architecture:

The AI module follows a three-tier architecture:

1.  **API Endpoints:** The entry point for all AI-related API requests. It handles request validation, data gathering, and calls the appropriate services.
2.  **AI Service:** Contains the core business logic for the AI features. It constructs the prompts, interacts with the AI Client, and processes the AI-generated responses.
3.  **AI Client:** A dedicated client for interacting with the AI provider's API. It handles the details of making HTTP requests, authentication, and error handling.

## 2. Low-Level Design (LLD)

### API Endpoints

-   **`GET /api/finance/ai/insights/{familyId}`:**
    -   Retrieves the user's total balance, monthly income/expenses, and upcoming bills.
    -   Calculates the savings rate.
    -   Calls the AI Service to generate finance insights with the aggregated financial data.
    -   Returns the financial data along with the AI-generated insights.
-   **`GET /api/finance/ai/savings-tips/{familyId}`:**
    -   Fetches the user's transactions for the current month.
    -   Calls the AI Service to generate savings tips with the transaction data.
    -   Returns the AI-generated savings tips.
-   **`POST /api/finance/ai/parse-sms/{familyId}`:**
    -   Receives an SMS message in the request body.
    -   Calls the AI Service to extract transaction details.
    -   Constructs a new transaction object with the parsed data.
    -   Returns the newly created transaction.
-   **`POST /api/finance/ai/parse-sms-card/{familyId}`:**
    -   Receives an SMS message in the request body.
    -   Calls the AI Service to extract card details.
    -   Returns the parsed card information.

### AI Service

-   **Generate Finance Insights:**
    -   Constructs a detailed prompt with the user's financial data.
    -   Calls the AI Client to get insights from the AI model.
-   **Generate Savings Tips:**
    -   Analyzes the user's spending by category.
    -   Constructs a prompt with the top spending categories.
    -   Calls the AI Client to get savings tips.
-   **Parse SMS to Transaction:**
    -   Constructs a prompt that instructs the AI to extract specific fields (type, amount, category, description, date) from the SMS.
    -   Specifies that the output must be a JSON object.
    -   Calls the AI Client and then parses the JSON response.
-   **Parse SMS to Card:**
    -   Constructs a prompt to extract card details (card type, bank name, last four digits, etc.).
    -   Specifies a JSON output format.
    -   Calls the AI Client and parses the JSON response.

### AI Client

-   **`generate`:**
    -   The primary method for communicating with the AI provider's API.
    -   It first attempts to use a `chatCompletions` endpoint.
    -   If that fails, it falls back to a `textGeneration` endpoint.
-   **`chatCompletions`:**
    -   Sends a POST request to the AI provider's chat completions API.
    -   Includes the model name, prompt, and other parameters in the payload.
-   **`textGeneration`:**
    -   Sends a POST request to the AI provider's text generation API.
    -   This is a fallback method and provides compatibility with a wider range of models.

## 3. Prompts and Sample Inputs

### Financial Insights

-   **Prompt:**
    ```
    Analyze this family's financial data and provide insights:

    Total Balance: ₹50,000.00
    Monthly Income: ₹75,000.00
    Monthly Expenses: ₹45,000.00
    Savings Rate: 40%
    Upcoming Bills: 3

    Provide:
    1. Financial health assessment (1-2 sentences)
    2. Key observations (2-3 points)
    3. Actionable recommendations (2-3 specific actions)

    Keep it concise, practical, and motivating.
    ```

### Savings Tips

-   **Prompt:**
    ```
    Based on these expense categories, provide 3 specific money-saving tips:

    - Food: ₹15,000.00
    - Shopping: ₹10,000.00
    - Transport: ₹5,000.00

    Provide practical, actionable tips to reduce expenses in these areas.
    ```

### SMS to Transaction

-   **Sample Input (SMS Text):**
    ```
    Transaction Successful! INR 282.00 spent on your IDFC FIRST Bank Credit Card ending XX5171 at FASHNEAR TECHNOLOGIES PRI on 26 FEB 2026 at 01:55 PM Avbl Limit: INR 12449.64 If not done by you, call 180010888 for dispute or to block your card SMS CCBLOCK 5171 to 5676732

    Spent INR 150
    Axis Bank Card no. XX5666
    08-02-26 11:11:05 IST
    GULAM NAVI
    Avl Limit: INR 157575.22
    Not you? SMS BLOCK 5666 to 919951860002

    Dear Cardholder, your payment of INR 706.82 at HOSTINGER PTE LTD is due on 16/11/2025 and will be processed through your credit card ending 1325 as per e-Mandate (SiHub ID: Y1BttXDbkf) registered by you. To opt out of this e-Mandate, please log in to www.sbicard.com/emandates. In case, domestic Online usage on your card is inactive, please enable it by visiting https://sbicard.com/manage-card-usage to prevent any transaction decline - SBI Card

    Your A/C XXXXX834887 Debited INR 37,500.00 on 03/09/25 -Transferred to Mr. RAJESH KUMAR JHA. Avl Balance INR 10,500.66-SBI

    Dear customer, EMI due on 01032026 in A/c XXXXX821150. Please pay in time. Please ignore, if already paid.-SBI

    ```
-   **Prompt:**
    ```
    Extract transaction details from this SMS and return ONLY a JSON object with these exact fields:

    SMS: INR 1900.00 credited A/c no. XX7810 02-26-26, 18:19:29 UPI/P2M/391814115893/SRI KAUVERY MEDICAL Not you? SMS BLOCKUPI Cust ID to 919951860002 Axis Bank

    Return JSON with:
    - type: "income" or "expense"
    - amount: number (without currency symbol)
    - category: one of [Business, Rental, Food, Transport, Utilities, Shopping, Entertainment, Healthcare, Education, Other]
    - description: brief description of the transaction (e.g., "Credited to your", "Flight ticket" , "EMI payment")
    - date: YYYY-MM-DD format
    - transaction_id: unique identifier for the transaction (can be null if not provided)
    - account_type: "card" or "account"
    - bank_name: bank name
    - account_number: account number

    Return ONLY the JSON object, no other text.
    ```

### SMS to Card

-   **Sample Input (SMS Text):**
    ```
    Congratulations! Your new ICICI Bank Coral Credit Card ending in 1234 has been approved with a limit of Rs. 1,00,000.
    ```
-   **Prompt:**
    ```
    Extract card details from this SMS and return ONLY a JSON object with these exact fields:

    SMS: Congratulations! Your new ICICI Bank Coral Credit Card ending in 1234 has been approved with a limit of Rs. 1,00,000.

    Return JSON with:
    - card_type: "credit" or "debit"
    - bank_name: bank name
    - card_name: card product name
    - last_four_digits: last 4 digits of card
    - card_limit: credit limit if mentioned (number or null)

    Return ONLY the JSON object, no other text.
    ```

## Configuration

The following environment variables are required for the AI module to function:

```env
HF_TOKEN=your_huggingface_token
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

You can obtain a token from [Hugging Face](https://huggingface.co/settings/tokens).

## Models Used

- **Text Generation**: `mistralai/Mistral-7B-Instruct-v0.2` (or as specified in `HF_MODEL`)
- **API**: HuggingFace Inference API (free tier)
- **Fallback**: The system is designed to degrade gracefully if the AI service is unavailable.

## Future Enhancements

- [ ] Budget recommendations
- [ ] Expense pattern analysis
- [ ] Investment suggestions
- [ ] Bill payment predictions
- [ ] Financial goal tracking
- [ ] Anomaly detection