import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isAuthenticated = false;
  bool _isInitialized = false;

  User? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _isAuthenticated;
  bool get isInitialized => _isInitialized;

  AuthProvider() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('auth_token');
    final savedUserId = prefs.getString('auth_user_id');
    final savedUserName = prefs.getString('auth_user_name');
    final savedUserEmail = prefs.getString('auth_user_email');
    if (saved != null && saved.isNotEmpty) {
      _token = saved;
      _isAuthenticated = true;
      if (savedUserId != null &&
          savedUserName != null &&
          savedUserEmail != null) {
        _user = User(
          id: savedUserId,
          name: savedUserName,
          email: savedUserEmail,
        );
      }
      _isInitialized = true;
      notifyListeners();
      return;
    }

    _isInitialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final deviceInfo = await _getOrCreateDeviceInfo(prefs);

      final response = await ApiService.login(
        email,
        password,
        device: deviceInfo,
      );
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final data = responseData['data'];
        _token = data['token'];
        _user = User.fromJson(data['user']);
        _isAuthenticated = true;
        // persist token for future API calls and reloads
        await prefs.setString('auth_token', _token!);
        await prefs.setString('auth_user_id', _user!.id);
        await prefs.setString('auth_user_name', _user!.name);
        await prefs.setString('auth_user_email', _user!.email);
        await _captureDeviceInfo(prefs);

        // Fetch and save family ID
        await _fetchAndSaveFamilyId();

        notifyListeners();
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  Future<void> _fetchAndSaveFamilyId() async {
    try {
      final response = await ApiService.getCurrentFamily();
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final family = responseData['data'];
        if (family != null && family is Map && family['id'] != null) {
          final familyId = family['id'];
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('family_id', familyId);
        }
      }
    } catch (e) {
      debugPrint('Error fetching family ID: $e');
    }
  }

  Future<void> _captureDeviceInfo(SharedPreferences prefs) async {
    try {
      final os = Platform.operatingSystem;
      final existingName = prefs.getString('device_name');
      final defaultName = switch (os) {
        'android' => 'My Android Device',
        'ios' => 'My iPhone',
        _ => 'My Device',
      };

      await prefs.setBool('device_onboarded', true);
      await prefs.setString(
        'device_id',
        prefs.getString('device_id') ?? '$os-${DateTime.now().millisecondsSinceEpoch}',
      );
      await prefs.setString('device_name', (existingName?.trim().isNotEmpty ?? false) ? existingName! : defaultName);
      await prefs.setString('device_platform', os);
      await prefs.setString('device_os_version', Platform.operatingSystemVersion);
      await prefs.setString(
        'device_registered_at',
        prefs.getString('device_registered_at') ?? DateTime.now().toIso8601String(),
      );
    } catch (_) {
      // Device metadata capture should not block login.
    }
  }

  Future<Map<String, dynamic>> _getOrCreateDeviceInfo(
      SharedPreferences prefs) async {
    final os = Platform.operatingSystem;
    final existingDeviceId = prefs.getString('device_id');
    final existingName = prefs.getString('device_name');

    final deviceId =
        existingDeviceId ?? '$os-${DateTime.now().millisecondsSinceEpoch}';
    final deviceName = (existingName?.trim().isNotEmpty ?? false)
        ? existingName!.trim()
        : (os == 'android'
            ? 'My Android Device'
            : (os == 'ios' ? 'My iPhone' : 'My Device'));
    final osVersion = Platform.operatingSystemVersion;

    await prefs.setString('device_id', deviceId);
    await prefs.setString('device_name', deviceName);
    await prefs.setString('device_platform', os);
    await prefs.setString('device_os_version', osVersion);
    await prefs.setBool('device_onboarded', true);
    await prefs.setString(
      'device_registered_at',
      prefs.getString('device_registered_at') ?? DateTime.now().toIso8601String(),
    );

    return {
      'device_id': deviceId,
      'device_name': deviceName,
      'platform': os,
      'os_version': osVersion,
    };
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    _isAuthenticated = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user_id');
    await prefs.remove('auth_user_name');
    await prefs.remove('auth_user_email');

    notifyListeners();
  }
}
