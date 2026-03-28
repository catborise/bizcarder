# Frontend Design Overhaul — Bold Premium Direction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the CRM business card app's UI from flat glassmorphism to a Bold Premium aesthetic with gradient accents, stronger visual hierarchy, improved mobile UX, and consistent design tokens.

**Architecture:** CSS-first approach — update design tokens and global styles first, then propagate changes to components. No new dependencies needed; leverage existing Framer Motion for animations. Changes are additive to the existing MUI + custom CSS stack.

**Tech Stack:** React 18, MUI v7, Framer Motion v12, CSS custom properties, i18next

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `frontend/src/index.css` | Design tokens, spacing system, gradient backgrounds, typography scale, nav pill styles, card border-left, hover-reveal actions, focus ring, responsive bottom nav, FAB |
| Modify | `frontend/src/App.jsx` | Nav pill active states, bottom nav for mobile, footer update, page transition wrapper |
| Modify | `frontend/src/components/Dashboard.jsx` | Gradient stat cards, trend indicators, quick actions row, activity feed |
| Modify | `frontend/src/components/Contacts.jsx` | Card border-left color coding, hover-reveal actions, tag chips, last interaction line, empty state |
| Modify | `frontend/src/components/SearchBar.jsx` | Bottom sheet filter on mobile |
| Modify | `frontend/src/components/AddCard.jsx` | Field prioritization with collapsible secondary fields |
| Create | `frontend/src/components/PageTransition.jsx` | Framer Motion page transition wrapper |
| Create | `frontend/src/components/EmptyState.jsx` | Reusable empty state component |
| Create | `frontend/src/components/BottomNav.jsx` | Mobile bottom navigation bar |
| Create | `frontend/src/components/FAB.jsx` | Floating action button for mobile |

---

### Task 1: Design Tokens — Spacing System & Typography Scale

**Files:**
- Modify: `frontend/src/index.css:1-11` (`:root` common structure)
- Modify: `frontend/src/index.css:425-433` (heading styles)

- [ ] **Step 1: Add spacing tokens to `:root`**

In `frontend/src/index.css`, replace lines 1-11:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  /* Spacing System (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Common Structure */
  --border-radius-sm: 6px;
  --border-radius-md: 10px;
  --border-radius-lg: 16px;

  /* Typography */
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 2: Update heading styles with weight hierarchy**

In `frontend/src/index.css`, replace the heading block (lines 425-433):

```css
h1, h2, h3, h4, h5, h6 {
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

h1 { font-size: 2rem; line-height: 1.2; font-weight: 800; }
h2 { font-size: 1.5rem; line-height: 1.2; font-weight: 700; }
h3 { font-size: 1.25rem; line-height: 1.3; font-weight: 600; }
h4 { font-size: 1rem; line-height: 1.4; font-weight: 600; }
```

- [ ] **Step 3: Update contacts header h2 size**

In `frontend/src/index.css`, change the `.contacts-header h2` block (lines 174-179):

```css
.contacts-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}
```

- [ ] **Step 4: Verify the app still renders correctly**

Run: `cd frontend && npm run dev`

