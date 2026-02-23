<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Models\Card;
use App\Modules\Family\Models\FamilyMember;
use App\Core\Response;

class CardController {
    private $memberModel;

    public function __construct() {
        $this->memberModel = new FamilyMember();
    }

    public function list($currentUser, $familyId) {
        if (!$this->memberModel->isUserMember($currentUser->userId, $familyId)) {
            Response::error('Access denied', 403);
        }

        $cardModel = new Card();
        $cards = $cardModel->findByFamily($familyId);
        Response::success($cards);
    }

    public function create($currentUser) {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['family_id'])) {
            Response::error('Family ID is required', 400);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $data['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can add cards', 403);
        }

        $required = ['card_type', 'bank_name', 'card_name', 'last_four_digits'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                Response::error("Field $field is required", 400);
            }
        }

        $cardData = [
            'family_id' => $data['family_id'],
            'card_type' => $data['card_type'],
            'bank_name' => $data['bank_name'],
            'card_name' => $data['card_name'],
            'last_four_digits' => $data['last_four_digits'],
            'card_limit' => $data['card_limit'] ?? null,
            'billing_date' => $data['billing_date'] ?? null,
            'status' => $data['status'] ?? 'active'
        ];

        $cardModel = new Card();
        $cardId = $cardModel->createCard($cardData);
        $card = $cardModel->findById($cardId);
        Response::success($card, 'Card added successfully', 201);
    }

    public function update($currentUser, $cardId) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $cardModel = new Card();
        $card = $cardModel->findById($cardId);

        if (!$card) {
            Response::error('Card not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $card['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can update cards', 403);
        }

        $updated = $cardModel->update($cardId, $data);
        Response::success($updated, 'Card updated successfully');
    }

    public function delete($currentUser, $cardId) {
        $cardModel = new Card();
        $card = $cardModel->findById($cardId);

        if (!$card) {
            Response::error('Card not found', 404);
        }

        $member = $this->memberModel->findOne([
            'family_id' => $card['family_id'],
            'user_id' => $currentUser->userId
        ]);

        if (!$member || $member['role'] !== 'admin') {
            Response::error('Only admins can delete cards', 403);
        }

        $cardModel->delete($cardId);
        Response::success(null, 'Card deleted successfully');
    }
}
