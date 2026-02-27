import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finance_provider.dart';
import 'sms_platform_mobile.dart'
    if (dart.library.html) 'sms_platform_stub.dart';

class SmsListScreen extends StatefulWidget {
  const SmsListScreen({super.key});

  @override
  State<SmsListScreen> createState() => _SmsListScreenState();
}

class _SmsListScreenState extends State<SmsListScreen> {
  List<SmsEntry> _messages = [];
  String _permissionStatus = 'Unknown';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final granted = await requestSmsPermission();
    setState(() {
      _permissionStatus = granted ? 'granted' : 'denied';
    });
    if (granted) {
      final msgs = await getInboxSms();
      setState(() {
        _messages = msgs;
      });
    }
  }

  void _deleteSms(int index) {
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
    final ok = await callApi(smsBody);
    if (ok) {
      _showSuccessSnackbar();
      // refresh provider so credit/debit totals update
      final financeProv = Provider.of<FinanceProvider>(context, listen: false);
      await financeProv.refreshFinanceData();
    } else {
      _showErrorSnackbar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final granted = _permissionStatus == 'granted';
    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Messages'),
      ),
      body: granted
          ? ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];

                return Dismissible(
                  key: ValueKey('${message.address}_${message.date}_${message.body.hashCode}'),
                  onDismissed: (direction) async {
                    if (direction == DismissDirection.startToEnd) {
                      if (message.body != null) {
                        await _callApi(message.body!);
                      }
                    }

                    setState(() {
                      _messages.removeWhere((m) => m.date == message.date && m.address == message.address && m.body == message.body);
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