Open the app in a browser. Check that headings render smaller and spacing tokens don't break existing layout.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(css): add spacing tokens and typography weight hierarchy"
```

---

### Task 2: Color System — Gradient Backgrounds & Accent Split

**Files:**
- Modify: `frontend/src/index.css:13-73` (dark and light theme variables)
- Modify: `frontend/src/index.css:95-101` (body styles)

- [ ] **Step 1: Add gradient and accent variables to dark theme**

In `frontend/src/index.css`, replace the `[data-theme='dark']` block (lines 13-42):

```css
[data-theme='dark'] {
  --bg-dark: #0f0f1a;
  --bg-dark-end: #1a1a2e;
  --bg-card: #0f172a;
  --bg-input: rgba(15, 23, 42, 0.6);

  --glass-bg: rgba(30, 41, 59, 0.4);
  --glass-bg-hover: rgba(30, 41, 59, 0.6);
  --glass-bg-solid: #1e293b;
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.4), 0 2px 12px -1px rgba(0, 0, 0, 0.2);
  --glass-shadow-hover: 0 10px 40px -4px rgba(0, 0, 0, 0.5);

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-tertiary: #a1a1aa;

  --accent-primary: #3b82f6;
  --accent-primary-rgb: 59, 130, 246;
  --accent-secondary: #6366f1;
  --accent-secondary-rgb: 99, 102, 241;
  --accent-success: #10b981;
  --accent-success-rgb: 16, 185, 129;
  --accent-warning: #f59e0b;
  --accent-warning-rgb: 245, 158, 11;
  --accent-error: #ef4444;
  --accent-error-rgb: 239, 68, 68;
  --accent-primary-transparent: rgba(59, 130, 246, 0.1);
  --accent-secondary-transparent: rgba(99, 102, 241, 0.1);
  --accent-error-transparent: rgba(239, 68, 68, 0.1);

  /* Gradient accents for stat cards */
  --gradient-primary: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.04));
  --gradient-primary-border: rgba(99, 102, 241, 0.15);
  --gradient-blue: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
  --gradient-blue-border: rgba(59, 130, 246, 0.15);
  --gradient-success: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04));
  --gradient-success-border: rgba(16, 185, 129, 0.15);
  --gradient-warning: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
  --gradient-warning-border: rgba(245, 158, 11, 0.15);
  --gradient-error: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.04));
  --gradient-error-border: rgba(239, 68, 68, 0.15);

  color-scheme: dark;
}
```

- [ ] **Step 2: Add matching gradient variables to light theme**

In `frontend/src/index.css`, replace the `[data-theme='light']` block (lines 44-73):

```css
[data-theme='light'] {
  --bg-dark: #f8fafc;
  --bg-dark-end: #f1f5f9;
  --bg-card: #ffffff;
  --bg-input: rgba(255, 255, 255, 0.8);

  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-bg-hover: rgba(255, 255, 255, 0.9);
  --glass-bg-solid: #ffffff;
  --glass-border: rgba(0, 0, 0, 0.1);
  --glass-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.05), 0 2px 12px -1px rgba(0, 0, 0, 0.02);
  --glass-shadow-hover: 0 10px 40px -4px rgba(0, 0, 0, 0.1);

  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;

  --accent-primary: #2563eb;
  --accent-primary-rgb: 37, 99, 235;
  --accent-secondary: #4f46e5;
  --accent-secondary-rgb: 79, 70, 229;
  --accent-success: #059669;
  --accent-success-rgb: 5, 150, 105;
  --accent-warning: #d97706;
  --accent-warning-rgb: 217, 119, 6;
  --accent-error: #dc2626;
  --accent-error-rgb: 220, 38, 38;
  --accent-primary-transparent: rgba(37, 99, 235, 0.1);
  --accent-secondary-transparent: rgba(79, 70, 229, 0.1);
  --accent-error-transparent: rgba(220, 38, 38, 0.1);

  /* Gradient accents for stat cards */
  --gradient-primary: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(79, 70, 229, 0.02));
  --gradient-primary-border: rgba(79, 70, 229, 0.15);
  --gradient-blue: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02));
  --gradient-blue-border: rgba(37, 99, 235, 0.15);
  --gradient-success: linear-gradient(135deg, rgba(5, 150, 105, 0.08), rgba(5, 150, 105, 0.02));
  --gradient-success-border: rgba(5, 150, 105, 0.15);
  --gradient-warning: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(217, 119, 6, 0.02));
  --gradient-warning-border: rgba(217, 119, 6, 0.15);
  --gradient-error: linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(220, 38, 38, 0.02));
  --gradient-error-border: rgba(220, 38, 38, 0.15);

  color-scheme: light;
}
```

- [ ] **Step 3: Update body background to gradient**

In `frontend/src/index.css`, update the `body` block (lines 95-101):

```css
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-dark), var(--bg-dark-end));
  background-attachment: fixed;
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

- [ ] **Step 4: Verify both themes render correctly**

