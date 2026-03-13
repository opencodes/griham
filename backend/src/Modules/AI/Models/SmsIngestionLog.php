<?php

namespace App\Modules\AI\Models;

use App\Core\Model;
use App\Core\TableNames;
use PDOException;

class SmsIngestionLog extends Model
{
    protected string $table = TableNames::SMS_INGESTION_LOGS;

    public function findByFamilyAndKey(string $familyId, string $idempotencyKey): ?array
    {
        return $this->findOne([
            'family_id' => $familyId,
            'idempotency_key' => $idempotencyKey
        ]);
    }

    public function tryCreateProcessing(
        string $familyId,
        string $idempotencyKey,
        string $createdBy,
        ?string $sender,
        ?int $smsDate,
        string $smsPreview
    ): ?string {
        $id = $this->generateUUID();

        $sql = "INSERT INTO {$this->table}
                (id, family_id, idempotency_key, sender, sms_date, sms_preview, status, created_by, created_at, updated_at)
                VALUES
                (:id, :family_id, :idempotency_key, :sender, :sms_date, :sms_preview, 'processing', :created_by, :created_at, :updated_at)";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':family_id' => $familyId,
                ':idempotency_key' => $idempotencyKey,
                ':sender' => $sender,
                ':sms_date' => $smsDate,
                ':sms_preview' => $smsPreview,
                ':created_by' => $createdBy,
                ':created_at' => date('Y-m-d H:i:s'),
                ':updated_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (PDOException $e) {
            if ($this->isDuplicateKeyError($e)) {
                return null;
            }
            throw $e;
        }

        return $id;
    }

    public function markCreated(string $id, string $transactionId): bool
    {
        return $this->update($id, [
            'transaction_id' => $transactionId,
            'status' => 'created',
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function deleteById(string $id): bool
    {
        return $this->delete($id);
    }

    private function isDuplicateKeyError(PDOException $e): bool
    {
        if ($e->getCode() === '23000') {
            return true;
        }

        $errorInfo = $e->errorInfo ?? null;
        if (is_array($errorInfo) && isset($errorInfo[1])) {
            return (int)$errorInfo[1] === 1062;
        }

        return false;
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }
}
