import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static String get _baseUrl => dotenv.env['API_URL'] ?? 'http://localhost:8000/api';

  static Future<String?> _getToken() async {
    // Prefer token stored by AuthProvider in shared preferences. This allows
    // us to use the token received on login for subsequent API calls.
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('auth_token');
    if (stored != null && stored.isNotEmpty) {
      // debug log
      debugPrint('ApiService._getToken() – using stored token: $stored');
      return stored;
    }

    // Fall back to dotenv for any existing hard‑coded token (legacy).
    final envTok = dotenv.env['TOKEN'];
    debugPrint('ApiService._getToken() – using env token: $envTok');
    return envTok;
  }

  static Future<http.Response> get(String endpoint) async {
    final url = Uri.parse('$_baseUrl/$endpoint');
    final token = await _getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    debugPrint('ApiService.get <- $url headers: $headers');
    // debug log
    debugPrint('ApiService.get -> $url headers: $headers');
    return http.get(
      url,
      headers: headers,
    );
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> data) async {
    final url = Uri.parse('$_baseUrl/$endpoint');
    final token = await _getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    debugPrint('ApiService.post -> $url headers: $headers body: $data');
    return http.post(
      url,
      headers: headers,
      body: jsonEncode(data),
    );
  }

    static Future<http.Response> login(String email, String password) async {
    return post('auth/login', {'email': email, 'password': password});
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