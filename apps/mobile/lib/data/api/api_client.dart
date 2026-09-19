// =============================================================================
// FILE: api_client.dart
// PURPOSE: Thin HTTP client over the RouteIQ API. Screens depend on the
//          result types here, never on package:http directly.
// =============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';

/// What the server says is switched on — mirrors GET /config.
final class ServerConfig {
  const ServerConfig({
    required this.maps,
    required this.routing,
    required this.mapMatching,
    this.mapStyleUrl,
  });

  final bool maps;
  final bool routing;
  final bool mapMatching;

  /// Null when maps are off, so the app never loads a tile style it will not use.
  final String? mapStyleUrl;

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    final features = json['features'] as Map<String, dynamic>;
    final map = json['map'] as Map<String, dynamic>?;
    return ServerConfig(
      maps:        features['maps'] as bool,
      routing:     features['routing'] as bool,
      mapMatching: features['mapMatching'] as bool,
      mapStyleUrl: map?['styleUrl'] as String?,
    );
  }
}

sealed class ServerStatus {
  const ServerStatus();
}

final class ServerReachable extends ServerStatus {
  const ServerReachable({required this.stage, required this.config});
  final String stage;
  final ServerConfig config;
}

final class ServerUnreachable extends ServerStatus {
  const ServerUnreachable(this.reason);
  final String reason;
}

final class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _base = Uri.parse(baseUrl ?? ApiConfig.baseUrl);

  final http.Client _client;
  final Uri _base;

  String get baseUrl => _base.toString();

  Future<Map<String, dynamic>> _getJson(String path) async {
    final res = await _client.get(_base.resolve(path)).timeout(ApiConfig.timeout);
    if (res.statusCode != 200) {
      throw http.ClientException('HTTP ${res.statusCode} on $path');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Liveness plus feature switches, in one call the Settings screen can show.
  Future<ServerStatus> status() async {
    try {
      final health = await _getJson('/health');
      final config = await _getJson('/config');
      return ServerReachable(
        stage:  health['stage'] as String? ?? 'unknown',
        config: ServerConfig.fromJson(config),
      );
    } on Exception catch (e) {
      return ServerUnreachable(e.toString());
    }
  }
}
