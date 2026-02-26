# E-nergy Flow - Design Guidelines

## Brand Identity

**Purpose**: A professional calculation tool for power plant engineers and technicians to perform critical computations quickly and accurately.

**Aesthetic Direction**: Bold/Industrial - High contrast interface with energy-inspired accents. Clean, technical precision with authoritative typography. Dark mode by default to reduce eye strain during extended use. The app feels like a premium professional instrument.

**Memorable Element**: Electric blue accent that pulses subtly on active calculations, giving the interface a sense of "live" energy flow.

## Navigation Architecture

**Root Navigation**: Tab Bar (3 tabs)
- **Calculator** (main calculations interface)
- **History** (saved/recent calculations)
- **Reference** (formulas, constants, unit conversions)

**Additional Screen**: Settings (accessed via header button on any tab)

## Screen-by-Screen Specifications

### 1. Calculator Screen
**Purpose**: Primary calculation interface for power plant formulas

**Layout**:
- Header: Transparent, title "Calculator", right button (gear icon → Settings)
- Content: ScrollView with form layout
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- Floating action button: "Calculate" (bottom-right, above tab bar)

**Components**:
- Segmented control (top): Switch between calculation types (Thermal, Hydraulic, Electrical, Efficiency)
- Form inputs: Large text fields with unit labels (MW, kPa, °C, etc.)
- Dropdown selectors for formula selection
- Large result card: Shows calculated value with unit, includes "Save" and "Share" buttons
- Pressed feedback: Scale down to 0.98 on all buttons

**Empty State**: When no calculation selected, show hero illustration with text "Select a calculation type to begin"

### 2. History Screen
**Purpose**: View and reuse past calculations

**Layout**:
- Header: Transparent, title "History", right button (trash icon for bulk delete)
- Content: FlatList of calculation cards
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components**:
- Search bar (below header, sticky)
- List items: Cards showing calculation type, result, timestamp
- Swipe actions: Delete (red), Duplicate (blue)
- Pull to refresh
- Pressed feedback: Cards scale down to 0.98

**Empty State**: Illustration of filing cabinet with text "No calculations saved yet"

### 3. Reference Screen
**Purpose**: Quick access to formulas, constants, and unit conversions

**Layout**:
- Header: Transparent, title "Reference", search icon (right)
- Content: ScrollView with collapsible sections
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

**Components**:
- Accordion sections: Formulas, Constants, Unit Converter
- Formula cards: Display equation with variable definitions
- Constants table: Name, symbol, value, unit
- Unit converter widget: Two input fields with swap button
- Pressed feedback: Accordion headers highlight on press

### 4. Settings Screen
**Purpose**: App preferences and profile customization

**Layout**:
- Header: Standard navigation, title "Settings", left back button
- Content: ScrollView with grouped list
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**:
- Profile section: Avatar (preset industrial helmet icon), display name field
- Preferences: Theme toggle (Dark/Light/Auto), decimal precision, units (SI/Imperial)
- About section: Version, privacy policy, terms (placeholder links)
- Pressed feedback: List items highlight on press

## Color Palette

**Dark Theme (Default)**:
- Primary: #00D9FF (electric cyan)
- Background: #0A0E1A (deep navy-black)
- Surface: #1A1F2E (elevated dark blue)
- Surface Variant: #252B3D (lighter surface)
- Text Primary: #FFFFFF
- Text Secondary: #94A3B8
- Border: #2D3748
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444

**Light Theme**:
- Primary: #0099CC (deep cyan)
- Background: #F8FAFC
- Surface: #FFFFFF
- Surface Variant: #F1F5F9
- Text Primary: #0F172A
- Text Secondary: #64748B
- Border: #E2E8F0

## Typography

**Font**: Outfit (Google Font) - geometric, technical, highly legible
- Display: 32px, Bold (screen titles)
- Heading: 24px, Semibold (section headers)
- Title: 18px, Semibold (card titles)
- Body: 16px, Regular (main content)
- Caption: 14px, Regular (metadata, labels)
- Monospace: 16px, Monospace (calculation results, numbers)

## Visual Design

**Spacing Scale**:
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px

**Border Radius**:
- Small: 8px (buttons, inputs)
- Medium: 12px (cards)
- Large: 16px (modals)

**Shadows** (Floating Action Button only):
- shadowOffset: {width: 0, height: 2}
- shadowOpacity: 0.10
- shadowRadius: 2

**Icons**: Feather icons from @expo/vector-icons

## Assets to Generate

1. **icon.png** - App icon showing stylized power plant cooling tower with circuit pattern, cyan/navy gradient | WHERE USED: Device home screen
2. **splash-icon.png** - Simplified icon version | WHERE USED: App launch screen
3. **empty-history.png** - Minimalist illustration of clipboard with checkmarks | WHERE USED: History screen empty state
4. **calculator-hero.png** - Abstract geometric illustration of electrical grid network | WHERE USED: Calculator screen initial state
5. **avatar-engineer.png** - Industrial safety helmet icon (cyan/navy) | WHERE USED: Settings profile section default avatar
