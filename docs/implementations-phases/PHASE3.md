# Phase 3 — Frontend UX Improvements

All work delivered on 2026-04-23 as a focused frontend polish pass on top of the Phase 1 and Phase 2 application. Every change targets user experience gaps: missing cursor feedback, silent failures, absent loading states, mobile navigation, and password usability.

---

## Goals

- Make every interactive element feel correct with proper cursor and loading feedback
- Surface meaningful state to users instead of silent failures or blank spinners
- Make the app fully navigable on mobile screens
- Improve password field usability with a visibility toggle

---

## Commits

### `52f765d` — fix: add cursor-pointer to Button component

**Problem:** Buttons were rendering with the browser default `cursor: default` because Tailwind CSS 4's preflight does not add `cursor: pointer` to `<button>` elements. Clicking any button gave no visual affordance.

**Fix:** Added `cursor-pointer` to the base class string in `shared/ui/Button.tsx`. Also added `disabled:cursor-not-allowed` alongside the existing `disabled:pointer-events-none` to explicitly signal non-interactability when a button is disabled.

**Files changed:**
- `frontend/src/shared/ui/Button.tsx`

---

### `efc0396` — feat: show disabled "Already Borrowed" button for books the member already has active

**Problem:** When a member had already borrowed a book (but other copies were still available), the "Borrow" button remained active. Clicking it silently failed with a 422 from the API — no feedback was shown.

**Fix:** `BooksListPage` now calls `useBorrowings()` (already cached by SWR — no extra network request) and derives a `Set<number>` of book IDs with active (unreturned) borrowings. This is passed as `alreadyBorrowed` to `BookCard`.

**Priority order in `BookCard`:**

| Condition | Button shown |
|-----------|-------------|
| `available_copies === 0` | Disabled "Unavailable" |
| Member has active borrowing for this book | Disabled "Already Borrowed" |
| Available and not yet borrowed by this member | Active "Borrow" |

**Files changed:**
- `frontend/src/entities/book/ui/BookCard.tsx` — `alreadyBorrowed?: boolean` prop, button state logic
- `frontend/src/pages/books-list/BooksListPage.tsx` — `useBorrowings()` call, `borrowedBookIds` Set, prop wiring

---

### `976d560` — feat: wire isLoading state to Borrow and Delete buttons in books list

**Problem:** The `Button` component already had a working `isLoading` prop (spinner + disabled state), but the inline `handleBorrow` and `handleDelete` handlers in `BooksListPage` were plain `async` functions with no loading tracking. Users saw no feedback during the API call.

**Fix:** Added `borrowingBookId` and `deletingBookId` state (`useState<number | null>`) to `BooksListPage`. Each handler sets its ID at the start and clears it in a `finally` block, guaranteeing the state resets even on error. `BookCard` receives `isBorrowLoading` and `isDeleteLoading` props and forwards them to the respective `Button`.

Only the card whose action is in-flight enters the loading state — other cards remain interactive.

**Files changed:**
- `frontend/src/pages/books-list/BooksListPage.tsx` — `borrowingBookId`/`deletingBookId` state, `finally` reset, prop wiring
- `frontend/src/entities/book/ui/BookCard.tsx` — `isBorrowLoading?: boolean`, `isDeleteLoading?: boolean` props

---

### `7d262ba` — feat: replace spinners with skeleton screens across all loading states

**Problem:** All data-loading states displayed a centered `<Spinner>` that gave no sense of how much content was coming or what the layout would look like. This caused visible layout shift when real data arrived.

**Fix:** Introduced a `Skeleton` base primitive and four layout-specific skeleton components that mirror the exact shape of the real content.

#### New files

**`shared/ui/Skeleton.tsx`**

Base primitive: `animate-pulse rounded bg-gray-200` block with a `className` prop for sizing. Everything else is composed from this.

**`entities/book/ui/BookCardSkeleton.tsx`**

Mirrors `BookCard` structure inside a `Card`/`CardContent` wrapper:
- Title line (w-3/4)
- Author line (w-1/2)
- Copies badge (rounded-full)
- Genre badge (rounded-full)
- ISBN text line
- Full-width button placeholder

**`entities/borrowing/ui/BorrowingRowSkeleton.tsx`**

Mirrors `BorrowingRow` as a `<tr>` with the same column count:
- Book cell: title + author lines
- Borrowed date, Due date cells
- Status badge placeholder
- Optional actions cell (`hasActions` prop) for the librarian's Return button column

**`features/book-create/ui/BookFormSkeleton.tsx`**

Mirrors the `BookForm` layout:
- 5 label + input pairs (matching Title, Author, Genre, ISBN, Total Copies)
- Two button placeholders (submit + cancel)

#### Pages updated

