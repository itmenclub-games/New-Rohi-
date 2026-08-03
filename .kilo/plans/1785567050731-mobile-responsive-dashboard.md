# Mobile Responsive Dashboard Plan

## Goal
Make the casino admin dashboard usable on mobile viewports (320px–768px) without breaking existing desktop experience.

## Current State
- Custom sidebar hidden on mobile with no alternative navigation
- Fixed `p-8` padding everywhere
- Tables overflow horizontally on small screens
- Conversations page uses split view (`w-1/3` list + detail) with no mobile fallback
- shadcn `Sidebar` component exists but is unused

## Changes

### 1. Layout (`components/layout.tsx`)
- Wrap app in `SidebarProvider` from `@/components/ui/sidebar`
- Replace custom `<aside>` with shadcn `Sidebar` + `SidebarContent` + nav items
- Add `SidebarTrigger` (hamburger) visible only on mobile
- Change main padding: `p-4 md:p-8`
- Make header responsive: stack title and user info vertically on small screens

### 2. Table Responsiveness
Pages using `Table` need one of:
- **Overflow wrapper**: wrap table in `div` with `overflow-x-auto` (simpler)
- **Card fallback**: on mobile, render each row as a card with stacked key-value pairs (better UX)

Target pages:
- `games.tsx`
- `deposits.tsx`
- `redeems.tsx`
- `game-accounts.tsx`
- `free-play.tsx`
- `payment-methods.tsx`
- `bonuses.tsx`
- `faqs.tsx`

Conversations list already uses cards; keep as-is but ensure horizontal scroll for filter tabs.

### 3. Conversations Page (`pages/conversations.tsx`)
- On mobile, show list OR detail, not both side-by-side
- Add a back button in detail view when on mobile
- Use `useIsMobile()` to toggle between list and detail panels

### 4. Dialogs & Forms
- Ensure dialogs use `max-w-[95vw]` on mobile
- Stack form fields vertically (already mostly done)
- Verify buttons have min 44px touch target

### 5. Dashboard Stats (`pages/dashboard.tsx`)
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