Run dev server, toggle theme, confirm gradient background appears in both dark and light modes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(css): add gradient color system and accent split for bold premium theme"
```

---

### Task 3: Navigation — Active Pill Style & Improved Focus

**Files:**
- Modify: `frontend/src/App.jsx:271-322` (nav link styles)
- Modify: `frontend/src/index.css:396-410` (glass-container reduce backdrop-filter)
- Modify: `frontend/src/index.css:456-462` (focus states)

- [ ] **Step 1: Update nav link active styles in App.jsx**

Find the nav link style objects in `App.jsx` where active routes get styled. Look for the inline styles on nav `<Link>` elements around lines 271-322. For each nav link, update the active state styling from simple color change to pill style.

Find the pattern like:
```jsx
style={{
  color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)',
  ...
}}
```

And update to:
```jsx
style={{
  color: location.pathname === '/' ? '#e0e7ff' : 'var(--text-secondary)',
  background: location.pathname === '/' ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))' : 'transparent',
  border: location.pathname === '/' ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
  borderRadius: '8px',
  padding: '6px 14px',
  fontSize: '0.875rem',
  fontWeight: location.pathname === '/' ? 600 : 400,
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}}
```

Apply the same pattern for `/contacts` and `/my-card` links, adjusting the `location.pathname` check for each.

- [ ] **Step 2: Improve global focus ring**

In `frontend/src/index.css`, find the input focus styles (around line 456-462) and add a global focus-visible rule after the input focus block:

```css
/* Strong focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent-secondary);
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid var(--accent-secondary);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Reduce backdrop-filter on cards and buttons**

In `frontend/src/index.css`, update `.glass-container` (lines 396-410) to use solid background instead of backdrop-filter:

```css
.glass-container {
  background: var(--glass-bg-solid);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--glass-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-container:hover {
  box-shadow: var(--glass-shadow-hover);
  border-color: rgba(var(--accent-secondary-rgb), 0.3);
}
```

Keep `backdrop-filter` only on `nav` (line 116) and modals.

- [ ] **Step 4: Remove backdrop-filter from glass-button and glass-button-square**

In `.glass-button` (line 306-307), remove:
```css
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
```

In `.glass-button-square` (lines 335-336), remove:
```css
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
```

In `.glass-button-small` (lines 385-386), remove:
```css
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
```

- [ ] **Step 5: Verify nav pills display, focus rings work, performance improved**

Run dev server. Check:
- Active nav link shows gradient pill background
- Tab through page elements — focus ring is visible on buttons and inputs
- Scroll performance should feel smoother (fewer backdrop-filter layers)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css frontend/src/App.jsx
git commit -m "feat(nav): add pill-style active links, strong focus ring, reduce backdrop-filter usage"
```

---

### Task 4: Dashboard — Gradient Stat Cards & Quick Actions

**Files:**
- Modify: `frontend/src/components/Dashboard.jsx:317-334` (tile styles), `640-700+` (stats grid)

- [ ] **Step 1: Create gradient stat card styles**

In `Dashboard.jsx`, find the stat card rendering section (around lines 640-700 in the stats grid). Update the stat card inline styles to use gradient backgrounds.

For the "Total cards" stat card:
```jsx
style={{
  background: 'var(--gradient-primary)',
  border: '1px solid var(--gradient-primary-border)',
  borderRadius: '12px',
  padding: '20px',
}}
```

For "This week" stat card:
```jsx
style={{
  background: 'var(--gradient-blue)',
  border: '1px solid var(--gradient-blue-border)',
  borderRadius: '12px',
  padding: '20px',
}}
```

For "Reminders" stat card:
```jsx
style={{
  background: 'var(--gradient-warning)',
  border: '1px solid var(--gradient-warning-border)',
  borderRadius: '12px',
  padding: '20px',
}}
```

For "Follow-ups" stat card:
```jsx
style={{
  background: 'var(--gradient-success)',
  border: '1px solid var(--gradient-success-border)',
  borderRadius: '12px',
  padding: '20px',
}}
```

- [ ] **Step 2: Update stat label styling**

For each stat card's label text, use uppercase small styling with the matching accent color:

```jsx
<div style={{
  color: 'var(--accent-secondary)',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
}}>
  {t('label_text')}
</div>
```

Use `--accent-secondary` for primary, `--accent-primary` for blue, `--accent-warning` for reminders, `--accent-success` for follow-ups.

- [ ] **Step 3: Add Quick Actions row below header**

In `Dashboard.jsx`, after the header section and before the stats grid, add a quick actions row:

```jsx
{isAuthenticated && (
  <div style={{
    display: 'flex',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
    flexWrap: 'wrap',
  }}>
    <button
      onClick={() => navigate('/contacts', { state: { openAddCard: true } })}
      className="glass-button"
      style={{
        background: 'var(--gradient-primary)',
        border: '1px solid var(--gradient-primary-border)',
        color: '#e0e7ff',
        fontWeight: 600,
      }}
    >
      <FaPlus size={14} /> {t('dashboard:quickAddCard', 'Kart Ekle')}
    </button>
    <button
      onClick={() => navigate('/contacts?filter=reminders')}
      className="glass-button"
      style={{
        background: 'var(--gradient-warning)',
        border: '1px solid var(--gradient-warning-border)',
        color: 'var(--accent-warning)',
        fontWeight: 600,
      }}
    >
      <FaBell size={14} /> {t('dashboard:quickReminders', 'Hatirlatmalar')}
    </button>
    <button
      onClick={() => navigate('/contacts?sort=newest')}
      className="glass-button"
      style={{
        background: 'var(--gradient-blue)',
        border: '1px solid var(--gradient-blue-border)',
        color: 'var(--accent-primary)',
        fontWeight: 600,
      }}
    >
      <FaClock size={14} /> {t('dashboard:quickRecent', 'Son Eklenenler')}
    </button>
  </div>
)}
```

Make sure to import `FaPlus`, `FaBell`, `FaClock` from `react-icons/fa` and `useNavigate` from `react-router-dom` if not already imported.

- [ ] **Step 4: Verify dashboard renders with gradient cards and quick actions**

Run dev server. Check:
- Each stat card has a distinct gradient background
- Labels are uppercase with matching accent colors
- Quick action buttons render with correct gradients
- Quick actions navigate to correct routes

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Dashboard.jsx
git commit -m "feat(dashboard): add gradient stat cards and quick actions row"
```

---

### Task 5: Contact Cards — Border Color Coding & Tag Chips

**Files:**
- Modify: `frontend/src/index.css:200-282` (card styles)
- Modify: `frontend/src/components/Contacts.jsx:500+` (card render)

- [ ] **Step 1: Add card border-left and hover glow styles in CSS**

In `frontend/src/index.css`, after the `.card-wrapper` class (line 198), add:

```css
/* Priority border-left coding */
.card-wrapper[data-priority="high"] .glass-container {
  border-left: 3px solid var(--accent-error);
}
.card-wrapper[data-priority="medium"] .glass-container {
  border-left: 3px solid var(--accent-warning);
}
.card-wrapper[data-priority="low"] .glass-container {
  border-left: 3px solid var(--accent-primary);
}

