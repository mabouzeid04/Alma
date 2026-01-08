# Settings Hub Restructure

## Overview

Transform the current Personal Knowledge screen (accessed via person icon) into a proper Settings hub with multiple sub-pages. This creates the foundation for user preferences, account management, and exposes the existing patterns/theories systems.

## Purpose

**The user needs to view and delete AI-generated patterns and theories to correct misinterpretations.** If the AI forms incorrect conclusions, those errors can corrupt future sessions by influencing how the AI responds. Users must be able to:

1. See what patterns/theories the AI has detected
2. Delete any that are wrong or no longer relevant

This is a data hygiene feature - keeping the AI's understanding accurate.

## Current State

- Person icon in top-left → `settings.tsx` → Shows editable personal knowledge text area
- Title: "Personal Knowledge"
- Patterns service exists (`patterns.ts`) but has no UI for viewing
- Theories service specified but not yet implemented

## Target State

```
Person icon → Settings Hub (list of menu items)
                ├── Personal Knowledge (editable facts)
                ├── Patterns (view and delete AI-detected patterns)
                ├── Theories (view and delete AI hypotheses - future)
                └── Preferences (account settings - future)
```

---

## Navigation Structure

### Settings Hub (`app/app/settings.tsx`)

The main settings screen becomes a hub with list items:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back              Settings                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ABOUT YOU                                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🧠  Personal Knowledge                            →    ││
│  │     Facts the AI remembers about you                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔄  Patterns                                  3   →    ││
│  │     Recurring themes the AI has noticed                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💡  Theories                                  2   →    ││
│  │     Deeper hypotheses about you                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ────────────────────────────────────────────────────────── │
│                                                             │
│  APP                                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚙️  Preferences                                   →    ││
│  │     Voice, notifications, appearance                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                                                             │
│                        Version 1.0.0                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Menu Item Component

Each menu item shows:
- Icon (left)
- Title (primary text)
- Subtitle (secondary text, muted)
- Optional badge with count (patterns needing review, active theories count)
- Chevron right (→)

---

## Sub-Pages

### 1. Personal Knowledge (`app/app/settings/personal-knowledge.tsx`)

**Move the current `settings.tsx` functionality here.**

Current behavior preserved:
- Editable text area for personal facts
- Save button with unsaved changes detection
- Format hint at bottom
- Auto-extracted facts from conversations

No changes to functionality, just relocated.

### 2. Patterns (`app/app/settings/patterns.tsx`)

**View and delete AI-detected patterns.**

