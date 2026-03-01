import 'dart:async';

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

Future<bool> requestSmsPermission() async {
  return false;
}

Future<List<SmsEntry>> getInboxSms() async {
  return [];
}

Future<SmsProcessResult> callApi(SmsEntry sms) async {
  // Stub: not supported on web
  return const SmsProcessResult(
    success: false,
    duplicate: false,
    message: 'SMS processing not supported on web',
  );
}