/* Lead status border-left coding */
.card-wrapper[data-lead="Hot"] .glass-container {
  border-left: 3px solid var(--accent-error);
}
.card-wrapper[data-lead="Warm"] .glass-container {
  border-left: 3px solid var(--accent-warning);
}
.card-wrapper[data-lead="Cold"] .glass-container {
  border-left: 3px solid var(--accent-primary);
}
.card-wrapper[data-lead="Following-up"] .glass-container {
  border-left: 3px solid var(--accent-secondary);
}
.card-wrapper[data-lead="Converted"] .glass-container {
  border-left: 3px solid var(--accent-success);
}

/* Card hover glow */
.glass-container:hover {
  box-shadow: var(--glass-shadow-hover), 0 0 0 1px rgba(var(--accent-secondary-rgb), 0.2);
}

/* Tag chips */
.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 4px;
  background: var(--accent-secondary-transparent);
  color: var(--accent-secondary);
  border: 1px solid rgba(var(--accent-secondary-rgb), 0.15);
}

.tag-chip-more {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--text-tertiary);
}
```

- [ ] **Step 2: Add hover-reveal action styles**

In `frontend/src/index.css`, update `.card-actions` (lines 273-282):

```css
.card-actions {
  flex: 0 0 140px;
  width: 140px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 1px solid var(--glass-border);
  padding-left: 12px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-wrapper:hover .card-actions,
.card-wrapper:focus-within .card-actions {
  opacity: 1;
}
```

In the mobile media query (768px), override to always show:
```css
.card-actions {
  opacity: 1 !important;
}
```

- [ ] **Step 3: Update Contacts.jsx card wrapper with data attributes**

In `Contacts.jsx`, find where each card renders inside `.card-wrapper` (around line 500+). Add `data-priority` and `data-lead` attributes to the wrapper div:

```jsx
<div
  className="card-wrapper"
  data-priority={card.priority || ''}
  data-lead={card.leadStatus || ''}
>
```

- [ ] **Step 4: Add tag chips to card info section**

In `Contacts.jsx`, inside the `.card-info` section after the company line, add tag chips:

```jsx
{card.tags && card.tags.length > 0 && (
  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
    {card.tags.slice(0, 3).map(tag => (
      <span key={tag._id || tag} className="tag-chip">
        {tag.name || tag}
      </span>
    ))}
    {card.tags.length > 3 && (
      <span className="tag-chip-more">+{card.tags.length - 3}</span>
    )}
  </div>
)}
```

- [ ] **Step 5: Add last interaction line to card info**

In `Contacts.jsx`, after the tag chips, add:

```jsx
{card.lastInteraction && (
  <div style={{
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }}>
    <FaClock size={10} />
    {t('cards:lastInteraction', 'Son')}: {card.lastInteraction.type} — {new Date(card.lastInteraction.date).toLocaleDateString()}
  </div>
)}
```

- [ ] **Step 6: Verify card improvements**

Run dev server. Check:
- Cards with lead status show colored left border
- Hovering a card reveals action buttons (desktop)
- Tag chips display on cards
- Cards without tags/interactions show cleanly

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.css frontend/src/components/Contacts.jsx
git commit -m "feat(contacts): add border color coding, hover-reveal actions, tag chips"
```

---

### Task 6: Empty State Component

**Files:**
- Create: `frontend/src/components/EmptyState.jsx`
- Modify: `frontend/src/components/Contacts.jsx` (add empty state)

- [ ] **Step 1: Create EmptyState component**

```jsx
// frontend/src/components/EmptyState.jsx
import { useTranslation } from 'react-i18next';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  const { t } = useTranslation('common');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12) var(--space-6)',
      textAlign: 'center',
    }}>
      {Icon && (
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'var(--gradient-primary)',
          border: '1px solid var(--gradient-primary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4)',
        }}>
          <Icon size={28} style={{ color: 'var(--accent-secondary)' }} />
        </div>
      )}
      <h3 style={{ marginBottom: 'var(--space-2)', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{
        color: 'var(--text-tertiary)',
        fontSize: '0.875rem',
        maxWidth: '360px',
        marginBottom: onAction ? 'var(--space-6)' : 0,
      }}>
        {description}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="glass-button"
          style={{
            background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            padding: '10px 24px',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use EmptyState in Contacts.jsx**

In `Contacts.jsx`, find the section where the card list renders (inside `.my-card-layout`). Wrap it with an empty state check:

```jsx
import EmptyState from './EmptyState';
import { FaAddressCard } from 'react-icons/fa';
```

Then where the card list is rendered:

```jsx
{!loading && cards.length === 0 ? (
  <EmptyState
    icon={FaAddressCard}
    title={t('cards:emptyTitle', 'Henuz kartvizit eklemediniz')}
    description={t('cards:emptyDescription', 'Ilk kartvizitinizi ekleyerek aginizi olusturmaya baslayin.')}
    actionLabel={t('cards:addCard', 'Kart Ekle')}
    onAction={() => setIsModalOpen(true)}
  />
) : (
  <div className="my-card-layout">
    {/* existing card list rendering */}
  </div>
)}
```

- [ ] **Step 3: Verify empty state renders**

Run dev server. If you have cards, temporarily filter to an impossible query to see the empty state. Verify:
- Icon, title, description, and button display correctly
- Button triggers the add card modal

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/EmptyState.jsx frontend/src/components/Contacts.jsx
git commit -m "feat(contacts): add illustrative empty state component"
```

---

### Task 7: Page Transitions with Framer Motion

**Files:**
- Create: `frontend/src/components/PageTransition.jsx`
- Modify: `frontend/src/App.jsx` (wrap routes)

- [ ] **Step 1: Create PageTransition wrapper component**

```jsx
// frontend/src/components/PageTransition.jsx
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.2,
  ease: 'easeOut',
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Wrap routes with AnimatePresence in App.jsx**

In `App.jsx`, import the components:

```jsx
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
```

Find the `<Routes>` block (around line 378). Wrap it with `<AnimatePresence mode="wait">`:

```jsx
<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
```

Then wrap each Route's element with `<PageTransition>`:

```jsx
<Route path="/" element={<PageTransition><Dashboard ... /></PageTransition>} />
<Route path="/login" element={<PageTransition><Login ... /></PageTransition>} />
```

Apply `<PageTransition>` wrapper to all Route elements.

- [ ] **Step 3: Get location for AnimatePresence key**

Make sure `location` is available. In App.jsx, the router wrapping component that contains `<Routes>` should use:

```jsx
import { useLocation } from 'react-router-dom';
const location = useLocation();
```

If `useLocation` is already imported and used (for nav active states), reuse it. If `<Routes>` is inside a component that doesn't have router context, you may need to extract the routes into an inner component.

- [ ] **Step 4: Verify page transitions**

Run dev server. Navigate between pages. Check:
- Pages fade in with slight upward slide on enter
- Pages fade out on exit
- No layout jumps or flickering

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PageTransition.jsx frontend/src/App.jsx
git commit -m "feat(transitions): add framer-motion page transition wrapper"
```

---

### Task 8: Mobile Bottom Navigation

**Files:**
- Create: `frontend/src/components/BottomNav.jsx`
- Create: `frontend/src/components/FAB.jsx`
- Modify: `frontend/src/App.jsx` (add BottomNav + FAB, hide top nav links on mobile)
- Modify: `frontend/src/index.css` (bottom nav styles, FAB styles, main padding-bottom)

- [ ] **Step 1: Create BottomNav component**

```jsx
// frontend/src/components/BottomNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaHome, FaAddressBook, FaIdCard } from 'react-icons/fa';

const tabs = [
  { path: '/', icon: FaHome, labelKey: 'common:dashboard' },
  { path: '/contacts', icon: FaAddressBook, labelKey: 'common:contacts' },
  { path: '/my-card', icon: FaIdCard, labelKey: 'common:myCard' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, icon: Icon, labelKey }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create FAB component**

```jsx
// frontend/src/components/FAB.jsx
import { FaPlus } from 'react-icons/fa';

export default function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add card">
      <FaPlus size={22} />
    </button>
  );
}
```

- [ ] **Step 3: Add CSS for bottom nav and FAB**

In `frontend/src/index.css`, add at the end of the file (before the closing):

```css
/* ====================================
   BOTTOM NAVIGATION (Mobile only)
   ==================================== */

.bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--glass-bg-solid);
    border-top: 1px solid var(--glass-border);
    padding: var(--space-2) 0;
    padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
    justify-content: space-around;
    align-items: center;
  }

  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    color: var(--text-tertiary);
    font-size: 0.65rem;
    font-weight: 500;
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
    transition: color 0.2s ease;
    min-width: 64px;
  }

  .bottom-nav-item.active {
    color: var(--accent-secondary);
  }

  /* Hide top nav links on mobile (use bottom nav instead) */
  .nav-links {
    display: none !important;
  }

  /* Add padding to main so content isn't hidden behind bottom nav */
  main {
    padding-bottom: 80px !important;
  }

  /* FAB */
  .fab {
    position: fixed;
    bottom: calc(70px + env(safe-area-inset-bottom));
    right: var(--space-4);
    z-index: 99;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(var(--accent-secondary-rgb), 0.4);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .fab:active {
    transform: scale(0.93);
  }
}

/* Hide FAB on desktop */
@media (min-width: 769px) {
  .fab {
    display: none;
  }
}
```

- [ ] **Step 4: Add BottomNav and FAB to App.jsx**

In `App.jsx`, import the new components:

```jsx
import BottomNav from './components/BottomNav';
import FAB from './components/FAB';
```

After the `</main>` tag and before the footer, add:

```jsx
{isAuthenticated && <BottomNav />}
{isAuthenticated && (
  <FAB onClick={() => navigate('/contacts', { state: { openAddCard: true } })} />
)}
```

- [ ] **Step 5: Verify mobile bottom nav and FAB**

Run dev server. Resize browser to mobile width (< 768px). Check:
- Bottom nav shows 3 tabs (Panel, Kisiler, Kartvizitim)
- Active tab is highlighted with accent color
- FAB appears bottom-right with gradient
- Top nav links are hidden on mobile
- Content not hidden behind bottom nav (padding-bottom on main)
- Desktop view: bottom nav and FAB are hidden

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BottomNav.jsx frontend/src/components/FAB.jsx frontend/src/App.jsx frontend/src/index.css
git commit -m "feat(mobile): add bottom navigation bar and floating action button"
```

