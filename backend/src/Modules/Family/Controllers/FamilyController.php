<?php

namespace App\Modules\Family\Controllers;

use App\Modules\Family\Models\Family;
use App\Modules\Family\Models\FamilyMember;
use App\Modules\User\Models\User;
use App\Core\Response;

class FamilyController
{
    private Family $familyModel;
    private FamilyMember $memberModel;

    public function __construct()
    {
        $this->familyModel = new Family();
        $this->memberModel = new FamilyMember();
    }

    public function create($currentUser): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['name'])) {
            Response::error('Family name is required', 400);
        }

        // Check if user already has a family
        $existingFamily = $this->familyModel->findByUserId($currentUser->userId);
        if (!empty($existingFamily)) {
            Response::error('You can only create one family', 400);
        }

        $familyId = $this->familyModel->createFamily([
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'created_by' => $currentUser->userId
        ]);

        $this->memberModel->addMember([
            'family_id' => $familyId,
            'user_id' => $currentUser->userId,
            'role' => 'admin'
        ]);

        $family = $this->familyModel->findById($familyId);
        Response::success($family, 'Family created successfully', 201);
    }

    public function list($currentUser): void
    {
        $families = $this->familyModel->findByUserId($currentUser->userId);
        Response::success($families);
    }

    public function get($currentUser, $id): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $id)) {
            Response::error('Access denied', 403);
        }

        $family = $this->familyModel->findById($id);
        if (!$family) {
            Response::error('Family not found', 404);
        }

        $members = $this->memberModel->findByFamilyId($id);
        $family['members'] = $members;

        Response::success($family);
    }

    public function update($currentUser, $id): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $member = $this->memberModel->findOne([
            'family_id' => $id,
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can update family', 403);
        }

        $this->familyModel->update($id, ['address' => $data['address'] ?? null]);
        $family = $this->familyModel->findById($id);
        Response::success($family, 'Family updated successfully');
    }

    public function listMembers($currentUser, $familyId): void
    {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $members = $this->memberModel->findByFamilyId($familyId);
        Response::success($members);
    }

    public function addMember($currentUser, $familyId): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['email']) || !isset($data['fname']) || !isset($data['lname']) || !isset($data['phone']) || !isset($data['relation'])) {
            Response::error('Email, first name, last name, phone and relation are required', 400);
        }

        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        // Create user with password Test12345#
        $userModel = new User();
        $userId = $userModel->createUser([
            'email' => $data['email'],
            'password' => password_hash('Test12345#', PASSWORD_BCRYPT),
            'full_name' => $data['fname'] . ' ' . $data['lname'],
            'phone' => '+91' . $data['phone']
        ]);

        // Add as family member
        $memberId = $this->memberModel->addMember([
            'family_id' => $familyId,
            'user_id' => $userId,
            'role' => 'viewer',
            'relation' => $data['relation'],
            'status' => 'active'
        ]);

        $member = $this->memberModel->findById($memberId);
        Response::success($member, 'Member added successfully', 201);
    }

    public function updateMember($currentUser, $familyId, $memberId): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $adminMember = $this->memberModel->findOne([
            'family_id' => $familyId,
            'user_id' => $currentUser->userId
        ]);

        if (!$adminMember || $adminMember['role'] !== 'admin') {
            Response::error('Only admins can update members', 403);
        }

        $member = $this->memberModel->findById($memberId);
        if (!$member || $member['family_id'] !== $familyId) {
            Response::error('Member not found', 404);
        }

        if ($member['role'] === 'admin') {
            Response::error('Cannot edit admin members', 403);
        }

        $updateData = [];
        if (isset($data['relation'])) {
            $updateData['relation'] = $data['relation'];
        }

        if (!empty($updateData)) {
            $this->memberModel->update($memberId, $updateData);
        }

        if (isset($data['fname']) || isset($data['lname']) || isset($data['email']) || isset($data['phone'])) {
            $userModel = new User();
            $userData = [];
            if (isset($data['fname']) || isset($data['lname'])) {
                $userData['full_name'] = trim(($data['fname'] ?? '') . ' ' . ($data['lname'] ?? ''));
            }
            if (isset($data['email'])) {
                $userData['email'] = $data['email'];
            }
            if (isset($data['phone'])) {
                $userData['phone'] = '+91' . $data['phone'];
            }
            if (!empty($userData) && $member['user_id']) {
                $userModel->update($member['user_id'], $userData);
            }
        }

        $updated = $this->memberModel->findById($memberId);
        Response::success($updated, 'Member updated successfully');
    }
}
