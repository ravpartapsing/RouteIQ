// =============================================================================
// FILE: api_client.dart
// PURPOSE: Thin HTTP client over the RouteIQ API. Screens depend on the
//          result types here, never on package:http directly.
// =============================================================================

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/api_config.dart';

/// A request the server refused, carrying its error code and per-field messages.
final class ApiException implements Exception {
  const ApiException(this.status, this.code, this.message, [this.fields = const {}]);

  final int status;
  final String code;
  final String message;
  final Map<String, String> fields;

  bool get isUnauthorized => status == 401;

  @override
  String toString() => message;
}

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

  /// Sends one request. Throws [ApiException] for any non-2xx answer; network
  /// failures surface as the usual socket/timeout exceptions.
  Future<Map<String, dynamic>?> send(
    String method,
    String path, {
    Object? body,
    String? token,
  }) async {
    final req = http.Request(method, _base.resolve(path));
    if (body != null) {
      req.headers['content-type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    if (token != null) req.headers['authorization'] = 'Bearer $token';

    final res = await http.Response.fromStream(
      await _client.send(req).timeout(ApiConfig.timeout),
    );
    final json = res.body.isEmpty ? null : jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 200 && res.statusCode < 300) return json;

    final err = json?['error'] as Map<String, dynamic>?;
    throw ApiException(
      res.statusCode,
      err?['code'] as String? ?? 'HTTP_${res.statusCode}',
      err?['message'] as String? ?? 'Request failed (${res.statusCode})',
      (err?['fields'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, v.toString())) ?? const {},
    );
  }

  /// Liveness plus feature switches, in one call the Settings screen can show.
  Future<ServerStatus> status({String? token}) async {
    try {
      final health = await send('GET', '/health');
      final config = await send('GET', '/config', token: token);
      return ServerReachable(
        stage:  health?['stage'] as String? ?? 'unknown',
        config: ServerConfig.fromJson(config!),
      );
    } on Exception catch (e) {
      return ServerUnreachable(e.toString());
    }
  }
}
