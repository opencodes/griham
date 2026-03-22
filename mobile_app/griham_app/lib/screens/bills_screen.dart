import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/finance_provider.dart';

class BillsScreen extends StatelessWidget {
  const BillsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final financeProvider = Provider.of<FinanceProvider>(context);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bills'),
      ),
      body: Consumer<FinanceProvider>(
        builder: (context, financeProvider, child) {
          if (financeProvider.bills.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: financeProvider.bills.length,
                  itemBuilder: (context, index) {
                    final bill = financeProvider.bills[index];
                    final isPaid = bill.status == 'paid';
                    final isOverdue = !isPaid && bill.dueDate.isBefore(DateTime.now());
                    final statusColor = isPaid
                        ? AppColors.success
                        : isOverdue
                            ? colorScheme.error
                            : colorScheme.secondary;

                    return Card(
                      elevation: 4,
                      margin: const EdgeInsets.all(8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: Icon(
                          Icons.receipt,
                          color: statusColor,
                        ),
                        title: Text(
                          bill.billerName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text('Due: ${bill.dueDate.toLocal()}'),
                        trailing: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '₹${bill.amount}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isPaid
                                    ? 'Paid'
                                    : isOverdue
                                        ? 'Overdue'
                                        : 'Pending',
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Implement add bill functionality
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
