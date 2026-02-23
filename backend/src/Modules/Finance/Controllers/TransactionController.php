<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Models\Transaction;
use App\Modules\Finance\Models\BankAccount;
use App\Modules\Family\Models\FamilyMember;
use App\Core\Response;

class TransactionController
{
    private Transaction $transactionModel;
    private BankAccount $accountModel;
    private FamilyMember $memberModel;

    public function __construct()
    {
        $this->transactionModel = new Transaction();
        $this->accountModel = new BankAccount();
        $this->memberModel = new FamilyMember();
    }

    public function create($currentUser): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['family_id']) || !isset($data['account_id']) || !isset($data['type']) || 
            !isset($data['category']) || !isset($data['amount']) || !isset($data['transaction_date'])) {
            Response::error('All fields are required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $data['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can create transactions', 403);
        }

        $data['created_by'] = $currentUser->userId;
        $transactionId = $this->transactionModel->createTransaction($data);

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
