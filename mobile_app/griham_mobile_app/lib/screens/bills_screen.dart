import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finance_provider.dart';

class BillsScreen extends StatelessWidget {
  const BillsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final financeProvider = Provider.of<FinanceProvider>(context);
    final bills = financeProvider.bills;

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
                          color: isPaid
                              ? Colors.green
                              : isOverdue
                                  ? Colors.red
                                  : Colors.orange,
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
                                color: isPaid
                                    ? Colors.green.withOpacity(0.2)
                                    : isOverdue
                                        ? Colors.red.withOpacity(0.2)
                                        : Colors.orange.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isPaid
                                    ? 'Paid'
                                    : isOverdue
                                        ? 'Overdue'
                                        : 'Pending',
                                style: TextStyle(
                                  color: isPaid
                                      ? Colors.green
                                      : isOverdue
                                          ? Colors.red
                                          : Colors.orange,
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