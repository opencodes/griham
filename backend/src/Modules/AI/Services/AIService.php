<?php

namespace App\Modules\AI\Services;
use App\Modules\AI\Prompts\AIPrompts;


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

        $prompt = AIPrompts::financeInsights($data);
        return $this->client->generate($prompt, 300);
    }

    public function generateBillReminder(array $bill): ?string
    {
        if (!$this->client->isAvailable()) {
            return null;
        }

        $prompt = AIPrompts::billReminder($bill);
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

        $prompt = AIPrompts::savingsTips($topCategories);
        return $this->client->generate($prompt, 250);
    }

    public function parseSMSToTransaction(string $smsText): ?array
    {
        if (!$this->client->isAvailable()) {
            error_log("Unable to generate text. Hugging Face token not set.");
            return null;
        }

        $prompt = AIPrompts::smsToTransaction($smsText);
        $response = $this->client->generate($prompt, 700);

        if (!$response) {
            error_log("Error getting response");
            return null;
        }

        // Extract JSON from response
        $json = $this->extractJSON($response);
        if (!$json) {
            error_log("Error extracting JSON from response");
            return null;
        }

        // Validate required fields
        $required = ['type', 'amount', 'category', 'description', 'date', 'transaction_status'];
        foreach ($required as $field) {
            if (!array_key_exists($field, $json)) {
                error_log("Error: $field not found in response");
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

        $prompt = AIPrompts::smsToCard($smsText);
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
}