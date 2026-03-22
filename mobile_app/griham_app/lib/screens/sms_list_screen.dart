import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/finance_provider.dart';
import 'sms_platform_mobile.dart'
    if (dart.library.html) 'sms_platform_stub.dart';

/// Groups [messages] into an ordered list of items suitable for a ListView.
///
/// Each group contains a date-header string followed by [SmsEntry] items.
/// The returned list alternates between [String] (date label) and [SmsEntry].
List<Object> _buildGroupedList(List<SmsEntry> messages) {
  if (messages.isEmpty) return [];

  // Sort descending: newest first
  final sorted = [...messages]
    ..sort((a, b) {
      final da = a.date ?? 0;
      final db = b.date ?? 0;
      return db.compareTo(da);
    });

  final result = <Object>[];
  String? lastLabel;

  for (final msg in sorted) {
    final label = _dateLabel(msg.date);
    if (label != lastLabel) {
      result.add(label); // date-header sentinel
      lastLabel = label;
    }
    result.add(msg);
  }

  return result;
}

/// Returns a human-readable date label for a millisecond timestamp.
String _dateLabel(int? millis) {
  if (millis == null) return 'Unknown Date';
  final date = DateTime.fromMillisecondsSinceEpoch(millis);
  final today = DateTime.now();
  final yesterday = today.subtract(const Duration(days: 1));

  if (_isSameDay(date, today)) return 'Today';
  if (_isSameDay(date, yesterday)) return 'Yesterday';
  return DateFormat('EEE, d MMM yyyy').format(date);
}

bool _isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

// ---------------------------------------------------------------------------

class SmsListScreen extends StatefulWidget {
  const SmsListScreen({super.key});

  @override
  State<SmsListScreen> createState() => _SmsListScreenState();
}

class _SmsListScreenState extends State<SmsListScreen> {
  List<SmsEntry> _messages = [];
  List<Object> _groupedItems = [];
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
        _groupedItems = _buildGroupedList(_messages);
      });
    }
  }

  void _showResultSnackbar(SmsProcessResult result) {
    final colorScheme = Theme.of(context).colorScheme;
    final Color backgroundColor;
    if (result.success && result.duplicate) {
      backgroundColor = colorScheme.secondary;
    } else if (result.success) {
      backgroundColor = AppColors.success;
    } else {
      backgroundColor = colorScheme.error;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result.message), backgroundColor: backgroundColor),
    );
  }

  Future<void> _callApi(SmsEntry sms) async {
    final result = await callApi(sms);
    _showResultSnackbar(result);
    if (result.success && mounted) {
      final financeProv = Provider.of<FinanceProvider>(context, listen: false);
      await financeProv.refreshFinanceData();
    }
  }

  void _removeSms(SmsEntry message) {
    setState(() {
      _messages.removeWhere(
        (m) =>
            m.date == message.date &&
            m.address == message.address &&
            m.body == message.body,
      );
      _groupedItems = _buildGroupedList(_messages);
    });
  }

  // ── Builders ──────────────────────────────────────────────────────────────

  Widget _buildDateHeader(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: Theme.of(context).colorScheme.surfaceVariant,
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildSmsCard(SmsEntry message) {
    final timeLabel = message.date != null
        ? DateFormat(
            'hh:mm a',
          ).format(DateTime.fromMillisecondsSinceEpoch(message.date!))
        : '';

    return Dismissible(
      key: ValueKey(
        '${message.address}_${message.date}_${message.body.hashCode}',
      ),
      onDismissed: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          if (message.body != null && message.body!.trim().isNotEmpty) {
            await _callApi(message);
          }
        }
        _removeSms(message);
      },
      background: _dismissBackground(
        color: AppColors.success,
        icon: Icons.check_circle_outline,
        alignment: Alignment.centerLeft,
        label: 'Process',
      ),
      secondaryBackground: _dismissBackground(
        color: Theme.of(context).colorScheme.error,
        icon: Icons.delete_outline,
        alignment: Alignment.centerRight,
        label: 'Dismiss',
      ),
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Text(
              (message.address ?? '?').substring(0, 1).toUpperCase(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  message.address ?? 'Unknown',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                timeLabel,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              message.body ?? 'No Content',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          isThreeLine: true,
        ),
      ),
    );
  }

  Widget _dismissBackground({
    required Color color,
    required IconData icon,
    required AlignmentGeometry alignment,
    required String label,
  }) {
    return Container(
      color: color,
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.mark_email_read_outlined,
              size: 64,
              color: colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No new financial SMS found.\nTry again after receiving a bank transaction message.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: colorScheme.outline),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final granted = _permissionStatus == 'granted';

    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Messages'),
        actions: [
          if (granted && _messages.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Chip(
                  label: Text('${_messages.length}'),
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ),
        ],
      ),
      body: !granted
          ? Center(child: Text('Permission Status: $_permissionStatus'))
          : _groupedItems.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              itemCount: _groupedItems.length,
              itemBuilder: (context, index) {
                final item = _groupedItems[index];
                if (item is String) {
                  return _buildDateHeader(item);
                } else if (item is SmsEntry) {
                  return _buildSmsCard(item);
                }
                return const SizedBox.shrink();
              },
            ),
    );
  }
}
