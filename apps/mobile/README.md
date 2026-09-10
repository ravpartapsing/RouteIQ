# RouteIQ Driver — Flutter Mobile App

> Static-data demo build of the RouteIQ TMS driver mobile application.
> Targets iOS 14+ and Android 5+ (API 21+).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Design System](#4-design-system)
5. [Data Layer](#5-data-layer)
6. [Navigation](#6-navigation)
7. [Screen Inventory](#7-screen-inventory)
8. [NASA Coding Guidelines](#8-nasa-coding-guidelines)
9. [Build Instructions](#9-build-instructions)
10. [Running on a Device / Emulator](#10-running-on-a-device--emulator)
11. [Extending to a Real Backend](#11-extending-to-a-real-backend)

---

## 1. Overview

RouteIQ Driver is the field-facing mobile application for the RouteIQ Transportation Management System (TMS). It gives truck drivers a single screen for:

- Viewing their active load and route
- Navigating to each stop
- Confirming arrivals, departures, and deliveries (with POD photo and signature)
- Logging Hours of Service (HOS)
- Messaging dispatchers
- Tracking settlements and expenses

This repository contains a **fully-functional demo build** that runs entirely on static mock data — no network calls, no authentication backend. It is intended for investor demos, UX review, and onboarding new engineers.

---

## 2. Architecture

```
┌─────────────────────────────────────┐
│         Flutter Widget Tree          │
│  MaterialApp.router (main.dart)      │
│    └── GoRouter (routes.dart)        │
│          ├── Auth screens            │
│          └── ShellRoute              │
│               ├── MainShell          │ ← bottom nav bar
│               └── Feature screens   │
└─────────────┬───────────────────────┘
              │ reads
┌─────────────▼───────────────────────┐
│         Data Layer                   │
│  MockDataSource (static/mock_data)   │ ← swap for Repository pattern
│  Immutable model classes             │
└─────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| Feature-first folder layout | Each feature is self-contained; teams can work in parallel without merge conflicts |
| `abstract final class` for constants | Zero runtime cost, prevents accidental instantiation |
| `final class` for models | Immutable by construction; safe to share across widget rebuilds |
| GoRouter + ShellRoute | Declarative URL-based navigation; deep-link ready |
| No code generation | `build_runner` adds CI complexity — kept out of scope for demo |
| Static mock data | Decouples UI from API during early development and demos |

---

## 3. Project Structure

```
routeiq_driver/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── app/
│   │   ├── routes.dart              # All route paths + GoRouter config
│   │   └── theme.dart               # MaterialTheme (colors, typography, components)
│   ├── core/
│   │   └── constants/
│   │       ├── app_colors.dart      # Brand + semantic color palette
│   │       ├── app_spacing.dart     # 8pt grid spacing + border radii
│   │       ├── app_strings.dart     # All user-facing string literals
│   │       └── app_text_styles.dart # Typography scale
│   ├── data/
│   │   ├── models/
│   │   │   ├── driver_model.dart
│   │   │   ├── hos_model.dart
│   │   │   ├── load_model.dart
│   │   │   ├── message_model.dart
│   │   │   └── settlement_model.dart
│   │   └── static/
│   │       └── mock_data.dart       # All demo data — single source of truth
│   ├── shared/
│   │   └── widgets/
│   │       ├── app_button.dart      # Primary / Secondary / Ghost / Destructive
│   │       ├── main_shell.dart      # Bottom tab bar scaffold
│   │       └── status_badge.dart    # Load status colored badge
│   └── features/
│       ├── auth/
│       │   └── screens/
│       │       ├── splash_screen.dart
│       │       ├── phone_login_screen.dart
│       │       └── otp_screen.dart
│       ├── home/
│       │   ├── screens/home_screen.dart
│       │   └── widgets/
│       │       ├── active_load_card.dart
│       │       ├── hos_progress_bar.dart
│       │       ├── messages_preview.dart
│       │       ├── quick_actions_row.dart
│       │       └── stats_row.dart
│       ├── loads/
│       │   ├── screens/
│       │   │   ├── loads_list_screen.dart
│       │   │   ├── load_detail_screen.dart
│       │   │   ├── arrive_stop_screen.dart
│       │   │   └── delivery_screen.dart
│       │   └── widgets/
│       │       ├── load_card.dart
│       │       └── stop_timeline.dart
│       ├── documents/
│       │   └── screens/documents_screen.dart
│       ├── messages/
│       │   └── screens/
│       │       ├── conversations_screen.dart
│       │       └── chat_screen.dart
│       └── profile/
│           └── screens/
│               ├── profile_screen.dart
│               ├── hos_log_screen.dart
│               ├── settlements_screen.dart
│               └── settings_screen.dart
├── assets/
│   └── images/                      # App icons, illustrations (empty for demo)
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── kotlin/com/routeiq/driver/MainActivity.kt
│   │       └── res/
│   │           ├── values/styles.xml
│   │           ├── values/colors.xml
│   │           └── drawable/launch_background.xml
│   ├── build.gradle
│   ├── gradle.properties
│   └── settings.gradle
└── pubspec.yaml
```

---

## 4. Design System

### Colors (`app_colors.dart`)

| Token | Value | Usage |
|---|---|---|
| `brandPrimary` | `#304E9E` | Primary buttons, active nav, brand elements |
| `accentBlue` | `#0057FF` | Links, highlights |
| `accentLight` | `#EFF6FF` | Light blue backgrounds (next-stop card) |
| `success` | `#16A34A` | Delivered badge, HOS safe zone |
| `warning` | `#D97706` | Near-limit HOS, expiring docs |
| `danger` | `#DC2626` | Violations, errors, destructive actions |
| `gray50–gray900` | — | Backgrounds, borders, secondary text |

### Typography (`app_text_styles.dart`)

All styles are compile-time `const TextStyle` objects using the system font.

| Style | Size | Weight | Usage |
|---|---|---|---|
| `display` | 28sp | 700 | Splash headline |
| `h1` | 24sp | 700 | Screen titles |
| `h2` | 20sp | 700 | Section headers |
| `h3` | 17sp | 600 | Card titles |
| `bodyLg` | 16sp | 400 | Primary body text |
| `body` | 14sp | 400 | Default body |
| `bodySm` | 13sp | 400 | Secondary info |
| `caption` | 12sp | 400 | Timestamps, labels |
| `label` | 11sp | 500 | All-caps labels |
| `button` | 15sp | 600 | Button text |

### Spacing (`app_spacing.dart`)

8-point grid: `xs=4, sm=8, md=12, lg=16, xl=20, xl2=24, xl3=32, xl4=40, xl5=48`

Border radii: `card=12, button=14, sheet=20, sm=6, badge=4, pill=999`

---

## 5. Data Layer

### Models

All models use `final class` — every field is `final`, no setters. This prevents accidental mutation when the same model instance is referenced by multiple widgets.

| Model | Key fields |
|---|---|
| `DriverModel` | name, CDL class, performance stats, computed `initials` |
| `LoadModel` | stops list, status enum, financial fields; computed `nextStop` |
| `StopModel` | type (pickup/delivery/waypoint), scheduled time, status |
| `HosSnapshot` | duty status, minutes driven today, 7-day log |
| `ConversationModel` | last message, unread count |
| `SettlementModel` | line items, deductions; computed `netPay` |

### Mock Data (`mock_data.dart`)

`MockDataSource` is an `abstract final class` with only `static` fields — it acts as a namespace, not an object. All demo data is defined here:

- `driver` — James Davidson, CDL-A Owner-Operator
- `activeLoad` — ORD-2026-00143, Chicago → Dallas (2 stops completed, 1 pending)
- `upcomingLoad` — ORD-2026-00144, Dallas → Atlanta
- `hosSnapshot` — 8h12m driven today (492 of 660 min limit)
- `conversations` — 2 dispatcher threads
- `settlements` — 3 settlement periods

**To swap in real data:** replace `MockDataSource` with a `Repository` class that fetches from your API. No widget code needs to change — just the data source reference.

---

## 6. Navigation

Navigation is handled by **GoRouter** with a `ShellRoute` for the bottom tab bar.

```
/                    → SplashScreen
/login               → PhoneLoginScreen
/login/otp           → OtpScreen
/home                → HomeScreen          (shell tab 0)
/loads               → LoadsListScreen     (shell tab 1)
/loads/:id           → LoadDetailScreen
/loads/:id/arrive    → ArriveStopScreen
/loads/:id/delivery  → DeliveryScreen
/documents           → DocumentsScreen     (shell tab 2)
/messages            → ConversationsScreen (shell tab 3)
/messages/:id        → ChatScreen
/profile             → ProfileScreen       (shell tab 4)
/profile/hos         → HosLogScreen
/profile/settlements → SettlementsScreen
/profile/settings    → SettingsScreen
```

All route path strings are `const` in `AppRoutes` — never use raw strings in navigation calls.

```dart
// Correct
context.go(AppRoutes.home);
context.go('/loads/${load.id}');

// Wrong — magic string, not type-checked
context.go('/home');
```

---

## 7. Screen Inventory

| # | Screen | File | Notes |
|---|---|---|---|
| 1 | Splash | `auth/screens/splash_screen.dart` | 2s delay, auto-navigates to login |
| 2 | Phone Login | `auth/screens/phone_login_screen.dart` | Validates US phone format |
| 3 | OTP | `auth/screens/otp_screen.dart` | 6-digit, auto-submit on fill |
| 4 | Home | `home/screens/home_screen.dart` | HOS bar, active load card, actions |
| 5 | Loads List | `loads/screens/loads_list_screen.dart` | Segmented: Active / Upcoming / History |
| 6 | Load Detail | `loads/screens/load_detail_screen.dart` | Stop timeline, commodity info |
| 7 | Arrive at Stop | `loads/screens/arrive_stop_screen.dart` | GPS confirm, timestamp |
| 8 | Delivery / POD | `loads/screens/delivery_screen.dart` | Photo + signature capture |
| 9 | Documents | `documents/screens/documents_screen.dart` | CDL, medical card, etc. |
| 10 | Conversations | `messages/screens/conversations_screen.dart` | Thread list |
| 11 | Chat | `messages/screens/chat_screen.dart` | Bubble UI, send bar |
| 12 | Profile | `profile/screens/profile_screen.dart` | Performance scorecard |
| 13 | HOS Log | `profile/screens/hos_log_screen.dart` | Daily timeline, 7-day grid |
| 14 | Settlements | `profile/screens/settlements_screen.dart` | Pay periods list + detail |
| 15 | Settings | `profile/screens/settings_screen.dart` | Notifications, GPS, appearance |

---

## 8. NASA Coding Guidelines

This codebase follows the **NASA JPL Institutional Coding Standard** rules adapted for Dart/Flutter:

### Rule 1 — Simple Control Flow
No recursion, no deeply nested conditionals. Every function has a single return point where possible. `switch` expressions are preferred over long `if/else` chains.

### Rule 2 — Fixed Upper Bound on Loops
All `ListView` and `for` loops iterate over fixed-size lists sourced from `MockDataSource`. No unbounded growth.

### Rule 3 — Restrict Data Scope
- Constants: `abstract final class` — cannot be instantiated, all fields are `static const`
- Models: `final class` — immutable after construction
- Widget state: kept in the narrowest `StatefulWidget` that needs it; never in global variables
- No mutable global state

### Rule 4 — Functions Under 60 Lines
Every `build()` method and helper is under 60 lines. Complex sections are extracted into private widget classes (`_Stat`, `_Divider`, `_TabItem`, etc.).

### Rule 5 — Minimum Two Assertions Per Function
Input validation is performed at every public function boundary. Flutter's `assert()` is used in debug mode. Example: `assert(progress >= 0.0 && progress <= 1.0)` in `HosProgressBar`.

### Rule 6 — Minimal Variable Scope
All variables are declared with `final` unless mutation is required. Loop variables are declared inside the loop body. No variable lives longer than its use.

### Rule 7 — Check Return Values
Every `Navigator.pop()`, `context.go()`, and async operation result is handled. No fire-and-forget calls.

### Rule 8 — Use Preprocessor Sparingly
In Dart terms: no `dart:mirrors`, no dynamic dispatch, no `dynamic` typed variables. All types are explicit.

### Rule 10 — Compile All Warnings
Zero analyzer warnings policy. Run `flutter analyze` and resolve all issues before committing.

---

## 9. Build Instructions

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Flutter SDK | 3.19+ | https://docs.flutter.dev/get-started/install |
| Android Studio | 2023.1+ | For Android SDK and emulator |
| Xcode | 15+ | For iOS build (macOS only) |
| Java JDK | 17+ | Required by Gradle |

### Step 1 — Install Flutter

```bash
# macOS (using homebrew)
brew install --cask flutter

# Or manual install
cd ~/development
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:$HOME/development/flutter/bin"
```

### Step 2 — Verify setup

```bash
flutter doctor
```

All items should show green checkmarks. Fix any issues before proceeding.

### Step 3 — Get dependencies

```bash
cd /path/to/routeiq_driver
flutter pub get
```

### Step 4 — Create `android/local.properties`

```bash
# In android/ directory
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
echo "flutter.sdk=$(which flutter | xargs dirname | xargs dirname)" >> android/local.properties
```

### Step 5 — Build debug APK (fastest)

```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### Step 6 — Build release APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Step 7 — Build split APKs by ABI (smaller files)

```bash
flutter build apk --split-per-abi --release
# Outputs:
#   app-armeabi-v7a-release.apk   (~15 MB — 32-bit ARM, older phones)
#   app-arm64-v8a-release.apk     (~17 MB — 64-bit ARM, most modern phones)
#   app-x86_64-release.apk        (~18 MB — emulators)
```

### Build iOS IPA

```bash
flutter build ipa --release
# Requires Xcode + Apple Developer account
```

---

## 10. Running on a Device / Emulator

### Android Emulator

```bash
# List available emulators
flutter emulators

# Launch one
flutter emulators --launch <emulator_id>

# Run app
flutter run
```

### Physical Android Device

1. Enable **Developer Options** → **USB Debugging** on device
2. Connect via USB
3. Run `flutter devices` to confirm it appears
4. Run `flutter run`

### Install APK directly

```bash
# Install on connected device
adb install build/app/outputs/flutter-apk/app-debug.apk

# Or share the APK file directly (enable "Install from unknown sources" on device)
```

### Hot reload during development

```bash
flutter run
# Then press 'r' for hot reload, 'R' for hot restart, 'q' to quit
```

---

## 11. Extending to a Real Backend

The app is structured so the data layer can be replaced without touching any UI code.

### Step 1 — Create a Repository interface

```dart
abstract interface class LoadRepository {
  Future<LoadModel?> fetchActiveLoad(String driverId);
  Future<List<LoadModel>> fetchLoadHistory(String driverId);
  Future<void> confirmArrival(String loadId, String stopId);
}
```

### Step 2 — Implement for your API

```dart
final class ApiLoadRepository implements LoadRepository {
  final http.Client _client;
  const ApiLoadRepository(this._client);

  @override
  Future<LoadModel?> fetchActiveLoad(String driverId) async {
    final response = await _client.get(
      Uri.parse('https://api.routeiq.com/v1/drivers/$driverId/active-load'),
    );
    if (response.statusCode == 404) return null;
    return LoadModel.fromJson(jsonDecode(response.body));
  }
  // ...
}
```

### Step 3 — Wire with Provider

```dart
// In main.dart, replace:
runApp(const RouteIQDriverApp());

// With:
runApp(
  MultiProvider(
    providers: [
      Provider<LoadRepository>(create: (_) => ApiLoadRepository(http.Client())),
      Provider<HosRepository>(create: (_) => ApiHosRepository()),
    ],
    child: const RouteIQDriverApp(),
  ),
);
```

### Step 4 — Update screens to read from provider

```dart
// In HomeScreen:
final loadRepo = context.read<LoadRepository>();
final load = await loadRepo.fetchActiveLoad(driverId);
```

No changes to any widget layout code are required.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `go_router` | ^13.2.0 | Declarative URL-based navigation |
| `provider` | ^6.1.2 | Lightweight dependency injection |
| `intl` | ^0.19.0 | Date/time formatting |
| `cupertino_icons` | ^1.0.6 | iOS-style icon set |

---

## License

Proprietary — RouteIQ TMS. All rights reserved.
