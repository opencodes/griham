<?php

namespace App\Modules\User\Controllers;

use App\Core\Response;
use App\Modules\User\Models\User;

class UserController
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    public function listUsers($currentUser): void
    {
        $requester = $this->userModel->findById($currentUser->userId);
        if (!$requester || ($requester['role'] ?? '') !== 'root') {
            Response::error('Forbidden', 403);
        }

        $users = $this->userModel->findAll();
        foreach ($users as &$user) {
            unset($user['password']);
        }

        Response::success($users);
    }
}
