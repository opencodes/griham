import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/finance_provider.dart';
import 'finance_overview_screen.dart';
import 'sms_list_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final financeProvider = Provider.of<FinanceProvider>(context);

    double creditTotal = financeProvider.transactions
      .where((t) {
        final type = t.type.toLowerCase();
        return type == 'income' || type == 'credit';
      })
      .fold(0.0, (p, n) => p + n.amount);
    double debitTotal = financeProvider.transactions
      .where((t) {
        final type = t.type.toLowerCase();
        return type == 'expense' || type == 'debit';
      })
      .fold(0.0, (p, n) => p + n.amount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              authProvider.logout();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Welcome, ${authProvider.user?.name ?? 'User'}!', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 20),

              // Cards row
              Row(
                children: [
                  Expanded(
                    child: Card(
                      color: Colors.green[50],
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.arrow_downward, color: Colors.green),
                            const SizedBox(height: 8),
                            const Text('Credit', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            Text('₦${creditTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Card(
                      color: Colors.red[50],
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.arrow_upward, color: Colors.red),
                            const SizedBox(height: 8),
                            const Text('Debit', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            Text('₦${debitTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const FinanceOverviewScreen()),
                  );
                },
                child: const Text('Finance'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'home_add',
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const SmsListScreen()),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
