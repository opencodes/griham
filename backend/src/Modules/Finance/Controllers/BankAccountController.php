<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Models\BankAccount;
use App\Modules\Family\Models\FamilyMember;
use App\Core\Response;

class BankAccountController
{
    private BankAccount $accountModel;
    private FamilyMember $memberModel;

    public function __construct()
    {
        $this->accountModel = new BankAccount();
        $this->memberModel = new FamilyMember();
    }

    public function create($currentUser): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['family_id']) || !isset($data['account_name']) || !isset($data['bank_name'])) {
            Response::error('Family ID, account name and bank name are required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $data['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can create accounts', 403);
        }

        $accountId = $this->accountModel->createAccount($data);
        $account = $this->accountModel->findById($accountId);
        Response::success($account, 'Account created successfully', 201);
    }

    public function list($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $accounts = $this->accountModel->findByFamilyId($familyId);
        Response::success($accounts);
    }

    public function update($currentUser, $id): void
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $account = $this->accountModel->findById($id);

        if (!$account) {
            Response::error('Account not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $account['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can update accounts', 403);
        }

        $this->accountModel->update($id, $data);
        $updated = $this->accountModel->findById($id);
        Response::success($updated, 'Account updated successfully');
    }

    public function delete($currentUser, $id): void
    {
        $account = $this->accountModel->findById($id);

        if (!$account) {
            Response::error('Account not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $account['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can delete accounts', 403);
        }

        $this->accountModel->delete($id);
        Response::success(null, 'Account deleted successfully');
    }
}