---

### Task 9: Button Press Effect & Card Hover Glow

**Files:**
- Modify: `frontend/src/index.css` (button active states, card glow)

- [ ] **Step 1: Add press effect to all glass buttons**

In `frontend/src/index.css`, update the `.glass-button:active` rule (line 318-320):

```css
.glass-button:active {
  transform: translateY(0) scale(0.97);
  transition: transform 0.1s ease;
}
```

Add active state for `.glass-button-square`:

```css
.glass-button-square:active {
  transform: scale(0.93);
  transition: transform 0.1s ease;
}
```

Add active state for `.glass-button-small`:

```css
.glass-button-small:active {
  transform: translateY(0) scale(0.97);
  transition: transform 0.1s ease;
}
```

- [ ] **Step 2: Update glass-button hover to use accent border glow**

Update `.glass-button:hover` (lines 309-314):

```css
.glass-button:hover {
  background: var(--glass-bg-hover);
  border-color: rgba(var(--accent-secondary-rgb), 0.25);
  transform: translateY(-1px);
  box-shadow: var(--glass-shadow-hover);
}
```

Update `.glass-button-square:hover` similarly:

```css
.glass-button-square:hover {
  background: var(--glass-bg-hover);
  border-color: rgba(var(--accent-secondary-rgb), 0.25);
  transform: translateY(-1px);
  box-shadow: var(--glass-shadow-hover);
}
```

