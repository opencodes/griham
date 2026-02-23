<?php

namespace App\Modules\AI\Controllers;

use App\Modules\Finance\Models\Transaction;
use App\Modules\Finance\Models\BankAccount;
use App\Modules\Finance\Models\Bill;
use App\Modules\Finance\Models\Card;
use App\Modules\Family\Models\FamilyMember;
use App\Modules\AI\Services\AIService;
use App\Core\Response;
use Ramsey\Uuid\Uuid;

class AIController
{
    private Transaction $transactionModel;
    private BankAccount $accountModel;
    private Bill $billModel;
    private FamilyMember $memberModel;
    private AIService $aiService;

    public function __construct()
    {
        $this->transactionModel = new Transaction();
        $this->accountModel = new BankAccount();
        $this->billModel = new Bill();
        $this->memberModel = new FamilyMember();
        $this->aiService = new AIService();
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

        if (!isset($data['sms_text'])) {
            Response::error('SMS text is required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $familyId,
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can add transactions', 403);
        }

        // Parse SMS using AI
        $parsed = $this->aiService->parseSMSToTransaction($data['sms_text']);

        if (!$parsed) {
            Response::error('Failed to parse SMS. Please try again or add manually.', 400);
        }

        // Get first account for the family
        $accounts = $this->accountModel->findByFamilyId($familyId);
        if (empty($accounts)) {
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

        $transactionId = $this->transactionModel->createTransaction($transactionData);

        // Update account balance
        $this->accountModel->updateBalance($accounts[0]['id'], $parsed['amount'], $parsed['type']);

        $transaction = $this->transactionModel->findById($transactionId);

        Response::success([
            'transaction' => $transaction,
            'parsed_data' => $parsed
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
}
