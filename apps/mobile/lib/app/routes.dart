// =============================================================================
// FILE: routes.dart
// PURPOSE: Centralised navigation — all route names and GoRouter config.
//          No inline Navigator.push() calls anywhere in the app.
//
// NASA RULE 1 — simple, flat routing tree; no recursive or dynamic paths.
// NASA RULE 3 — route name strings are compile-time const.
// =============================================================================

import 'package:go_router/go_router.dart';

import '../features/auth/screens/splash_screen.dart';
import '../features/auth/screens/activate_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/loads/screens/loads_list_screen.dart';
import '../features/loads/screens/load_detail_screen.dart';
import '../features/loads/screens/arrive_stop_screen.dart';
import '../features/loads/screens/delivery_screen.dart';
import '../features/documents/screens/documents_screen.dart';
import '../features/messages/screens/conversations_screen.dart';
import '../features/messages/screens/chat_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/hos_log_screen.dart';
import '../features/profile/screens/settlements_screen.dart';
import '../features/profile/screens/settings_screen.dart';
import '../shared/widgets/main_shell.dart';

/// All route path constants — prevents magic strings in widget code.
abstract final class AppRoutes {
  static const String splash         = '/';
  static const String activate       = '/activate';

  // Main shell routes (bottom nav)
  static const String home           = '/home';
  static const String loads          = '/loads';
  static const String loadDetail     = '/loads/:id';
  static const String arriveStop     = '/loads/:id/arrive';
  static const String delivery       = '/loads/:id/delivery';
  static const String documents      = '/documents';
  static const String conversations  = '/messages';
  static const String chat           = '/messages/:id';
  static const String profile        = '/profile';
  static const String hosLog         = '/profile/hos';
  static const String settlements    = '/profile/settlements';
  static const String settings       = '/profile/settings';
}

/// Builds the app-wide GoRouter instance.
GoRouter buildRouter() {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    routes: [
      // ── Auth (no shell) ───────────────────────────────────────────────────
      GoRoute(
        path:    AppRoutes.splash,
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path:    AppRoutes.activate,
        builder: (_, __) => const ActivateScreen(),
      ),

      // ── Main shell with bottom nav ─────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path:    AppRoutes.home,
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path:    AppRoutes.loads,
            builder: (_, __) => const LoadsListScreen(),
            routes: [
              GoRoute(
                path:    ':id',
                builder: (context, state) =>
                    LoadDetailScreen(loadId: state.pathParameters['id']!),
                routes: [
                  GoRoute(
                    path:    'arrive',
                    builder: (context, state) =>
                        ArriveStopScreen(loadId: state.pathParameters['id']!),
                  ),
                  GoRoute(
                    path:    'delivery',
                    builder: (context, state) =>
                        DeliveryScreen(loadId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path:    AppRoutes.documents,
            builder: (_, __) => const DocumentsScreen(),
          ),
          GoRoute(
            path:    AppRoutes.conversations,
            builder: (_, __) => const ConversationsScreen(),
            routes: [
              GoRoute(
                path:    ':id',
                builder: (context, state) =>
                    ChatScreen(conversationId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path:    AppRoutes.profile,
            builder: (_, __) => const ProfileScreen(),
            routes: [
              GoRoute(
                path:    'hos',
                builder: (_, __) => const HosLogScreen(),
              ),
              GoRoute(
                path:    'settlements',
                builder: (_, __) => const SettlementsScreen(),
              ),
              GoRoute(
                path:    'settings',
                builder: (_, __) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
