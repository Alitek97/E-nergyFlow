# E-nergy Flow

## Overview

E-nergy Flow is a mobile-first application for power plant engineers and technicians. It facilitates rapid and accurate computations, including tracking feeder readings, turbine data, energy calculations, and report generation. The application supports offline functionality via local storage and features a bold, industrial design with high contrast, electric blue accents, and a default dark mode to minimize eye strain.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 (bottom tab navigator with Feeders, Turbines, Calculations, Reports)
- **State Management**: React Context API for daily data, TanStack React Query for server state
- **Styling**: Custom theme system with light/dark/system mode support, persisted via AsyncStorage
- **UI/UX**: Bold/industrial design, keyboard-aware components, themed components, error boundaries. Responsive layouts for phone/tablet with 768px breakpoint and max content width of 900px. PressableScale for animated button feedback. Toast notification system (fade+slide, auto-dismiss) via global ref pattern for non-React callers.
- **RTL Support**: Complete RTL/LTR handling with language and direction persistence via AsyncStorage. All text uses centralized `t()` translation function from `client/lib/i18n.ts`. RTL layout applied via `useRTL()` hook (`rtlRow`, `rtlText`) across all screens. Web language switching is instant (no page reload) via HTML `dir` attribute updates. Navigation headers, calendar, auth screens, keypads, and all UI elements are fully translated (English/Arabic).

### Backend
- **Server**: Express.js on Node.js
- **API**: RESTful, prefixed with `/api`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Shared between client and server (`shared/schema.ts`)
- **Storage Abstraction**: `IStorage` interface, currently in-memory but designed for database integration.

### Data Storage
- **Local Storage**: AsyncStorage for offline persistence of daily calculations.
- **Data Structure**: Day-based records for feeder readings (start/end kWh) and turbine data (previous/present readings, hours).
- **Carry-Over System**: Yesterday's "End of Day" values automatically become today's "Start of Day" values, persisted locally and to Supabase.

### Core Features
- **Energy Calculations**: Daily readings in MWh, monthly aggregations in GWh.
- **Turbine/Feeder Status**: Logic to detect "stopped" turbines/feeders (null/empty present/end values) and handle negative differences, preventing erroneous large values.
- **Data Entry UX**: Arrow icons for copying values between input fields.
- **Export/Withdrawal Display**: Consistent labeling and color-coding (green for Export, red for Withdrawal).
- **Guest Authentication**: Supports anonymous sign-in with Supabase, allowing users to upgrade to full accounts without data loss.

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`), managed with Drizzle Kit.
- **Cloud Backend**: Supabase for authentication and data synchronization.
- **Expo Ecosystem**: Font loading, haptics, blur effects, clipboard, splash screen.
- **Third-Party Libraries**: Google Fonts (Outfit), React Navigation, TanStack Query.
