<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Models\Transaction;
use App\Modules\Finance\Models\BankAccount;
use App\Modules\Family\Models\FamilyMember;
use App\Modules\RBAC\Services\RBACService;
use App\Core\Response;

class TransactionController
{
    private Transaction $transactionModel;
    private BankAccount $accountModel;
    private FamilyMember $memberModel;
    private RBACService $rbacService;

    public function __construct()
    {
        $this->transactionModel = new Transaction();
        $this->accountModel = new BankAccount();
        $this->memberModel = new FamilyMember();
        $this->rbacService = new RBACService();
    }

    public function create($currentUser): void
    {
        error_log('Creating transaction for user: ' . $currentUser->userId); // Debug log
        $data = json_decode(file_get_contents('php://input'), true);
        error_log('Received data: ' . json_encode($data)); // Debug log
        if (
            !isset($data['family_id']) || !isset($data['account_id']) || !isset($data['type']) ||
            !isset($data['category']) || !isset($data['amount']) || !isset($data['transaction_date'])
        ) {
            Response::error('Required fields are missing', 400);
        }
        error_log('Creating transaction with data: ' . json_encode($data)); // Debug log
        $member = $this->memberModel->findOne([
            'family_id' => $data['family_id'],
            'user_id' => $currentUser->userId
        ]);
        error_log('Member found: ' . json_encode($member)); // Debug log
        if (!$member) {
            error_log('Access denied for user: ' . $currentUser->userId); // Debug log
            Response::error('Access denied', 403);
        }

        $hasFinanceWrite = $this->rbacService->userHasPermission($currentUser->userId, 'finance', 'write');

        if ($member['role'] !== 'admin' && !$hasFinanceWrite) {
            error_log('Access denied for user: ' . $currentUser->userId); // Debug log
            Response::error('Only admins or finance writers can create transactions', 403);
        }

        $data['created_by'] = $currentUser->userId;

        // Prepare data for transaction creation, including new AI fields
        $transactionData = [
            'family_id' => $data['family_id'],
            'account_id' => $data['account_id'],
            'type' => $data['type'],
            'category' => $data['category'],
            'amount' => $data['amount'],
            'description' => $data['description'] ?? null,
            'transaction_date' => $data['transaction_date'],
            'created_by' => $currentUser->userId,
            'currency' => $data['currency'] ?? null,
            'merchant_name' => $data['merchant_name'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'account_last4' => $data['account_last4'] ?? null,
            'is_recurring' => $data['is_recurring'] ?? false,
            'transaction_status' => $data['transaction_status'] ?? null,
            'available_balance' => $data['available_balance'] ?? null,
            'available_limit' => $data['available_limit'] ?? null,
            'confidence_score' => $data['confidence_score'] ?? null,
            'bank_name' => $data['bank_name'] ?? null,
        ];

        $transactionId = $this->transactionModel->createTransaction($transactionData);

        // Update account balance
        $this->accountModel->updateBalance($data['account_id'], $data['amount'], $data['type']);

        $transaction = $this->transactionModel->findById($transactionId);
        Response::success($transaction, 'Transaction created successfully', 201);
    }

    public function list($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $filters = [
            'type' => $_GET['type'] ?? null,
            'category' => $_GET['category'] ?? null,
            'month' => $_GET['month'] ?? null
        ];

        $transactions = $this->transactionModel->findByFamilyId($familyId, $filters);
        Response::success($transactions);
    }

    public function summary($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $month = $_GET['month'] ?? date('Y-m');
        $summary = $this->transactionModel->getMonthlySummary($familyId, $month);
        $summary['balance'] = $summary['total_income'] - $summary['total_expense'];
        Response::success($summary);
    }

    public function delete($currentUser, $id): void
    {
        $transaction = $this->transactionModel->findById($id);

        if (!$transaction) {
            Response::error('Transaction not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $transaction['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can delete transactions', 403);
        }

        // Reverse account balance
        $reverseType = $transaction['type'] === 'income' ? 'expense' : 'income';
        $this->accountModel->updateBalance($transaction['account_id'], $transaction['amount'], $reverseType);

        $this->transactionModel->delete($id);
        Response::success(null, 'Transaction deleted successfully');
    }
}
