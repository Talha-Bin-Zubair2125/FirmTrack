# FirmTrack

FirmTrack is a Flutter-based employee attendance management app designed to help firms track daily attendance, manage employee records, and streamline HR workflows — all from a clean, consistent mobile interface.

## Features

- 🔐 Login screen for authentication
- 🏠 Home dashboard
- 📅 Calendar view for attendance tracking
- 📷 QR scanner — employees scan a QR code (generated on the admin's web dashboard) to mark attendance
- 🕒 Attendance history
- 👤 Employee profile
- 📜 Rules/policy screen
- 🎨 Consistent, polished UI across all screens
- 💾 Offline-first local data storage with Hive

## Tech Stack

- **Framework:** Flutter
- **Language:** Dart
- **State Management:** setState
- **Storage:** Hive (local database)

## Getting Started

### Prerequisites

- Flutter SDK installed ([installation guide](https://docs.flutter.dev/get-started/install))
- Android Studio or VS Code with Flutter/Dart plugins

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/firmtrack.git

# Navigate into the project directory
cd firmtrack

# Install dependencies
flutter pub get

# Run the app
flutter run
```

## Project Structure

```
lib/
├── main.dart               # App entry point
├── splash_screen.dart      # Splash screen
├── login_screen.dart       # Login/authentication
├── home_screen.dart        # Home dashboard
├── custom_drawer.dart      # Navigation drawer
├── calendar_screen.dart    # Calendar view
├── scanner_screen.dart     # Scans admin's web dashboard QR code to mark attendance
├── history_screen.dart     # Attendance history
├── profile_screen.dart     # Employee profile
└── rules_screen.dart       # Rules/policy screen
```

## Author

**Sheikh Muhammad Tahir**
Flutter Developer | BSCS, NUML Rawalpindi

## License

This project is open source and available under the [MIT License](LICENSE).
