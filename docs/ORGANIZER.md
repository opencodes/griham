# Organizer Module

Task management, notes, shopping lists, and household organization tools.

## Features

### 1. Tasks
- To-do list management
- Task assignment to family members
- Priority levels (low, medium, high)
- Status tracking (pending, in progress, completed)
- Due date reminders
- Task categories

### 2. Notes
- Quick note taking
- Rich text support
- Tag-based organization
- Search functionality
- Shared family notes

### 3. Shopping Lists
- Multiple shopping lists
- Item categorization
- Quantity tracking
- Purchase status
- Shared lists for family

### 4. Reminders
- One-time reminders
- Recurring reminders
- Custom reminder times
- Multi-channel notifications

## Database Schema

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    title VARCHAR(255),
    description TEXT,
    priority VARCHAR(20),
    status VARCHAR(50),
    due_date DATE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    title VARCHAR(255),
    content TEXT,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY,
    household_id UUID REFERENCES households(id),
    name VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_items (
    id UUID PRIMARY KEY,
    list_id UUID REFERENCES shopping_lists(id),
    item_name VARCHAR(255),
    quantity INT,
    is_purchased BOOLEAN DEFAULT false,
    notes TEXT
);
```

## API Endpoints

```
POST   /api/v1/organizer/tasks               - Create task
GET    /api/v1/organizer/tasks               - List tasks
GET    /api/v1/organizer/tasks?status=pending - Filter tasks
PUT    /api/v1/organizer/tasks/{id}          - Update task
DELETE /api/v1/organizer/tasks/{id}          - Delete task

POST   /api/v1/organizer/notes               - Create note
GET    /api/v1/organizer/notes               - List notes
GET    /api/v1/organizer/notes/search        - Search notes
PUT    /api/v1/organizer/notes/{id}          - Update note
DELETE /api/v1/organizer/notes/{id}          - Delete note

POST   /api/v1/organizer/shopping-lists      - Create shopping list
GET    /api/v1/organizer/shopping-lists      - List shopping lists
POST   /api/v1/organizer/shopping-lists/{id}/items - Add item
PUT    /api/v1/organizer/shopping-lists/{id}/items/{itemId} - Update item
```

## Implementation Priority

1. Task management (Week 12)
2. Notes system (Week 12)
3. Shopping lists (Week 13)
4. Reminders (Week 13)
