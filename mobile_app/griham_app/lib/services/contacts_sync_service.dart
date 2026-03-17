import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_service.dart';

class ContactsSyncResult {
  final int totalContacts;
  final int sentContacts;
  final int batches;

  const ContactsSyncResult({
    required this.totalContacts,
    required this.sentContacts,
    required this.batches,
  });
}

class ContactsSyncService {
  static const int _batchSize = 200;

  static Future<ContactsSyncResult> syncAllContacts() async {
    final granted = await FlutterContacts.requestPermission(readonly: true);
    if (!granted) {
      throw StateError('Contacts permission not granted');
    }

    final contacts = await FlutterContacts.getContacts(
      withProperties: true,
      withPhoto: false,
      withThumbnail: false,
    );

    final prefs = await SharedPreferences.getInstance();
    final familyId = prefs.getString('family_id');
    final deviceId = prefs.getString('device_id');

    final serialized = contacts.map((c) => _serializeContact(c)).toList();
    final batches = (serialized.length / _batchSize).ceil();

    int sent = 0;
    for (int offset = 0; offset < serialized.length; offset += _batchSize) {
      final chunk = serialized.skip(offset).take(_batchSize).toList();
      final response = await ApiService.syncContacts(
        contacts: chunk,
        familyId: familyId,
        deviceId: deviceId,
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        debugPrint(
          'Contacts sync failed: ${response.statusCode} ${response.body}',
        );
        throw StateError(
          'Contacts sync failed with status ${response.statusCode}',
        );
      }

      sent += chunk.length;
    }

    return ContactsSyncResult(
      totalContacts: serialized.length,
      sentContacts: sent,
      batches: batches,
    );
  }

  static Map<String, dynamic> _serializeContact(Contact c) {
    String? bestPhone;
    if (c.phones.isNotEmpty) {
      bestPhone = c.phones.first.number.trim();
      if (bestPhone.isEmpty) bestPhone = null;
    }

    String? bestEmail;
    if (c.emails.isNotEmpty) {
      bestEmail = c.emails.first.address.trim();
      if (bestEmail.isEmpty) bestEmail = null;
    }

    final name = (c.displayName).trim();

    return <String, dynamic>{
      'name': name.isEmpty ? null : name,
      'phone': bestPhone,
      'email': bestEmail,
      'raw': kDebugMode ? jsonEncode(_debugRaw(c)) : null,
    }..removeWhere((_, v) => v == null);
  }

  static Map<String, dynamic> _debugRaw(Contact c) {
    return {
      'id': c.id,
      'displayName': c.displayName,
      'phones': c.phones.map((p) => p.number).toList(),
      'emails': c.emails.map((e) => e.address).toList(),
    };
  }
}

