 

---

## 🧠 ROLE

You are a senior FAANG-level Staff Engineer and Design Systems Architect.

Your task is to build a **production-ready SaaS web application UI foundation** with scalable architecture, design system, responsive layout, and clean component structure.

Do NOT generate a demo app.
Generate a scalable enterprise-grade UI structure.

---

# 🎯 PRODUCT TYPE

AI-powered SaaS platform with:

* Dashboard
* AI Chat Assistant
* Activity Tracking
* Settings & Profile
* Billing & Integrations
* Authentication
* Mobile responsive support

---

# 🧱 TECH STACK

Use:

* React (latest stable)
* TypeScript
* Tailwind CSS
* ShadCN or Headless UI patterns
* Zustand or Redux Toolkit (lightweight state management)
* React Router (or Next.js App Router if fullstack)
* Modular folder architecture
* Clean component separation

If backend is needed, mock API services cleanly with async patterns.

---

# 🎨 DESIGN SYSTEM REQUIREMENTS

## 🎨 Colors

Primary: Indigo (#4F46E5)
Success: #10B981
Warning: #F59E0B
Error: #EF4444
Neutral grayscale system

Use semantic tokens (not hardcoded colors).

---

## 📏 Spacing System

Use 8px grid.
Only use spacing multiples of 4 or 8.

---

## ✍ Typography

Inter font
Clear hierarchy:

* H1
* H2
* H3
* Body
* Small
* Caption

---

## 🧩 COMPONENT LIBRARY STRUCTURE

Follow Atomic Design:

/components
/atoms
/molecules
/organisms
/layouts

All components must support:

* Default
* Hover
* Focus
* Active
* Disabled
* Loading (if applicable)

---

# 🏠 SCREENS TO BUILD

---

## 1️⃣ Authentication

* Login
* Signup
* Forgot Password
* Validation states
* Error states
* Loading button state

---

## 2️⃣ Dashboard

Layout:

Sidebar (collapsible)
Top header
Main content

Content:

* KPI Cards (4 grid)
* Primary CTA panel
* Search bar
* Recent Activity Table

Include:

* Loading skeleton
* Empty state
* Error state
* Pagination

---

## 3️⃣ AI Chat Screen

Split layout:

Left:

* Chat history list

Right:

* Conversation window

Features:

* Streaming AI message simulation
* Typing indicator
* Copy message
* Retry button
* File attachment button
* Auto expanding textarea
* Disabled send when empty

---

## 4️⃣ Activity Screen

* Table view (desktop)
* Card view (mobile)
* Filter dropdown
* Status badges
* Sortable columns

---

## 5️⃣ Settings Screen

Sections:

* Profile
* Security
* Integrations
* Billing

Each section:

* Form groups
* Inline validation
* Toggle switches
* Save button with loading state
* Success toast

---

# 📱 RESPONSIVE REQUIREMENTS

Desktop:

* Sidebar navigation

Mobile:

* Bottom tab navigation
* Collapsible sections
* Swipe-friendly UI
* 16px horizontal padding

---

# 🧠 UX REQUIREMENTS

Every action must include:

* Loading state
* Success feedback
* Error feedback

No layout shifting.
No console warnings.
Accessible labels required.
Keyboard navigation must work.

---

# 🎬 MICRO-INTERACTIONS

Buttons:

* Subtle scale on click
* Spinner when loading

Cards:

* Hover elevation

Transitions:

* 200ms fade
* No jarring movement

Toast:

* Auto dismiss
* Pause on hover

---

# 🗂 FILE STRUCTURE

Follow clean scalable structure:

/src
/app or /pages
/components
/hooks
/services
/store
/types
/utils
/constants

Keep code modular and production-ready.

---

# 🧪 EDGE STATES

Every major screen must include:

* Loading
* Empty
* Error
* Disabled
* Success

Design these states explicitly.

---

# 📦 OUTPUT FORMAT

Generate:

1. Folder structure
2. Design system tokens
3. Component definitions
4. Core layouts
5. Sample screens
6. Mock API service layer
7. State management setup
8. Routing setup
9. Clear README explaining structure

Do NOT generate placeholder junk.
Generate clean, readable, scalable code.

---

# 🔐 PERFORMANCE

* Lazy load routes
* Avoid unnecessary re-renders
* Memoize heavy components
* Clean state separation

---

# 🚀 GOAL

The result should feel like:

* Linear.app
* Notion
* Vercel dashboard
* Modern SaaS admin panel

Clean. Professional. Minimal.

---

# 🔥 BONUS (If supported)

Add:

* Dark mode toggle
* Theme switching
* Feature flags structure
* Environment config structure

--- 