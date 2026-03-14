<?php

namespace App\Modules\AI\Controllers;

use App\Core\Database;
use App\Modules\Finance\Models\Transaction;
use App\Modules\Finance\Models\BankAccount;
use App\Modules\Finance\Models\Bill;
use App\Modules\Finance\Models\Card;
use App\Modules\Family\Models\FamilyMember;
use App\Modules\AI\Models\SmsIngestionLog;
use App\Modules\AI\Services\AIService;
use App\Modules\RBAC\Services\RBACService;
use App\Core\Response;

class AIController
{
    private Transaction $transactionModel;
    private BankAccount $accountModel;
    private Bill $billModel;
    private FamilyMember $memberModel;
    private AIService $aiService;
    private SmsIngestionLog $smsIngestionLogModel;
    private RBACService $rbacService;

    public function __construct()
    {
        $this->transactionModel = new Transaction();
        $this->accountModel = new BankAccount();
        $this->billModel = new Bill();
        $this->memberModel = new FamilyMember();
        $this->aiService = new AIService();
        $this->smsIngestionLogModel = new SmsIngestionLog();
        $this->rbacService = new RBACService();
    }

    public function getFinanceInsights($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        // Gather financial data
        $accounts = $this->accountModel->findByFamilyId($familyId);
        $totalBalance = array_sum(array_column($accounts, 'balance'));

        $month = date('Y-m');
        $summary = $this->transactionModel->getMonthlySummary($familyId, $month);

        $upcomingBills = $this->billModel->findUpcoming($familyId);

        $savingsRate = $summary['total_income'] > 0
            ? (($summary['total_income'] - $summary['total_expense']) / $summary['total_income']) * 100
            : 0;

        $data = [
            'total_balance' => $totalBalance,
            'total_income' => $summary['total_income'],
            'total_expense' => $summary['total_expense'],
            'savings_rate' => round($savingsRate, 2),
            'upcoming_bills' => count($upcomingBills)
        ];

        $insights = $this->aiService->generateFinanceInsights($data);

        Response::success([
            'data' => $data,
            'insights' => $insights,
            'ai_available' => $insights !== null
        ]);
    }

    public function getSavingsTips($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $month = date('Y-m');
        $transactions = $this->transactionModel->findByFamilyId($familyId, ['month' => $month]);

        $tips = $this->aiService->generateSavingsTips($transactions);

        Response::success([
            'tips' => $tips,
            'ai_available' => $tips !== null
        ]);
    }

    public function parseSMS($currentUser, $familyId): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $smsText = isset($data['sms_text']) ? trim((string) $data['sms_text']) : '';
        if ($smsText === '') {
            Response::error('SMS text is required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $familyId,
            'user_id' => $currentUser->userId
        ]);
        if (!$member) {
            Response::error('Access denied', 403);
        }

        

        $hasFinanceWrite = $this->rbacService->userHasPermission($currentUser->userId, 'finance.transactions', 'write');

        if (!$hasFinanceWrite) {
            Response::error('Only admins can add transactions', 403);
        }

        $sender = isset($data['sender']) ? trim((string) $data['sender']) : null;
        $smsDate = isset($data['sms_date']) ? (int) $data['sms_date'] : null;
        $idempotencyKey = $this->buildIdempotencyKey($familyId, $data, $smsText, $sender, $smsDate);
        $smsPreview = substr($smsText, 0, 255);

        $ingestionLogId = $this->smsIngestionLogModel->tryCreateProcessing(
            $familyId,
            $idempotencyKey,
            $currentUser->userId,
            $sender,
            $smsDate,
            $smsPreview
        );

        if ($ingestionLogId === null) {
            $existing = $this->smsIngestionLogModel->findByFamilyAndKey($familyId, $idempotencyKey);
            $existingTransaction = null;
            if ($existing && !empty($existing['transaction_id'])) {
                $existingTransaction = $this->transactionModel->findById($existing['transaction_id']);
            }

            Response::success([
                'transaction' => $existingTransaction,
                'idempotency_key' => $idempotencyKey,
                'status' => 'duplicate'
            ], 'SMS already processed', 200);
        }

        // Parse SMS using AI
        $parsed = $this->aiService->parseSMSToTransaction($smsText);

        if (!$parsed) {
            $this->smsIngestionLogModel->deleteById($ingestionLogId);
            Response::error('Failed to parse SMS. Please try again or add manually.', 400);
        }

        // Get first account for the family
        $accounts = $this->accountModel->findByFamilyId($familyId);
        error_log(json_encode($accounts)); // Debug log
        if (empty($accounts)) {
            $this->smsIngestionLogModel->deleteById($ingestionLogId);
            Response::error('No bank account found. Please create an account first.', 400);
        }

        // Create transaction
        $transactionData = [
            'family_id' => $familyId,
            'account_id' => $accounts[0]['id'],
            'type' => $parsed['type'],
            'category' => $parsed['category'],
            'amount' => $parsed['amount'],
            'description' => $parsed['description'],
            'transaction_date' => $parsed['date'],
            'created_by' => $currentUser->userId
        ];


        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            $transactionId = $this->transactionModel->createTransaction($transactionData);

            // Update account balance
            $this->accountModel->updateBalance($accounts[0]['id'], (float) $parsed['amount'], $parsed['type']);

            $this->smsIngestionLogModel->markCreated($ingestionLogId, $transactionId);

            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $this->smsIngestionLogModel->deleteById($ingestionLogId);
            throw $e;
        }

        $transaction = $this->transactionModel->findById($transactionId);

        Response::success([
            'transaction' => $transaction,
            'parsed_data' => $parsed,
            'idempotency_key' => $idempotencyKey,
            'status' => 'created'
        ], 'Transaction created from SMS', 201);
    }

    public function parseSMSCard($currentUser, $familyId): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['sms_text'])) {
            Response::error('SMS text is required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $familyId,
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can add cards', 403);
        }

        $parsed = $this->aiService->parseSMSToCard($data['sms_text']);

        if (!$parsed) {
            Response::error('Failed to parse SMS. Please check the format.', 400);
        }

        Response::success($parsed, 'Card details extracted successfully');
    }

    private function buildIdempotencyKey(
        string $familyId,
        array $data,
        string $smsText,
        ?string $sender,
        ?int $smsDate
    ): string {
        $clientFingerprint = isset($data['fingerprint']) ? trim((string) $data['fingerprint']) : '';
        if ($clientFingerprint !== '') {
            return hash('sha256', $familyId . '|' . $clientFingerprint);
        }

        $normalizedSender = strtoupper(preg_replace('/[^A-Z0-9]/', '', $sender ?? ''));
        $normalizedBody = strtolower(trim(preg_replace('/\s+/', ' ', $smsText)));
        $normalizedDate = (string) ($smsDate ?? 0);
        $fingerprint = $normalizedSender . '|' . $normalizedDate . '|' . $normalizedBody;

        return hash('sha256', $familyId . '|' . $fingerprint);
    }
}
