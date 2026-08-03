# Mobile Responsive Dashboard Plan

## Goal
Make the casino admin dashboard usable on mobile viewports (320px–768px) without breaking existing desktop experience.

## Current State
- Custom sidebar hidden on mobile with no alternative navigation
- Fixed `p-8` padding everywhere
- Tables overflow horizontally on small screens
- Conversations page uses split view (`w-1/3` list + detail) with no mobile fallback
- shadcn `Sidebar` component exists but is unused

## Implementation Steps

### 1. Fixed Screenshot/Image Viewer (deposits.tsx)
- Change screenshot link to show preview image on hover/tap instead of redirecting
- Add inline image preview with error fallback to link
- Image is clickable to open full size in new tab

### 2. Layout (`components/layout.tsx`)
- Wrap app in `SidebarProvider` from `@/components/ui/sidebar`
- Replace custom `<aside>` with shadcn `Sidebar` + `SidebarContent` + nav items
- Add `SidebarTrigger` (hamburger) visible only on mobile
- Change main padding: `p-4 md:p-8`
- Make header responsive: stack title and user info vertically on small screens

### 3. Table Responsiveness
Pages using `Table` need responsive wrappers or card fallbacks:
- `games.tsx`
- `deposits.tsx`
- `redeems.tsx`
- `game-accounts.tsx`
- `free-play.tsx`
- `payment-methods.tsx`
- `bonuses.tsx`
- `faqs.tsx`

Each table should either:
- Use `overflow-x-auto` wrapper, OR
- Switch to card layout on mobile (`grid gap-4`)

Conversations list already uses cards; keep as-is but ensure horizontal scroll for filter tabs.

### 4. Conversations Page (`pages/conversations.tsx`)
- On mobile, show list OR detail, not both side-by-side
- Add a back button in detail view when on mobile
- Use `useIsMobile()` to toggle between list and detail panels

### 5. Dialogs & Forms
- Ensure dialogs use `max-w-[95vw]` on mobile
- Stack form fields vertically (already mostly done)
- Verify buttons have min 44px touch target

### 6. Dashboard Stats (`pages/dashboard.tsx`)
- Already uses responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- Verify no horizontal overflow in stat cards

## Validation
- Test at 375px, 768px, 1024px widths
- Verify sidebar opens/closes on mobile
- Check tables scroll or convert to cards
- Ensure all interactive elements are tappable
- Confirm desktop layout is unchanged

## Out of Scope
- Changing colors, branding, or adding new features
- Backend or API changes
- New pages or routes