- [ ] **Step 3: Verify interactions**

Run dev server. Check:
- Buttons shrink slightly on click (active state)
- Buttons show indigo border glow on hover
- Interactions feel responsive and "premium"

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(css): add button press effect and accent border glow on hover"
```

---

### Task 10: AddCard Field Prioritization

**Files:**
- Modify: `frontend/src/components/AddCard.jsx` (reorder fields, add collapsible section)

- [ ] **Step 1: Add collapsed state for secondary fields**

In `AddCard.jsx`, near the other state declarations, add:

```jsx
const [showMoreFields, setShowMoreFields] = useState(false);
```

- [ ] **Step 2: Reorganize form fields into primary and secondary groups**

Find the form fields section in `AddCard.jsx`. The primary fields (always visible) should be:
- firstName, lastName (row)
- company, title (row)
- email, phone (row)

The secondary fields (inside collapsible) should be:
- address, city, country
- website
- notes, ocrText

Wrap the secondary fields section:

```jsx
<button
  type="button"
  onClick={() => setShowMoreFields(!showMoreFields)}
  className="glass-button"
  style={{
    width: '100%',
    justifyContent: 'center',
    marginTop: 'var(--space-2)',
    marginBottom: 'var(--space-2)',
    fontSize: '0.85rem',
  }}
