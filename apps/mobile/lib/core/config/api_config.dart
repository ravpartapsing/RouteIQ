// =============================================================================
// FILE: api_config.dart
// PURPOSE: Where the API lives. Set at build time, never hard-coded:
//
//   flutter build apk --dart-define=API_BASE_URL=https://<id>.execute-api.us-east-1.amazonaws.com
//
// The default reaches a laptop API through `adb reverse tcp:8180 tcp:8180`.
// =============================================================================

abstract final class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8180',
  );

  static const Duration timeout = Duration(seconds: 10);
}