Each pattern is displayed in its own card. User can read what the AI thinks and delete it if wrong.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings           Patterns                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Patterns the AI has noticed. Delete any that are wrong.   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Career satisfaction                              [🗑️]  ││
│  │                                                         ││
│  │ "Your feelings about your job have shifted from        ││
│  │ frustration to cautious optimism over the past month"  ││
│  │                                                         ││
│  │ 12 sessions · Oct 1                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Sarah                                            [🗑️]  ││
│  │                                                         ││
│  │ "Recent conversations about Sarah focus more on        ││
│  │ logistics than emotional connection"                   ││
│  │                                                         ││
│  │ 8 sessions · Oct 10                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Work deadlines                                   [🗑️]  ││
│  │                                                         ││
│  │ "You tend to get stressed before major deadlines,      ││
│  │ often mentioning sleep issues in the same sessions"    ││
│  │                                                         ││
│  │ 6 sessions · Sep 15                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Each pattern card shows:**
- Title/subject (what it's about)
- Description (what the AI concluded)
- Session count and when first noticed
- Delete button (trash icon)

**Delete action:**
- Tap trash icon → confirmation alert → hard delete from database
- Pattern is removed and won't influence future conversations

**Empty State:**
```
No patterns yet

The AI will start noticing patterns
after several sessions over a few weeks.
```

### 3. Theories (`app/app/settings/theories.tsx`)

**View and delete AI hypotheses (deeper understanding).**

Theories are deeper conclusions the AI forms about beliefs, values, and behaviors. Same interaction as patterns - view and delete.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings          Theories                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deeper hypotheses about you. Delete any that are wrong.   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Self-worth tied to productivity                  [🗑️]  ││
│  │                                                         ││
│  │ "You seem to tie your sense of self-worth to being     ││
│  │ productive. When work is slow, you feel guilty - even  ││
│  │ if other parts of life are going well."                ││
│  │                                                         ││
│  │ 12 sessions · 3 months                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Conflict avoidance                               [🗑️]  ││
│  │                                                         ││
│  │ "You tend to let things slide rather than bringing     ││
│  │ them up directly. This might lead to frustration       ││
│  │ building up over time."                                ││
│  │                                                         ││
│  │ 7 sessions · 2 months                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Theories service is not yet implemented. This page should:
- Show empty state initially: "No theories yet"
- Once theories service is implemented, display them with delete option

### 4. Preferences (`app/app/settings/preferences.tsx`)

**Future: App settings and account management.**

For now, show a minimal placeholder:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings         Preferences                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Coming soon                                                │
│                                                             │
│  Voice settings, notifications, and appearance             │
│  options will be available here.                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Future sections (not for initial implementation):**
- Voice (speed, voice selection)
- Notifications (reminders, insights alerts)
- Appearance (dark mode toggle)
- Data (export, delete account)

---

## File Structure

### New Files to Create

```
app/app/settings/
├── _layout.tsx              # Stack navigator for settings sub-pages
├── personal-knowledge.tsx   # Current settings.tsx content moved here
├── patterns.tsx             # New patterns viewing page
├── theories.tsx             # New theories viewing page (mostly empty initially)
└── preferences.tsx          # Placeholder for future preferences
```

### Files to Modify

```
app/app/settings.tsx         # Transform to hub page with menu items
app/src/hooks/index.ts       # Export usePatterns hook
```

### New Components

```
app/src/components/
├── SettingsMenuItem.tsx     # Reusable menu item with icon, title, subtitle, badge
├── PatternCard.tsx          # Display card for a pattern with delete button
└── TheoryCard.tsx           # Display card for a theory with delete button
```

### New Hooks

```
app/src/hooks/
├── usePatterns.ts           # Load and manage patterns for display
└── useTheories.ts           # Load and manage theories for display (stub initially)
```

---

## Implementation Details

### Settings Hub Menu Items

```typescript
interface SettingsMenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  badge?: number;  // Optional count to show
}

const menuItems: SettingsMenuItem[] = [
  {
    id: 'personal-knowledge',
    icon: 'person-circle-outline',
    title: 'Personal Knowledge',
    subtitle: 'Facts the AI remembers about you',
    route: '/settings/personal-knowledge',
  },
  {
    id: 'patterns',
    icon: 'repeat-outline',
    title: 'Patterns',
    subtitle: 'Recurring themes the AI has noticed',
    route: '/settings/patterns',
    badge: patternsCount,  // Show total count
  },
  {
    id: 'theories',
    icon: 'bulb-outline',
    title: 'Theories',
    subtitle: 'Deeper hypotheses about you',
    route: '/settings/theories',
    badge: theoriesCount,  // Show total count
  },
  {
    id: 'preferences',
    icon: 'settings-outline',
    title: 'Preferences',
    subtitle: 'Voice, notifications, appearance',
    route: '/settings/preferences',
  },
];
```

### usePatterns Hook

```typescript
export function usePatterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setIsLoading(true);
    const all = await db.getAllPatterns();
    setPatterns(all.filter(p => !p.deletedAt));  // Exclude soft-deleted
    setIsLoading(false);
  };

  const deletePattern = async (id: string) => {
    await db.hardDeletePattern(id);
    setPatterns(prev => prev.filter(p => p.id !== id));
  };

  return { patterns, isLoading, deletePattern, refresh: loadPatterns };
}
```

### PatternCard Component

Simple card showing pattern info with delete button.

```typescript
interface PatternCardProps {
  pattern: Pattern;
  onDelete: () => void;
}

function PatternCard({ pattern, onDelete }: PatternCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Pattern',
      'This pattern will be removed and won\'t influence future conversations.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {pattern.subject || 'Pattern'}
        </Text>
        <Pressable onPress={handleDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.description}>
        {pattern.description}
      </Text>

      <Text style={styles.meta}>
        {pattern.relatedSessions.length} sessions · {formatDate(pattern.firstObserved)}
      </Text>
    </View>
  );
}
```

### TheoryCard Component

Same structure as PatternCard.

```typescript
interface TheoryCardProps {
  theory: Theory;
  onDelete: () => void;
}

function TheoryCard({ theory, onDelete }: TheoryCardProps) {
  // Same implementation as PatternCard
}
```

---

## Routing

Using Expo Router with nested stack:

```typescript
// app/app/settings/_layout.tsx
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-knowledge" />
      <Stack.Screen name="patterns" />
      <Stack.Screen name="theories" />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}
```

**Note:** Current `settings.tsx` needs to be moved to `settings/index.tsx` for the folder-based routing to work.

---

## Database Functions

Already exist in `database.ts`:
- `getAllPatterns()` - Get all patterns
- `hardDeletePattern(id)` - Permanently delete a pattern

May need to add:
- `getPatternCount()` - For badge display on hub

---

## Migration Steps

1. Create `app/app/settings/` directory
2. Create `_layout.tsx` with stack navigator
3. Move current `settings.tsx` content to `settings/personal-knowledge.tsx`
4. Create new `settings/index.tsx` as the hub page
5. Create `settings/patterns.tsx`
6. Create `settings/theories.tsx` (with empty state)
7. Create `settings/preferences.tsx` (placeholder)
8. Create supporting components (`SettingsMenuItem`, `PatternCard`, `ConfidenceBar`)
9. Create hooks (`usePatterns`, `useTheories`)
10. Update any imports/navigation that referenced the old settings path

---

## Success Criteria

- [ ] Person icon navigates to Settings hub
- [ ] Hub shows menu items for Personal Knowledge, Patterns, Theories, Preferences
- [ ] Personal Knowledge page works exactly as before (editable)
- [ ] Patterns page shows all patterns in individual cards
- [ ] Each pattern can be deleted with confirmation
- [ ] Theories page shows empty state (until theories service implemented)
- [ ] Preferences page shows coming soon placeholder
- [ ] Deleting a pattern removes it from database and the AI stops using it
- [ ] Navigation between pages works with proper back buttons

---

## Future Enhancements (Not in Scope)

- Tap pattern/theory to see linked sessions
- Edit pattern/theory descriptions
- Preferences implementation (voice, appearance, account management)
