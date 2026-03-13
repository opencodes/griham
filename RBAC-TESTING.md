# RBAC Testing Guide

This document describes how to test Role-Based Access Control (RBAC) in Griham: permissions, roles, groups, and user/role assignment. Only users with **system role `root`** can access the RBAC admin UI and APIs.

---

## 1. Prerequisites

### Option A: Test with Mirage (no backend)

- Do **not** set `VITE_API_URL` (or leave it unset) so the frontend uses the in-memory Mirage API.
- Run the frontend: `cd frontend && npm run dev`.
- Mirage seeds three users and sample RBAC data (roles, permissions, group). Any password is accepted (e.g. `password123`).

### Option B: Test with real backend

- Backend running (e.g. `cd backend && php -S localhost:8000 -t public`).
- Database migrated: `cd backend && php database/migrate.php`.
- Frontend points to backend: `VITE_API_URL=http://localhost:8000/api` in `frontend/.env`.
- Use seeded or created users; root user required for RBAC admin (e.g. from `099_insert_data.sql` or register and set `role = 'root'` in DB).

---

## 2. Test Users

### With Mirage

| Email               | Password (any) | System role | Purpose                                      |
|---------------------|----------------|------------|----------------------------------------------|
| root@griham.local   | e.g. password123 | root      | Access RBAC admin (Permissions, Roles, Groups) |
| admin@griham.local | e.g. password123 | admin     | Main app + has RBAC role "Finance Manager"   |
| user@griham.local   | e.g. password123 | user      | Main app + has RBAC role "Viewer"            |

### With real backend

- Use your seeded root user (e.g. from `099_insert_data.sql`: `root@griham.com` / `Root@123456`).
- Create or use an admin and a normal user for testing role assignment.

---

## 3. Test Scenarios

### 3.1 Root access and navigation

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open app, log in as **root** (e.g. root@griham.local / password123). | Redirected to `/root/permissions`. |
| 2 | Check sidebar. | Links: **Permissions**, **Roles**, **Groups** (no Dashboard/Family/Finance). |
| 3 | Click **Roles**, then **Groups**. | Each page loads; no 403. |
| 4 | Log out. | Redirected to `/login` (home). |

### 3.2 Non-root cannot access RBAC admin

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **admin** or **user**. | Redirected to main app (e.g. Dashboard). |
| 2 | Manually open `/root/permissions` or `/root/roles` or `/root/groups`. | Redirected away (e.g. to `/` or login). Root UI is not visible. |
| 3 | (With backend) Call `GET /api/admin/roles` with admin/user token. | `403 Forbidden`. |

### 3.3 Permissions (root only)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **root**. Go to **Permissions**. | List of permissions (empty or seeded). |
| 2 | Click **Add permission**. | Modal opens. |
| 3 | Enter name `test.read`, resource `test`, action `read`, description optional. Save. | New row in table; no error. |
| 4 | Click edit (pencil) on that permission. Change name to `test.read.updated`. Save. | Row shows updated name. |
| 5 | Click **Assign permissions to roles**. Click a role (e.g. "Finance Manager"). | Modal lists all permissions with checkboxes. |
| 6 | Check the new permission, Save. | Role now has that permission (reopen modal to confirm). |
| 7 | Delete the test permission (trash icon). Confirm. | Row removed; role no longer has that permission. |

### 3.4 Roles (root only)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **root**. Go to **Roles**. | List of roles (empty or seeded). |
| 2 | Click **Add role**. Enter name `Test Role`, description optional. Save. | New role in table. |
| 3 | Click **Permissions** for that role. | Modal with permission checkboxes. |
| 4 | Select one or more permissions, Save. | Assignment saved (reopen to verify). |
| 5 | Edit the role (pencil). Change name to `Test Role Updated`. Save. | Name updated in table. |
| 6 | In **Users & role assignment**, find a user. Click **Assign roles**. | Modal with role checkboxes. |
| 7 | Assign "Test Role Updated" to that user, Save. | User has the role (reopen to verify). |
| 8 | Delete "Test Role Updated" (trash). Confirm. | Role removed; user no longer has it. |

### 3.5 Groups (root only)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **root**. Go to **Groups**. | List of groups (empty or seeded). |
| 2 | Click **Add group**. Enter name `Test Group`, description optional. Save. | New group in table. |
| 3 | Click **Members** for that group. | Modal with user checkboxes. |
| 4 | Select one or more users, Save. | Members saved (reopen to verify). |
| 5 | Click **Roles** for that group. | Modal with role checkboxes. |
| 6 | Select one or more roles, Save. | Group roles saved (reopen to verify). |
| 7 | Edit group (pencil). Change name. Save. | Name updated. |
| 8 | Delete the test group. Confirm. | Group removed; members/roles cleared. |

