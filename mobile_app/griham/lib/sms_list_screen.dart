import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:telephony/telephony.dart';

const token =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI5MWU2YjJhNC1lNTYzLTRiZTctYTU0NC03MGYxMWZjNGNjODEiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsImlhdCI6MTc3MTk1MDgyOSwiZXhwIjoxNzcyMDM3MjI5fQ.N_5oQsfsCu6pFrP-ny0tjqhi8PEsgV3O5M6_2kmY6XY";
// curl --location 'https://griham.opencodes.dev/auth/login' \
// --header 'Content-Type: application/json' \
// --data-raw '{
//     "email": "admin@gmail.com",
//     "password": "Admin123"
// }'

const apiUrl =
    'https://griham.opencodes.dev/api/finance/ai/parse-sms/679478a8-65b9-4f76-8a35-dd9b3b080073';

class SmsListScreen extends StatefulWidget {
  const SmsListScreen({super.key});

  @override
  State<SmsListScreen> createState() => _SmsListScreenState();
}

class _SmsListScreenState extends State<SmsListScreen> {
  final Telephony telephony = Telephony.instance;
  List<SmsMessage> _messages = [];
  String _permissionStatus = 'Unknown';

  @override
  void initState() {
    super.initState();
    _requestSmsPermission();
  }

  Future<void> _requestSmsPermission() async {
    final status = await Permission.sms.request();
    setState(() {
      _permissionStatus = status.toString();
      if (status.isGranted) {
        _getSms();
      }
    });
  }

  Future<void> _getSms() async {
    final messages = await telephony.getInboxSms(
      columns: [SmsColumn.ADDRESS, SmsColumn.BODY],
      sortOrder: [
        OrderBy(SmsColumn.DATE, sort: Sort.DESC),
      ],
    );

    setState(() {
      _messages = [...messages]; // ✅ fixed
    });
  }

  void _deleteSms(int index) {
    // setState(() {
    //   _messages.removeAt(index);
    // });
    print("Delete SMS at index: $index");
  }



  void _showSuccessSnackbar() {
    const snackBar = SnackBar(
      content: Text('API call successful'),
      backgroundColor: Colors.green,
    );
    ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

  void _showErrorSnackbar() {
    const snackBar = SnackBar(
      content: Text('API call failed'),
      backgroundColor: Colors.red,
    );
    ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

    Future<void> _callApi(String smsBody) async {
    final url = Uri.parse(apiUrl);
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'sms_text': smsBody,
      }),
    );
    print(  'API response status: ${response.statusCode}');
    if (response.statusCode == 200 || response.statusCode == 201) {
      print('API call successful');
      _showSuccessSnackbar();
    } else {
      print(response.body);
      print('API call failed with status: ${response.statusCode}');
      _showErrorSnackbar();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Messages'),
      ),
      body: _permissionStatus == PermissionStatus.granted.toString()
          ? ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];

                return Dismissible(
                  key: ValueKey(
                    '${message.address}_${message.date}_${message.body.hashCode}',
                  ), // ✅ truly unique
                  onDismissed: (direction) {
                    if (direction == DismissDirection.startToEnd) {
                      if (message.body != null) {
                        _callApi(message.body!);
                      }
                    }

                    setState(() {
                      _messages.removeWhere((m) =>
                          m.date == message.date &&
                          m.address == message.address &&
                          m.body == message.body);
                    });
                  },
                  background: Container(color: Colors.green),
                  secondaryBackground: Container(color: Colors.red),
                  child: Card(
                    child: ListTile(
                      title: Text(message.address ?? 'Unknown Address'),
                      subtitle: Text(message.body ?? 'No Content'),
                    ),
                  ),
                );
              },
            )
          : Center(
              child: Text('Permission Status: $_permissionStatus'),
            ),
    );
  }


}
