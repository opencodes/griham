<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Models\Bill;
use App\Modules\Family\Models\FamilyMember;
use App\Core\Response;

class BillController
{
    private Bill $billModel;
    private FamilyMember $memberModel;

    public function __construct()
    {
        $this->billModel = new Bill();
        $this->memberModel = new FamilyMember();
    }

    public function create($currentUser): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['family_id']) || !isset($data['bill_name']) || 
            !isset($data['category']) || !isset($data['amount']) || !isset($data['due_date'])) {
            Response::error('All fields are required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $data['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can create bills', 403);
        }

        $billId = $this->billModel->createBill($data);
        $bill = $this->billModel->findById($billId);
        Response::success($bill, 'Bill created successfully', 201);
    }

    public function list($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $bills = $this->billModel->findByFamilyId($familyId);
        Response::success($bills);
    }

    public function upcoming($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $bills = $this->billModel->findUpcoming($familyId);
        Response::success($bills);
    }

    public function update($currentUser, $id): void
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $bill = $this->billModel->findById($id);

        if (!$bill) {
            Response::error('Bill not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $bill['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can update bills', 403);
        }

        $this->billModel->update($id, $data);
        $updated = $this->billModel->findById($id);
        Response::success($updated, 'Bill updated successfully');
    }

    public function delete($currentUser, $id): void
    {
        $bill = $this->billModel->findById($id);

        if (!$bill) {
            Response::error('Bill not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $bill['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can delete bills', 403);
        }

        $this->billModel->delete($id);
        Response::success(null, 'Bill deleted successfully');
    }
}
