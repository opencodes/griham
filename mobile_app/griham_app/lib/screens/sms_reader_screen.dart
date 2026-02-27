import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_sms_inbox/flutter_sms_inbox.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;

class SmsReaderScreen extends StatefulWidget {
  const SmsReaderScreen({super.key});

  @override
  State<SmsReaderScreen> createState() => _SmsReaderScreenState();
}

class _SmsReaderScreenState extends State<SmsReaderScreen> {
  final SmsQuery _query = SmsQuery();
  List<SmsMessage> _messages = [];
  bool _isLoading = false;
  final TextEditingController _tokenController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkPermissionAndLoad();
  }

  Future<void> _checkPermissionAndLoad() async {
    var status = await Permission.sms.status;
    if (status.isDenied) {
      status = await Permission.sms.request();
    }
    
    if (status.isGranted) {
      _loadMessages();
    }
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final messages = await _query.querySms(
        kinds: [SmsQueryKind.inbox],
        count: 50, // Load recent 50 messages
      );
      setState(() => _messages = messages);
    } catch (e) {
      debugPrint('Error loading SMS: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _sendSmsToApi(String smsText) async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter an Authorization Token')),
        );
      }
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('https://api.opencodes.dev/finance/ai/parse-sms/'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'sms_text': smsText,
        }),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              response.statusCode == 200 || response.statusCode == 201
                  ? 'Success: Transaction added' 
                  : 'Error: ${response.statusCode} ${response.body}'
            ),
            backgroundColor: (response.statusCode == 200 || response.statusCode == 201) 
                ? Colors.green 
                : Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Griham SMS Parser'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMessages,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _tokenController,
              decoration: const InputDecoration(
                labelText: 'Auth Token (Bearer)',
                border: OutlineInputBorder(),
                hintText: 'Paste your API token here',
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: ListTile(
                          leading: const Icon(Icons.message, color: Colors.purple),
                          title: Text(message.sender ?? 'Unknown'),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                message.body ?? '',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                message.date?.toString() ?? '',
                                style: const TextStyle(fontSize: 10, color: Colors.grey),
                              ),
                            ],
                          ),
                          trailing: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.purple,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () => _sendSmsToApi(message.body ?? ''),
                            child: const Text('Add'),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}