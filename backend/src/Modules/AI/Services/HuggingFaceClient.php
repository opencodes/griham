<?php

namespace App\Modules\AI\Services;

class HuggingFaceClient
{
    private const ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
    private const INFERENCE_URL = 'https://api-inference.huggingface.co/models/%s';

    private ?string $token;
    private string $model;

    public function __construct(?string $token = null, string $model = 'mistralai/Mistral-7B-Instruct-v0.2')
    {
        $this->token = $token ?? ($_ENV['HF_TOKEN'] ?? null);
        $this->model = $_ENV['HF_MODEL'] ?? $model;
    }

    public function isAvailable(): bool
    {
        return !empty($this->token);
    }

    public function generate(string $prompt, int $maxTokens = 400): ?string
    {
        if (!$this->isAvailable()) {
            error_log("Unable to generate text. Hugging Face token not set.");
            return null;
        }

        $text = $this->chatCompletions($prompt, $maxTokens);
        if ($text !== null) {
            error_log("Chat Completions Error");
            return $text;
        }


        return $this->textGeneration($prompt, $maxTokens);
    }

    private function chatCompletions(string $prompt, int $maxTokens): ?string
    {
        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.1,
            'top_p' => 0.9,
            'max_tokens' => $maxTokens,
        ];

        $ch = curl_init(self::ROUTER_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->token,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);

        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($code !== 200 || $body === false) {
            return null;
        }

        $data = json_decode($body, true);
        $content = $data['choices'][0]['message']['content'] ?? null;

        return $content !== null ? trim($content) : null;
    }

    private function textGeneration(string $prompt, int $maxTokens): ?string
    {
        $url = sprintf(self::ROUTER_URL, $this->model);
        $payload = [
            'inputs' => $prompt,
            'parameters' => [
                'max_new_tokens' => $maxTokens,
                'return_full_text' => false,
            ],
        ];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->token,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);

        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($code !== 200 || $body === false) {
            error_log("Text Generation Error");
            return null;
        }

        $data = json_decode($body, true);
        if (is_array($data) && isset($data[0]['generated_text'])) {
            return trim($data[0]['generated_text']);
        }
        if (isset($data['generated_text'])) {
            return trim($data['generated_text']);
        }

        return null;
    }
}
