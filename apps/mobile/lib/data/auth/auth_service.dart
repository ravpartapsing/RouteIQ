// =============================================================================
// FILE: auth_service.dart
// PURPOSE: The driver's session. Drivers have no password: the dispatcher
//          issues a one-time code, the app exchanges it for a long-lived
//          refresh token bound to this device, kept in secure storage.
// =============================================================================

import 'dart:io';
import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';

/// Who is signed in — mirrors the DRIVER branch of GET /v1/me.
final class DriverProfile {
  const DriverProfile({
    required this.id,
    required this.driverCode,
    required this.firstName,
    required this.lastName,
    required this.carrierName,
    required this.carrierCode,
  });

  final String id;
  final String driverCode;
  final String firstName;
  final String lastName;
  final String carrierName;
  final String carrierCode;

  String get fullName => '$firstName $lastName';
  String get initials =>
      '${firstName.isEmpty ? '' : firstName[0]}${lastName.isEmpty ? '' : lastName[0]}'.toUpperCase();
}

final class AuthService extends ChangeNotifier {
  AuthService({ApiClient? api, FlutterSecureStorage? storage})
      : api = api ?? ApiClient(),
        _storage = storage ?? const FlutterSecureStorage();

  final ApiClient api;
  final FlutterSecureStorage _storage;

  static const _kRefresh = 'routeiq.refresh';
  static const _kDevice = 'routeiq.device';

  String? _access;
  DateTime? _accessExpiresAt;
  DriverProfile? _me;
  Future<bool>? _refreshing;

  DriverProfile? get me => _me;
  bool get signedIn => _me != null;

  /// On launch: a stored refresh token means the phone was activated before.
  Future<bool> restore() async {
    if (await _storage.read(key: _kRefresh) == null) return false;
    try {
      if (!await _refresh()) return false;
      await _loadMe();
      return true;
    } on ApiException catch (e) {
      if (e.isUnauthorized) await _clear();
      return false;
    }
  }

  Future<void> activate({
    required String carrierCode,
    required String driverCode,
    required String code,
  }) async {
    final tokens = await api.send('POST', '/v1/auth/driver/activate', body: {
      'carrierCode': carrierCode.trim(),
      'driverCode': driverCode.trim(),
      'code': code.trim(),
      'deviceId': await _deviceId(),
      'deviceName': await _deviceName(),
    });
    await _store(tokens!);
    await _loadMe();
  }

  Future<void> logout() async {
    final rt = await _storage.read(key: _kRefresh);
    await _clear();
    if (rt != null) {
      try {
        await api.send('POST', '/v1/auth/logout', body: {'refreshToken': rt});
      } on Exception {
        // Already signed out locally; the server session will expire on its own.
      }
    }
  }

  /// A valid access token, refreshing first if it is about to expire.
  Future<String?> accessToken() async {
    final exp = _accessExpiresAt;
    if (_access != null && exp != null && exp.isAfter(DateTime.now().add(const Duration(seconds: 30)))) {
      return _access;
    }
    return await _refresh() ? _access : null;
  }

  // Concurrent callers share one refresh: two refreshes with the same token
  // would look like token theft to the server and sign the driver out.
  Future<bool> _refresh() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final rt = await _storage.read(key: _kRefresh);
    if (rt == null) return false;
    try {
      final tokens = await api.send('POST', '/v1/auth/refresh', body: {'refreshToken': rt});
      await _store(tokens!);
      return true;
    } on ApiException catch (e) {
      if (e.isUnauthorized) await _clear();
      rethrow;
    }
  }

  Future<void> _store(Map<String, dynamic> tokens) async {
    _access = tokens['accessToken'] as String;
    _accessExpiresAt = DateTime.now().add(Duration(seconds: tokens['expiresIn'] as int));
    await _storage.write(key: _kRefresh, value: tokens['refreshToken'] as String);
  }

  Future<void> _loadMe() async {
    final json = await api.send('GET', '/v1/me', token: await accessToken());
    final p = json!['principal'] as Map<String, dynamic>;
    final t = json['tenant'] as Map<String, dynamic>;
    if (p['kind'] != 'DRIVER') {
      await _clear();
      throw const ApiException(403, 'NOT_A_DRIVER', 'This app is for drivers.');
    }
    _me = DriverProfile(
      id: p['id'] as String,
      driverCode: p['driverCode'] as String,
      firstName: p['firstName'] as String,
      lastName: p['lastName'] as String,
      carrierName: t['name'] as String,
      carrierCode: t['carrierCode'] as String,
    );
    notifyListeners();
  }

  Future<void> _clear() async {
    _access = null;
    _accessExpiresAt = null;
    _me = null;
    await _storage.delete(key: _kRefresh);
    notifyListeners();
  }

  /// Random per-install id. Reinstalling the app is a new device, which is
  /// the point: the dispatcher sees exactly which phone holds the session.
  Future<String> _deviceId() async {
    final existing = await _storage.read(key: _kDevice);
    if (existing != null) return existing;
    final rnd = Random.secure();
    final id = List.generate(16, (_) => rnd.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
    await _storage.write(key: _kDevice, value: id);
    return id;
  }

  Future<String> _deviceName() async {
    try {
      final info = DeviceInfoPlugin();
      if (Platform.isAndroid) return (await info.androidInfo).model;
      if (Platform.isIOS) return (await info.iosInfo).utsname.machine;
    } on Exception {
      // Fall through to a generic name.
    }
    return Platform.operatingSystem;
  }
}
