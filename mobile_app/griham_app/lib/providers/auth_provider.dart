import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isAuthenticated = false;

  User? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _isAuthenticated;

  AuthProvider() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('auth_token');
    if (saved != null && saved.isNotEmpty) {
      _token = saved;
      _isAuthenticated = true;
      // user info isn't stored; callers can fetch if needed
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await ApiService.login(email, password);
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final data = responseData['data'];
        _token = data['token'];
        _user = User.fromJson(data['user']);
        _isAuthenticated = true;
        // persist token for future API calls and reloads
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

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
      final response = await ApiService.getFamilies();
      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final families = responseData['data'] as List;
        if (families.isNotEmpty) {
          final familyId = families[0]['id'];
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('family_id', familyId);
        }
      }
    } catch (e) {
      debugPrint('Error fetching family ID: $e');
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    _isAuthenticated = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');

    notifyListeners();
  }
}
