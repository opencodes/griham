<?php

namespace App\Modules\AI\Services;

class AIService
{
    private HuggingFaceClient $client;

    public function __construct()
    {
        $this->client = new HuggingFaceClient();
    }

    public function generateFinanceInsights(array $data): ?string
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $prompt = $this->buildFinancePrompt($data);
        return $this->client->generate($prompt, 300);
    }

    public function generateBillReminder(array $bill): ?string
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $prompt = "Generate a friendly reminder message for this bill:\n";
        $prompt .= "Bill: {$bill['bill_name']}\n";
        $prompt .= "Amount: ₹{$bill['amount']}\n";
        $prompt .= "Due Date: {$bill['due_date']}\n";
        $prompt .= "Category: {$bill['category']}\n\n";
        $prompt .= "Keep it short, friendly, and actionable (2-3 sentences).";

        return $this->client->generate($prompt, 150);
    }

    public function generateSavingsTips(array $transactions): ?string
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $categories = [];
        foreach ($transactions as $txn) {
            if ($txn['type'] === 'expense') {
                $cat = $txn['category'];
                $categories[$cat] = ($categories[$cat] ?? 0) + $txn['amount'];
            }
        }

        arsort($categories);
        $topCategories = array_slice($categories, 0, 3, true);

        $prompt = "Based on these expense categories, provide 3 specific money-saving tips:\n\n";
        foreach ($topCategories as $cat => $amount) {
            $prompt .= "- {$cat}: ₹" . number_format($amount, 2) . "\n";
        }
        $prompt .= "\nProvide practical, actionable tips to reduce expenses in these areas.";

        return $this->client->generate($prompt, 250);
    }

    public function parseSMSToTransaction(string $smsText): ?array
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $prompt = "Extract transaction details from this SMS and return ONLY a JSON object with these exact fields:\n\n";
        $prompt .= "SMS: {$smsText}\n\n";
        $prompt .= "Return JSON with:\n";
        $prompt .= "- type: \"income\" or \"expense\"\n";
        $prompt .= "- amount: number (without currency symbol)\n";
        $prompt .= "- category: one of [Salary, Business, Rental, Food, Transport, Utilities, Shopping, Entertainment, Healthcare, Education, Other]\n";
        $prompt .= "- description: brief description\n";
        $prompt .= "- date: YYYY-MM-DD format\n\n";
        $prompt .= "Return ONLY the JSON object, no other text.";

        $response = $this->client->generate($prompt, 200);
        
        if (!$response) {
            return null;
        }

        // Extract JSON from response
        $json = $this->extractJSON($response);
        if (!$json) {
            return null;
        }

        // Validate required fields
        $required = ['type', 'amount', 'category', 'description', 'date'];
        foreach ($required as $field) {
            if (!isset($json[$field])) {
                return null;
            }
        }

        return $json;
    }

    public function parseSMSToCard(string $smsText): ?array
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $prompt = "Extract card details from this SMS and return ONLY a JSON object with these exact fields:\n\n";
        $prompt .= "SMS: {$smsText}\n\n";
        $prompt .= "Return JSON with:\n";
        $prompt .= "- card_type: \"credit\" or \"debit\"\n";
        $prompt .= "- bank_name: bank name\n";
        $prompt .= "- card_name: card product name\n";
        $prompt .= "- last_four_digits: last 4 digits of card\n";
        $prompt .= "- card_limit: credit limit if mentioned (number or null)\n\n";
        $prompt .= "Return ONLY the JSON object, no other text.";

        $response = $this->client->generate($prompt, 200);
        
        if (!$response) {
            return null;
        }

        $json = $this->extractJSON($response);
        if (!$json) {
            return null;
        }

        $required = ['card_type', 'bank_name', 'card_name', 'last_four_digits'];
        foreach ($required as $field) {
            if (!isset($json[$field])) {
                return null;
            }
        }

        return $json;
    }

    private function extractJSON(string $text): ?array
    {
        // Try to find JSON in the response
        if (preg_match('/\{[^}]+\}/', $text, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        // Try decoding the entire response
        $decoded = json_decode($text, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return null;
    }

    private function buildFinancePrompt(array $data): string
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
}