| Page | Before | After |
|------|--------|-------|
| `BooksListPage` | Centered spinner | 6 `BookCardSkeleton`s in the same 3-column grid |
| `DashboardLibrarianPage` (stats) | Centered spinner | 4 `StatCardSkeleton`s in the same 4-column grid |
| `DashboardLibrarianPage` (table) | Centered spinner replacing entire table | `<thead>` stays visible; 4 `BorrowingRowSkeleton`s fill `<tbody>` |
| `DashboardMemberPage` (stats) | Centered spinner | 2 inline stat card skeletons in the same 2-column grid |
| `DashboardMemberPage` (table) | Centered spinner replacing entire table | `<thead>` stays visible; 3 `BorrowingRowSkeleton`s fill `<tbody>` |
| `BookEditPage` | Full-page centered spinner | Title `h1` skeleton + `BookFormSkeleton` in the same layout |

Keeping `<thead>` visible during load is a deliberate choice: the column headers don't pop in after the data arrives, eliminating a visible layout shift in the dashboard tables.

---

### `eaff274` — feat: add bottom navigation bar for mobile screens

**Problem:** The header nav had `hidden md:flex`, making all navigation links invisible on screens below `md` (768 px). Mobile users had no way to move between Books and Dashboard.

**Fix:** Created `pages/layout/BottomNav.tsx` — a `fixed bottom-0 left-0 right-0 md:hidden` bar with three items using Lucide React icons:

| Item | Icon | Target |
|------|------|--------|
| Books | `BookOpen` | `/books` |
| Dashboard | `LayoutDashboard` | `/dashboard/librarian` or `/dashboard/member` (role-derived) |
| Sign Out | `LogOut` | Calls the same logout logic as `LogoutButton` |

`NavLink` is used for Books and Dashboard — it automatically applies `text-blue-600` on the active route. The logout item is a plain `<button>` styled identically to the nav links.

`<main>` in `Layout.tsx` received `pb-20 md:pb-6` so page content is never hidden behind the fixed bar on mobile.

The desktop header nav is untouched — `BottomNav` is purely additive and only visible on mobile.

**Files changed:**
- `frontend/src/pages/layout/BottomNav.tsx` — new component
- `frontend/src/pages/layout/Layout.tsx` — import, `<BottomNav />`, padding adjustment

---

### `9383173` — feat: add password visibility toggle to Input component

**Problem:** Password fields had no way to reveal what had been typed, making it easy to make undetected mistakes — especially on mobile where autocorrect can interfere.

**Fix:** The `Input` component now self-manages a password toggle when `type="password"` is passed. No changes were needed in `LoginForm` or `RegisterForm`.

**Implementation details:**

- `type` is destructured from `props` before the spread so the actual `<input type>` is controlled locally
- `showPassword` state (`useState<boolean>`) toggles between `"text"` and `"password"`
- A `<button type="button">` (prevents form submission) is absolutely positioned inside a relative wrapper, aligned to the right edge with `pr-3`
- `pr-10` is added to the `<input>` so typed text never overlaps the icon
- Icon switches between `Eye` and `EyeOff` from Lucide React
- `aria-label` alternates between "Show password" / "Hide password" for accessibility
- The `ref` forwarded by `forwardRef` still points to the `<input>` element — the wrapping `<div>` does not interfere

**Files changed:**
- `frontend/src/shared/ui/Input.tsx`

---

## Files Added

| File | Purpose |
|------|---------|
| `frontend/src/shared/ui/Skeleton.tsx` | Base `animate-pulse` skeleton primitive |
| `frontend/src/entities/book/ui/BookCardSkeleton.tsx` | Skeleton matching `BookCard` layout |
| `frontend/src/entities/borrowing/ui/BorrowingRowSkeleton.tsx` | Skeleton matching `BorrowingRow` table row |
| `frontend/src/features/book-create/ui/BookFormSkeleton.tsx` | Skeleton matching `BookForm` field layout |
| `frontend/src/pages/layout/BottomNav.tsx` | Fixed mobile bottom navigation bar |

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/shared/ui/Button.tsx` | Added `cursor-pointer`, `disabled:cursor-not-allowed` |
| `frontend/src/shared/ui/Input.tsx` | Password visibility toggle with Eye/EyeOff |
| `frontend/src/entities/book/ui/BookCard.tsx` | `alreadyBorrowed`, `isBorrowLoading`, `isDeleteLoading` props |
| `frontend/src/pages/books-list/BooksListPage.tsx` | Borrowed book IDs, in-flight tracking, skeleton, props |
| `frontend/src/pages/book-edit/BookEditPage.tsx` | Spinner → `BookFormSkeleton` |
| `frontend/src/pages/dashboard-librarian/DashboardLibrarianPage.tsx` | Spinners → stat + row skeletons |
| `frontend/src/pages/dashboard-member/DashboardMemberPage.tsx` | Spinners → stat + row skeletons |
| `frontend/src/pages/layout/Layout.tsx` | Added `<BottomNav />`, bottom padding |
