import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String _baseUrl = 'https://griham.opencodes.dev/api';

  static Future<String?> _getToken() async {
    // Prefer token stored by AuthProvider in shared preferences. This allows
    // us to use the token received on login for subsequent API calls.
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('auth_token');
    if (stored != null && stored.isNotEmpty) {
      debugPrint('ApiService._getToken() – using stored token');
      return stored;
    }
    return null;
  }

  static Future<http.Response> get(String endpoint) async {
    final url = Uri.parse('$_baseUrl/$endpoint');
    final token = await _getToken();
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    debugPrint('ApiService.get -> $url');
    return http.get(url, headers: headers);
  }

  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    final url = Uri.parse('$_baseUrl/$endpoint');
    final token = await _getToken();
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    debugPrint('ApiService.post -> $url headers: $headers body: $data');
    return http.post(url, headers: headers, body: jsonEncode(data));
  }

  static Future<http.Response> getFamilies() async {
    return get('families');
  }

  static Future<http.Response> login(
    String email,
    String password, {
    Map<String, dynamic>? device,
  }) async {
    final payload = <String, dynamic>{'email': email, 'password': password};
    if (device != null && device.isNotEmpty) {
      payload['device'] = device;
    }
    return post('auth/login', payload);
  }

  static Future<http.Response> getBankAccounts(String familyId) async {
    return get('finance/accounts/$familyId');
  }

  static Future<http.Response> getBills(String familyId) async {
    return get('finance/bills/$familyId');
  }

  static Future<http.Response> getCards(String familyId) async {
    return get('finance/cards/$familyId');
  }

  static Future<http.Response> getTransactions(String familyId) async {
    return get('finance/transactions/$familyId');
  }

  static Future<http.Response> parseSMS(String familyId, String smsText) async {
    return post('finance/ai/parse-sms/$familyId', {'sms_text': smsText});
  }
}
