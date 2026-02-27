import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:telephony/telephony.dart';
import 'dart:convert';

class SmsEntry {
  final String? address;
  final String? body;
  final int? date;

  SmsEntry({this.address, this.body, this.date});
}

final Telephony _telephony = Telephony.instance;

Future<bool> requestSmsPermission() async {
  final status = await Permission.sms.request();
  return status.isGranted;
}

Future<List<SmsEntry>> getInboxSms() async {
  final messages = await _telephony.getInboxSms(
    columns: [SmsColumn.ADDRESS, SmsColumn.BODY, SmsColumn.DATE],
    sortOrder: [OrderBy(SmsColumn.DATE, sort: Sort.DESC)],
  );

  return messages
      .map((m) => SmsEntry(address: m.address, body: m.body, date: m.date))
      .toList();
}

Future<bool> callApi(String smsBody) async {
  final prefs = await SharedPreferences.getInstance();
  final familyId = prefs.getString('family_id');
  if (familyId == null) {
    debugPrint('family_id not found in shared preferences');
    return false;
  }
  final response = await ApiService.parseSMS(familyId, smsBody);
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body)['data'] as List;
    debugPrint('Successfully parsed SMS. Parsed data: $data');
  } else {
    debugPrint('Failed to parse SMS: ${response.statusCode}');
  }
  return response.statusCode == 200 || response.statusCode == 201;
}