>
  {showMoreFields
    ? t('cards:showLess', 'Daha Az Goster')
    : t('cards:showMore', 'Daha Fazla Alan Goster')
  }
  <span style={{ marginLeft: '6px', transition: 'transform 0.2s', transform: showMoreFields ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
</button>

{showMoreFields && (
  <div className="addcard-form-grid" style={{ animation: 'fadeIn 0.2s ease' }}>
    {/* address, city, country, website, notes fields here */}
  </div>
)}
```

Keep CRM fields (leadStatus, priority, source, tags, reminderDate, visibility) always visible since they're part of the CRM workflow.

- [ ] **Step 3: Pre-expand secondary fields when editing**

When `activeCard` is provided (edit mode), auto-expand secondary fields:

```jsx
useEffect(() => {
  if (activeCard) {
    setShowMoreFields(true);
  }
}, [activeCard]);
```

- [ ] **Step 4: Verify form renders correctly**

Run dev server. Open add card dialog. Check:
- Primary fields (name, company, contact) show immediately
- "Daha Fazla Alan Goster" button toggles secondary fields
- CRM fields always visible
- Editing an existing card auto-expands secondary fields
- All fields still submit correctly

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AddCard.jsx
git commit -m "feat(addcard): prioritize primary fields with collapsible secondary section"
```

---

### Task 11: Skeleton Loading Consistency

**Files:**
- Modify: `frontend/src/components/Contacts.jsx` (add skeleton)
- Modify: `frontend/src/components/Dashboard.jsx` (ensure skeleton consistency)

- [ ] **Step 1: Add contact card skeletons to Contacts.jsx**

In `Contacts.jsx`, find the loading state rendering. Replace any existing loading indicator with skeleton cards:

```jsx
{loading && (
  <div className="my-card-layout">
    {[1, 2, 3].map(i => (
      <div key={i} className="card-wrapper">
        <div className="glass-container skeleton-box" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ width: '200px', height: '120px', borderRadius: '12px', background: 'rgba(var(--accent-secondary-rgb), 0.05)' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-text" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
              <div className="skeleton-text" style={{ width: '40%', height: '16px', marginBottom: '12px' }} />
              <div className="skeleton-text" style={{ width: '80%', height: '14px' }} />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: Ensure Dashboard skeleton uses same pattern**

In `Dashboard.jsx`, find the loading state and make sure it uses `.skeleton-box` class with `.skeleton-text` children, matching the same shimmer animation defined in `index.css`.

- [ ] **Step 3: Verify skeletons**

Run dev server. Throttle network in DevTools to Slow 3G. Check:
- Contacts page shows 3 skeleton cards while loading
- Dashboard shows skeleton stat cards while loading
- Shimmer animation is visible and smooth

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Contacts.jsx frontend/src/components/Dashboard.jsx
git commit -m "feat(loading): add consistent skeleton loading states"
```

---

### Task 12: Staggered List Animation for Contact Cards

**Files:**
- Modify: `frontend/src/components/Contacts.jsx` (wrap card list with framer-motion)

- [ ] **Step 1: Add framer-motion stagger to card list**

In `Contacts.jsx`, import:

```jsx
import { motion } from 'framer-motion';
```

Replace the card list container with:

```jsx
<div className="my-card-layout">
  {cards.map((card, index) => (
    <motion.div
      key={card._id}
      className="card-wrapper"
      data-priority={card.priority || ''}
      data-lead={card.leadStatus || ''}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: 'easeOut',
      }}
    >
      {/* existing card content */}
    </motion.div>
  ))}
</div>
```

Note: Replace the existing `<div className="card-wrapper" ...>` with `<motion.div>`. Keep all existing children and attributes.

- [ ] **Step 2: Verify stagger animation**

Run dev server. Load the contacts page. Check:
- Cards appear one by one with slight stagger delay
- Animation is subtle (0.04s between each card)
- No layout shift during animation

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Contacts.jsx
git commit -m "feat(contacts): add staggered list animation for card entries"
```

---

### Task 13: Clean Up `!important` Overrides (CSS Refactor)

**Files:**
- Modify: `frontend/src/index.css` (reduce !important usage)

- [ ] **Step 1: Audit and reduce `!important` usage**

Review all `!important` declarations in `index.css`. For each one:
- If it overrides inline styles from MUI or JS: keep it (these are necessary)
- If it overrides other CSS in the same file: increase specificity instead

Replace these patterns where possible:

Instead of:
```css
.contacts-header {
  flex-direction: column !important;
}
```

Use:
```css
@media (max-width: 768px) {
  .contacts-header.contacts-header {
    flex-direction: column;
  }
}
```

Or use more specific selectors. Focus on the mobile media queries (lines 475-580) where most `!important` declarations live.

Note: Some `!important` declarations may be necessary to override MUI inline styles. Keep those. The goal is to reduce unnecessary ones, not eliminate all.

- [ ] **Step 2: Verify no visual regressions**

Run dev server. Check both mobile and desktop layouts. Ensure:
- Mobile card stacking still works
- Nav responsive behavior unchanged
- Dashboard grid responsive behavior unchanged

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "refactor(css): reduce !important overrides with specificity management"
```
