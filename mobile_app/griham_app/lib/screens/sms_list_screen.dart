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

  void _showResultSnackbar(SmsProcessResult result) {
    final Color backgroundColor;
    if (result.success && result.duplicate) {
      backgroundColor = Colors.orange;
    } else if (result.success) {
      backgroundColor = Colors.green;
    } else {
      backgroundColor = Colors.red;
    }

    final snackBar = SnackBar(
      content: Text(result.message),
      backgroundColor: backgroundColor,
    );
    ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

  Future<void> _callApi(SmsEntry sms) async {
    final result = await callApi(sms);
    _showResultSnackbar(result);
    if (result.success && mounted) {
      // refresh provider so credit/debit totals update
      final financeProv = Provider.of<FinanceProvider>(context, listen: false);
      await financeProv.refreshFinanceData();
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
          ? (_messages.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Text(
                      'No new financial SMS found.\nTry again after receiving a bank transaction message.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final message = _messages[index];

                    return Dismissible(
                      key: ValueKey('${message.address}_${message.date}_${message.body.hashCode}'),
                      onDismissed: (direction) async {
                        if (direction == DismissDirection.startToEnd) {
                          if (message.body != null && message.body!.trim().isNotEmpty) {
                            await _callApi(message);
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
                ))
          : Center(
              child: Text('Permission Status: $_permissionStatus'),
            ),
    );
  }
}
