<?php

namespace App\Modules\AI\Prompts;

class AIPrompts
{
    public static function financeInsights(array $data): string
    {
        $prompt = "Analyze this family's financial data and provide insights:\n\n";
        $prompt .= "Total Balance: ₹" . number_format($data['total_balance'] ?? 0, 2) . "\n";
        $prompt .= "Monthly Income: ₹" . number_format($data['total_income'] ?? 0, 2) . "\n";
        $prompt .= "Monthly Expenses: ₹" . number_format($data['total_expense'] ?? 0, 2) . "\n";
        $prompt .= "Savings Rate: " . ($data['savings_rate'] ?? 0) . "%\n";
        $prompt .= "Upcoming Bills: " . ($data['upcoming_bills'] ?? 0) . "\n\n";
        $prompt .= "Provide:\n";
        $prompt .= "1. Financial health assessment (1-2 sentences)\n";
        $prompt .= "2. Key observations (2-3 points)\n";
        $prompt .= "3. Actionable recommendations (2-3 specific actions)\n\n";
        $prompt .= "Keep it concise, practical, and motivating.";

        return $prompt;
    }

    public static function savingsTips(array $topCategories): string
    {
        $prompt = "Based on these expense categories, provide 3 specific money-saving tips:\n\n";
        foreach ($topCategories as $cat => $amount) {
            $prompt .= "- {$cat}: ₹" . number_format($amount, 2) . "\n";
        }
        $prompt .= "\nProvide practical, actionable tips to reduce expenses in these areas.";

        return $prompt;
    }

    public static function billReminder(array $bill): string
    {
        $prompt = "Generate a friendly reminder message for this bill:\n";
        $prompt .= "Bill: {$bill['bill_name']}\n";
        $prompt .= "Amount: ₹{$bill['amount']}\n";
        $prompt .= "Due Date: {$bill['due_date']}\n";
        $prompt .= "Category: {$bill['category']}\n\n";
        $prompt .= "Keep it short, friendly, and actionable (2-3 sentences).";

        return $prompt;
    }

    public static function smsToTransaction(string $smsText): string
    {
        return <<<PROMPT
You are a financial SMS transaction parser for an expense tracker application.
Your task is to extract structured transaction data from the SMS below.

STRICT INSTRUCTIONS:
- Return ONLY a valid JSON object.
- Do NOT include markdown.
- Do NOT include explanation.
- Do NOT add extra fields.
- If a field is not present, return null.
- Do NOT guess missing values.
- Ignore customer care numbers, fraud warnings, URLs, opt-out instructions, and promotional text.
- Amount must be a number (remove commas and currency symbols).
- Currency should be extracted if present (e.g., INR), else null.
- Date format must be YYYY-MM-DD.
- Time format must be HH:MM:SS (24-hour format).
- If year is in YY format, assume 20YY.
- Convert AM/PM to 24-hour format.
- Extract only last 4 digits for account/card number.

MERCHANT EXTRACTION RULES:
- Merchant is the business or person receiving or sending money.
- Usually appears after keywords: "at", "to", "from".
- In UPI format (UPI/.../MERCHANT NAME), extract only the last segment.
- Remove prefixes like "Mr.", "Ms.", "Transferred to".
- Remove account numbers, dates, and transaction references.
- merchant_name must contain only the clean name.

DESCRIPTION RULE:
- description MUST be exactly equal to merchant_name.
- If merchant_name is null, description must be null.
- Do not add extra words.

TRANSACTION TYPE RULES:
- "credited" → income
- "debited", "spent", "paid", "transferred" → expense
- If unclear → expense

TRANSACTION STATUS RULES:
- If contains "spent", "debited", "credited" → completed
- If contains "due", "will be processed", "scheduled" → scheduled
- If contains "EMI due" → due
- If reminder only and no amount debited → due

CATEGORY RULES (MANDATORY):

Category must NEVER be null.

Category must be determined primarily from merchant_name.

Only use full SMS text if merchant_name is null.

Matching must be case-insensitive.

If no keyword match → "Other".

Use EXACT values below only.

Healthcare:
medical, hospital, clinic, pharmacy, pharma, med, lab, diagnostics

Food:
restaurant, cafe, bakery, food, kitchen, dhaba, mess

Transport:
fuel, petrol, diesel, cab, taxi, uber, ola, metro, rail, airline

Utilities:
electricity, power, gas, water, broadband, telecom, recharge, hosting

Shopping:
amazon, flipkart, mart, store, retail, mall, fashion, electronics

Entertainment:
movie, cinema, netflix, prime, hotstar, gaming, theatre

Education:
school, college, university, academy, institute, coaching

Rental:
rent

Business:
solutions, technologies, services, enterprises, consulting, traders

If no match → Other

RECURRING RULES:
- If contains EMI, subscription, SIP, auto-debit, standing instruction, e-Mandate → true
- Else → false

Return JSON with EXACT structure:

{
  "type": "",
  "amount": 0,
  "currency": "",
  "category": "",
  "merchant_name": "",
  "description": "",
  "payment_method": "",
  "transaction_id": "",
  "date": "",
  "time": "",
  "account_last4": "",
  "bank_name": "",
  "is_recurring": false,
  "transaction_status": "",
  "available_balance": 0,
  "available_limit": 0,
  "confidence_score": 0.0
}

SMS:{$smsText}
PROMPT;
    }

    public static function smsToCard(string $smsText): string
    {
        $prompt = "Extract card details from this SMS and return ONLY a JSON object with these exact fields:\n\n";
        $prompt .= "SMS: {$smsText}\n\n";
        $prompt .= "Return JSON with:\n";
        $prompt .= "- card_type: \"credit\" or \"debit\"\n";
        $prompt .= "- bank_name: bank name\n";
        $prompt .= "- card_name: card product name\n";
        $prompt .= "- last_four_digits: last 4 digits of card\n";
        $prompt .= "- card_limit: credit limit if mentioned (number or null)\n\n";
        $prompt .= "Return ONLY the JSON object, no other text.";

        return $prompt;
    }
}
