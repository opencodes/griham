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

// ── Last-processed timestamp ────────────────────────────────────────────────
// A single int (ms since epoch) stored in prefs.
// All SMS on or before this timestamp are never shown again.
const String _lastProcessedTimestampKey = 'sms_last_processed_up_to';

/// Returns the stored cutoff (ms since epoch), or 0 if none has been saved yet.
Future<int> getLastProcessedTimestamp() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getInt(_lastProcessedTimestampKey) ?? 0;
}

/// Advance the cutoff to [millis] (typically end-of-day ms for the last
/// fully-processed day).
Future<void> saveLastProcessedTimestamp(int millis) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_lastProcessedTimestampKey, millis);
  debugPrint('SMS cutoff advanced to $millis');
}

// ── Bank sender allow-list ────────────────────────────────────────────────────
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
  if (sender == null || sender.trim().isEmpty) return false;
  final normalized = sender.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  return _bankSenderAllowlist.any((token) => normalized.contains(token));
}

bool _isLikelyFinancialSms(SmsMessage message) {
  final body = message.body?.trim();
  if (body == null || body.isEmpty) return false;
  if (!_isAllowedSender(message.sender)) return false;
  if (_otpOrPromoRegex.hasMatch(body)) return false;
  if (!_transactionKeywordRegex.hasMatch(body)) return false;
  if (!_amountRegex.hasMatch(body)) return false;
  return true;
}

/// Loads unprocessed financial SMS from the inbox.
///
/// Only returns messages whose timestamp is **strictly after** the stored
/// cutoff ([_lastProcessedTimestampKey]).
Future<List<SmsEntry>> getInboxSms() async {
  final prefs = await SharedPreferences.getInstance();
  final cutoff = prefs.getInt(_lastProcessedTimestampKey) ?? 0;

  final messages = await _smsQuery.querySms(
    kinds: [SmsQueryKind.inbox],
    count: 200,
  );

  final filteredMessages = messages.where((m) {
    final msgMillis = m.date?.millisecondsSinceEpoch ?? 0;

    // ① Drop everything on or before the fully-processed cutoff.
    if (msgMillis <= cutoff) return false;

    // ② Apply financial-SMS heuristic.
    if (!_isLikelyFinancialSms(m)) return false;
    return true;
  }).toList();

  debugPrint(
    'SMS filter: ${filteredMessages.length}/${messages.length} messages '
    'passed (cutoff=$cutoff)',
  );

  return filteredMessages
      .map(
        (m) => SmsEntry(
          address: m.sender,
          body: m.body,
          date: m.date?.millisecondsSinceEpoch,
        ),
      )
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

  final response = await ApiService.parseSMS(familyId, smsBody);
  if (response.statusCode == 200 || response.statusCode == 201) {
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final data = decoded['data'];
    final status = data is Map<String, dynamic>
        ? (data['status']?.toString() ?? '')
        : '';
    final isDuplicate = status.toLowerCase() == 'duplicate';
    debugPrint('Successfully parsed SMS. data: $data');

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
