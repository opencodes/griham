<?php

namespace App\Modules\RBAC\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\TableNames;
use App\Modules\User\Models\User;
use App\Modules\RBAC\Models\Role;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Group;

class RBACController
{
    private User $userModel;
    private Role $roleModel;
    private Permission $permissionModel;
    private Group $groupModel;

    public function __construct()
    {
        $this->userModel = new User();
        $this->roleModel = new Role();
        $this->permissionModel = new Permission();
        $this->groupModel = new Group();
    }

    private function requireRoot($currentUser): void
    {
        $requester = $this->userModel->findById($currentUser->userId);
        if (!$requester || ($requester['role'] ?? '') !== 'root') {
            Response::error('Forbidden', 403);
        }
    }

    // ---- Roles ----
    public function listRoles($currentUser): void
    {
        $this->requireRoot($currentUser);
        $roles = $this->roleModel->findAll();
        Response::success($roles);
    }

    public function getRole($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $role = $this->roleModel->findById($id);
        if (!$role) {
            Response::error('Role not found', 404);
        }
        $role['permissions'] = $this->roleModel->getPermissions($id);
        $role['user_ids'] = $this->roleModel->getUserIds($id);
        Response::success($role);
    }

    public function createRole($currentUser): void
    {
        $this->requireRoot($currentUser);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            Response::error('Role name is required', 400);
        }
        $description = isset($data['description']) ? trim((string) $data['description']) : null;
        $id = $this->roleModel->createRole(['name' => $name, 'description' => $description]);
        $role = $this->roleModel->findById($id);
        Response::success($role, 'Role created', 201);
    }

    public function updateRole($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $role = $this->roleModel->findById($id);
        if (!$role) {
            Response::error('Role not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $updates = [];
        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                Response::error('Role name cannot be empty', 400);
            }
            $updates['name'] = $name;
        }
        if (array_key_exists('description', $data)) {
            $updates['description'] = trim((string) $data['description']);
        }
        if (!empty($updates)) {
            $this->roleModel->update($id, $updates);
        }
        Response::success($this->roleModel->findById($id));
    }

    public function deleteRole($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $role = $this->roleModel->findById($id);
        if (!$role) {
            Response::error('Role not found', 404);
        }
        $this->roleModel->delete($id);
        Response::success(null, 'Role deleted');
    }

    public function setRolePermissions($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $role = $this->roleModel->findById($id);
        if (!$role) {
            Response::error('Role not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $permissionIds = isset($data['permission_ids']) && is_array($data['permission_ids'])
            ? array_values($data['permission_ids'])
            : [];
        $this->roleModel->setPermissions($id, $permissionIds);
        Response::success(['permission_ids' => $permissionIds]);
    }

    // ---- Permissions ----
    public function listPermissions($currentUser): void
    {
        $this->requireRoot($currentUser);
        $permissions = $this->permissionModel->findAll();
        Response::success($permissions);
    }

    public function getPermission($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $permission = $this->permissionModel->findById($id);
        if (!$permission) {
            Response::error('Permission not found', 404);
        }
        $permission['role_ids'] = $this->permissionModel->getRoleIds($id);
        Response::success($permission);
    }

    public function createPermission($currentUser): void
    {
        $this->requireRoot($currentUser);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim((string) ($data['name'] ?? ''));
        $resource = trim((string) ($data['resource'] ?? ''));
        $action = trim((string) ($data['action'] ?? ''));
        if ($name === '' || $resource === '' || $action === '') {
            Response::error('name, resource, and action are required', 400);
        }
        $description = isset($data['description']) ? trim((string) $data['description']) : null;
        $id = $this->permissionModel->createPermission([
            'name' => $name,
            'resource' => $resource,
            'action' => $action,
            'description' => $description,
        ]);
        Response::success($this->permissionModel->findById($id), 'Permission created', 201);
    }

    public function updatePermission($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $permission = $this->permissionModel->findById($id);
        if (!$permission) {
            Response::error('Permission not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $updates = [];
        foreach (['name', 'resource', 'action', 'description'] as $field) {
            if (array_key_exists($field, $data)) {
                $updates[$field] = trim((string) $data[$field]);
            }
        }
        if (isset($updates['name']) && $updates['name'] === '') {
            Response::error('Permission name cannot be empty', 400);
        }
        if (isset($updates['resource']) && $updates['resource'] === '') {
            Response::error('Resource cannot be empty', 400);
        }
        if (isset($updates['action']) && $updates['action'] === '') {
            Response::error('Action cannot be empty', 400);
        }
        if (!empty($updates)) {
            $this->permissionModel->update($id, $updates);
        }
        Response::success($this->permissionModel->findById($id));
    }

    public function deletePermission($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $permission = $this->permissionModel->findById($id);
        if (!$permission) {
            Response::error('Permission not found', 404);
        }
        $this->permissionModel->delete($id);
        Response::success(null, 'Permission deleted');
    }

    // ---- Groups ----
    public function listGroups($currentUser): void
    {
        $this->requireRoot($currentUser);
        $groups = $this->groupModel->findAll();
        Response::success($groups);
    }

    public function getGroup($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $group = $this->groupModel->findById($id);
        if (!$group) {
            Response::error('Group not found', 404);
        }
        $group['user_ids'] = $this->groupModel->getMemberIds($id);
        $group['role_ids'] = $this->groupModel->getRoleIds($id);
        Response::success($group);
    }

    public function createGroup($currentUser): void
    {
        $this->requireRoot($currentUser);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            Response::error('Group name is required', 400);
        }
        $description = isset($data['description']) ? trim((string) $data['description']) : null;
        $id = $this->groupModel->createGroup(['name' => $name, 'description' => $description]);
        Response::success($this->groupModel->findById($id), 'Group created', 201);
    }

    public function updateGroup($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $group = $this->groupModel->findById($id);
        if (!$group) {
            Response::error('Group not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $updates = [];
        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                Response::error('Group name cannot be empty', 400);
            }
            $updates['name'] = $name;
        }
        if (array_key_exists('description', $data)) {
            $updates['description'] = trim((string) $data['description']);
        }
        if (!empty($updates)) {
            $this->groupModel->update($id, $updates);
        }
        Response::success($this->groupModel->findById($id));
    }

    public function deleteGroup($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $group = $this->groupModel->findById($id);
        if (!$group) {
            Response::error('Group not found', 404);
        }
        $this->groupModel->delete($id);
        Response::success(null, 'Group deleted');
    }

    public function setGroupMembers($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $group = $this->groupModel->findById($id);
        if (!$group) {
            Response::error('Group not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $userIds = isset($data['user_ids']) && is_array($data['user_ids']) ? array_values($data['user_ids']) : [];
        $this->groupModel->setMembers($id, $userIds);
        Response::success(['user_ids' => $userIds]);
    }

    public function setGroupRoles($currentUser, string $id): void
    {
        $this->requireRoot($currentUser);
        $group = $this->groupModel->findById($id);
        if (!$group) {
            Response::error('Group not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $roleIds = isset($data['role_ids']) && is_array($data['role_ids']) ? array_values($data['role_ids']) : [];
        $this->groupModel->setRoles($id, $roleIds);
        Response::success(['role_ids' => $roleIds]);
    }

    // ---- User role assignment ----
    public function getUserRoles($currentUser, string $userId): void
    {
        $this->requireRoot($currentUser);
        $user = $this->userModel->findById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $db = Database::getConnection();
        $stmt = $db->prepare(
            "SELECT r.id, r.name, r.description FROM " . TableNames::RBAC_ROLES . " r INNER JOIN " . TableNames::RBAC_USER_ROLES . " ur ON r.id = ur.role_id WHERE ur.user_id = :user_id"
        );
        $stmt->execute([':user_id' => $userId]);
        $roles = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        Response::success($roles);
    }

    public function setUserRoles($currentUser, string $userId): void
    {
        $this->requireRoot($currentUser);
        $user = $this->userModel->findById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $roleIds = isset($data['role_ids']) && is_array($data['role_ids']) ? array_values($data['role_ids']) : [];
        if (count($roleIds) > 1) {
            Response::error('Only one role can be assigned to a user', 400);
        }
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM " . TableNames::RBAC_USER_ROLES . " WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $userId]);
        foreach ($roleIds as $rid) {
            $stmt = $db->prepare("INSERT INTO " . TableNames::RBAC_USER_ROLES . " (user_id, role_id) VALUES (:user_id, :role_id)");
            $stmt->execute([':user_id' => $userId, ':role_id' => $rid]);
        }
        Response::success(['role_ids' => $roleIds]);
    }
}