### 3.6 User role assignment (root only)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **root**. Go to **Roles**. | Users table visible. |
| 2 | Find user **admin** or **user**. Click **Assign roles**. | Modal with RBAC roles. |
| 3 | Assign/remove roles, Save. | User’s RBAC roles updated. |
| 4 | Log out, log in as that user. | Main app loads. |
| 5 | (Optional) Call `GET /api/auth/me` with that user’s token. | Response includes `rbac_roles` and `rbac_permissions` arrays. |

### 3.7 Auth/me returns RBAC data

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as **admin** (has RBAC role "Finance Manager"). | — |
| 2 | In browser DevTools or via API client, call `GET /auth/me` with the auth token. | JSON has `data.rbac_roles` (array of role objects) and `data.rbac_permissions` (array of permission objects). |
| 3 | Log in as **user** (has RBAC role "Viewer"). Call `GET /auth/me`. | `rbac_roles` and `rbac_permissions` reflect Viewer’s permissions. |
| 4 | Log in as **root**. Call `GET /auth/me`. | Root may have no RBAC roles in DB; `rbac_roles`/`rbac_permissions` can be empty. Root access is by system role only. |

### 3.8 Logout goes to home

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Log in as any user. | App shows dashboard or root admin. |
| 2 | Click **Logout** in the sidebar. | Redirected to `/login` (home). |
| 3 | Press browser Back. | Does not return to protected page (replace in history). |

---

## 4. Quick checklist (Mirage)

- [ ] Log in as **root@griham.local** → see Permissions / Roles / Groups.
- [ ] Create a permission, assign it to a role, then delete permission.
- [ ] Create a role, assign permissions and a user, then delete role.
- [ ] Create a group, assign members and roles, then delete group.
- [ ] Assign RBAC roles to **admin** and **user**; log in as each and confirm main app; call `/auth/me` and confirm `rbac_roles` / `rbac_permissions`.
- [ ] Log in as **admin** or **user** → cannot open `/root/*`; sidebar shows main app nav only.
- [ ] Logout from any user → land on `/login`.

---

## 5. API reference (root only)

All require `Authorization: Bearer <token>` and the user must have system role **root**.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET    | `/admin/roles` | List roles |
| POST   | `/admin/roles` | Create role |
| GET    | `/admin/roles/:id` | Get role (with permissions, user_ids) |
| PUT    | `/admin/roles/:id` | Update role |
| DELETE | `/admin/roles/:id` | Delete role |
| PUT    | `/admin/roles/:id/permissions` | Set role permissions (body: `{ "permission_ids": ["..."] }`) |
| GET    | `/admin/permissions` | List permissions |
| POST   | `/admin/permissions` | Create permission |
| GET    | `/admin/permissions/:id` | Get permission (with role_ids) |
| PUT    | `/admin/permissions/:id` | Update permission |
| DELETE | `/admin/permissions/:id` | Delete permission |
| GET    | `/admin/groups` | List groups |
| POST   | `/admin/groups` | Create group |
| GET    | `/admin/groups/:id` | Get group (with user_ids, role_ids) |
| PUT    | `/admin/groups/:id` | Update group |
| DELETE | `/admin/groups/:id` | Delete group |
| PUT    | `/admin/groups/:id/members` | Set group members (body: `{ "user_ids": ["..."] }`) |
| PUT    | `/admin/groups/:id/roles` | Set group roles (body: `{ "role_ids": ["..."] }`) |
| GET    | `/admin/users/:id/roles` | Get user’s RBAC roles |
| PUT    | `/admin/users/:id/roles` | Set user’s RBAC roles (body: `{ "role_ids": ["..."] }`) |

---

## 6. Troubleshooting

- **Root sees main app instead of RBAC:** Ensure the user’s `role` in the database (or Mirage seed) is exactly `root`.
- **403 on RBAC APIs:** Caller must be authenticated and have `role === 'root'`. Check token and `/auth/me`.
- **Empty lists:** With Mirage, refresh the page to re-seed; then log in as root and check Permissions/Roles/Groups again.
- **Logout doesn’t go to login:** Ensure the latest `useAuth` logout calls `navigate('/login', { replace: true })` after clearing storage and user.
