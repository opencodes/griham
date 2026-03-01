import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_sms_inbox/flutter_sms_inbox.dart';
import 'dart:convert';

class SmsEntry {
  final String? address;
  final String? body;
  final int? date;

  SmsEntry({this.address, this.body, this.date});
}

class SmsProcessResult {
  final bool success;
  final bool duplicate;
  final String message;

  const SmsProcessResult({
    required this.success,
    required this.duplicate,
    required this.message,
  });
}

final SmsQuery _smsQuery = SmsQuery();
const String _processedSmsKey = 'processed_sms_fingerprints_v1';
const int _processedSmsMaxEntries = 1000;

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

  if (!_isAllowedSender(message.sender)) {
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

String _smsFingerprint({
  String? sender,
  String? body,
  int? date,
}) {
  final normalizedSender =
      (sender ?? '').toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  final normalizedBody =
      (body ?? '').trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  return '$normalizedSender|${date ?? 0}|$normalizedBody';
}

Future<List<SmsEntry>> getInboxSms() async {
  final prefs = await SharedPreferences.getInstance();
  final processed = prefs.getStringList(_processedSmsKey)?.toSet() ?? <String>{};
  final messages = await _smsQuery.querySms(
    kinds: [SmsQueryKind.inbox],
    count: 200,
  );

  final filteredMessages = messages.where((m) {
    if (!_isLikelyFinancialSms(m)) {
      return false;
    }
    final fingerprint = _smsFingerprint(
      sender: m.sender,
      body: m.body,
      date: m.date?.millisecondsSinceEpoch,
    );
    return !processed.contains(fingerprint);
  }).toList();
  debugPrint(
      'SMS filter: ${filteredMessages.length}/${messages.length} messages matched financial rules');

  return filteredMessages
      .map((m) => SmsEntry(
            address: m.sender,
            body: m.body,
            date: m.date?.millisecondsSinceEpoch,
          ))
      .toList();
}

Future<SmsProcessResult> callApi(SmsEntry sms) async {
  final smsBody = sms.body?.trim();
  if (smsBody == null || smsBody.isEmpty) {
    return const SmsProcessResult(
      success: false,
      duplicate: false,
      message: 'SMS body is empty',
    );
  }

  final prefs = await SharedPreferences.getInstance();
  final familyId = prefs.getString('family_id');
  if (familyId == null) {
    debugPrint('family_id not found in shared preferences');
    return const SmsProcessResult(
      success: false,
      duplicate: false,
      message: 'Family not selected',
    );
  }

  final fingerprint = _smsFingerprint(
    sender: sms.address,
    body: smsBody,
    date: sms.date,
  );
  final processed = prefs.getStringList(_processedSmsKey)?.toSet() ?? <String>{};
  if (processed.contains(fingerprint)) {
    debugPrint('Skipping duplicate SMS processing for fingerprint: $fingerprint');
    return const SmsProcessResult(
      success: true,
      duplicate: true,
      message: 'SMS already processed',
    );
  }

  final response = await ApiService.parseSMS(familyId, smsBody);
  if (response.statusCode == 200 || response.statusCode == 201) {
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final data = decoded['data'];
    final status = data is Map<String, dynamic> ? (data['status']?.toString() ?? '') : '';
    final isDuplicate = status.toLowerCase() == 'duplicate';
    debugPrint('Successfully parsed SMS. Parsed data: $data');
    processed.add(fingerprint);
    if (processed.length > _processedSmsMaxEntries) {
      final trimmed = processed.toList().sublist(processed.length - _processedSmsMaxEntries);
      await prefs.setStringList(_processedSmsKey, trimmed);
    } else {
      await prefs.setStringList(_processedSmsKey, processed.toList());
    }
    return SmsProcessResult(
      success: true,
      duplicate: isDuplicate,
      message: isDuplicate ? 'SMS already processed' : 'Transaction created',
    );
  } else {
    debugPrint('Failed to parse SMS: ${response.statusCode}');
    return SmsProcessResult(
      success: false,
      duplicate: false,
      message: 'API call failed (${response.statusCode})',
    );
  }
}
