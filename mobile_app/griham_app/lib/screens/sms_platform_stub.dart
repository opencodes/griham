import 'dart:async';

class SmsEntry {
  final String? address;
  final String? body;
  final int? date;

  SmsEntry({this.address, this.body, this.date});
}

Future<bool> requestSmsPermission() async {
  return false;
}

Future<List<SmsEntry>> getInboxSms() async {
  return [];
}

Future<bool> callApi(String smsBody) async {
  // Stub: not supported on web
  return false;
}
