// =============================================================================
// FILE: main.dart
// PURPOSE: Application entry point. Wires together theme, router, and the
//          root MaterialApp.router widget.
//
// NASA RULE 1 — single, linear startup sequence; no conditional branches at
//               the top level.
// NASA RULE 3 — app-wide singletons (router, theme) created once and never
//               mutated after construction.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/routes.dart';
import 'app/theme.dart';

void main() {
  // Ensure Flutter engine is fully initialised before touching platform APIs.
  WidgetsFlutterBinding.ensureInitialized();

  // Lock the app to portrait orientation — driver safety requirement.
  SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Extend content behind the system status bar (edge-to-edge).
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor:            Colors.transparent,
    statusBarIconBrightness:   Brightness.light,
    systemNavigationBarColor:  Colors.white,
  ));

  runApp(const RouteIQDriverApp());
}

/// Root widget — stateless because all mutable state lives inside GoRouter
/// and individual screen providers.
class RouteIQDriverApp extends StatefulWidget {
  const RouteIQDriverApp({super.key});

  @override
  State<RouteIQDriverApp> createState() => _RouteIQDriverAppState();
}

class _RouteIQDriverAppState extends State<RouteIQDriverApp> {
  // Router is created once and held here so it is not rebuilt on hot reload.
  late final _router = buildRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title:              'RouteIQ Driver',
      debugShowCheckedModeBanner: false,
      theme:              buildAppTheme(),
      routerConfig:       _router,
    );
  }
}
