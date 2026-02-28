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

const List<String> _bankSenderAllowlist = [
  'HDFC',
  'HDFCBK',
  'ICICI',
  'ICICIB',
  'SBI',
  'SBIINB',
  'AXIS',
  'AXISBK',
  'KOTAK',
  'KKBK',
  'PNB',
  'CANARA',
  'CNRB',
  'BOB',
  'BANKBARODA',
  'IDFC',
  'IDFCFB',
  'INDUSIND',
  'YESBANK',
  'PAYTM',
  'AIRTEL',
  'AMEX',
  'HSBC',
  'CITI',
  'FEDERAL',
  'RBL',
  'AUFB',
  'IOB',
  'UCO',
  'UNIONBANK',
];

final RegExp _transactionKeywordRegex = RegExp(
  r'\b(debited|credited|spent|upi|imps|neft|emi)\b',
  caseSensitive: false,
);

final RegExp _amountRegex = RegExp(
  r'(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?',
  caseSensitive: false,
);

final RegExp _otpOrPromoRegex = RegExp(
  r'\b(otp|one\s*time\s*password|promo|promotion|offer|coupon|sale|win|winner|reward|points|voucher|lottery|claim|subscribe|unsubscribe)\b',
  caseSensitive: false,
);

Future<bool> requestSmsPermission() async {
  final status = await Permission.sms.request();
  return status.isGranted;
}

bool _isAllowedSender(String? sender) {
  if (sender == null || sender.trim().isEmpty) {
    return false;
  }
  final normalized = sender.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  return _bankSenderAllowlist.any((token) => normalized.contains(token));
}

bool _isLikelyFinancialSms(SmsMessage message) {
  final body = message.body?.trim();
  if (body == null || body.isEmpty) {
    return false;
  }

  if (!_isAllowedSender(message.address)) {
    return false;
  }

  if (_otpOrPromoRegex.hasMatch(body)) {
    return false;
  }

  if (!_transactionKeywordRegex.hasMatch(body)) {
    return false;
  }

  if (!_amountRegex.hasMatch(body)) {
    return false;
  }

  return true;
}

Future<List<SmsEntry>> getInboxSms() async {
  final messages = await _telephony.getInboxSms(
    columns: [SmsColumn.ADDRESS, SmsColumn.BODY, SmsColumn.DATE],
    sortOrder: [OrderBy(SmsColumn.DATE, sort: Sort.DESC)],
  );

  final filteredMessages = messages.where(_isLikelyFinancialSms).toList();
  debugPrint(
      'SMS filter: ${filteredMessages.length}/${messages.length} messages matched financial rules');

  return filteredMessages
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
