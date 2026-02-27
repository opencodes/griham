import 'package:flutter/material.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  List<Transaction> _transactions = [];
  bool _loading = true;
  double _totalIncome = 0;
  double _totalExpense = 0;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    try {
      final response = await ApiService.get('/finance/transactions');
      setState(() {
        _transactions = (response['data'] as List)
            .map((e) => Transaction.fromJson(e))
            .toList();
        _totalIncome = _transactions
            .where((t) => t.type == 'income')
            .fold(0, (sum, t) => sum + t.amount);
        _totalExpense = _transactions
            .where((t) => t.type == 'expense')
            .fold(0, (sum, t) => sum + t.amount);
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _showForm([Transaction? transaction]) {
    final amountController =
        TextEditingController(text: transaction?.amount.toString());
    final categoryController =
        TextEditingController(text: transaction?.category);
    final descController =
        TextEditingController(text: transaction?.description);
    final dateController = TextEditingController(
        text: transaction?.transactionDate.toIso8601String().split('T')[0] ?? DateTime.now().toString().split(' ')[0]);
    String type = transaction?.type ?? 'expense';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title:
            Text(transaction == null ? 'Add Transaction' : 'Edit Transaction'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: type,
                items: ['income', 'expense']
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => type = v!,
                decoration: const InputDecoration(labelText: 'Type'),
              ),
              TextField(
                  controller: amountController,
                  decoration: const InputDecoration(labelText: 'Amount'),
                  keyboardType: TextInputType.number),
              TextField(
                  controller: categoryController,
                  decoration: const InputDecoration(labelText: 'Category')),
              TextField(
                  controller: descController,
                  decoration: const InputDecoration(labelText: 'Description')),
              TextField(
                  controller: dateController,
                  decoration:
                      const InputDecoration(labelText: 'Date (YYYY-MM-DD)')),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final data = Transaction(
                id: transaction?.id ?? '',
                type: type,
                amount: double.parse(amountController.text),
                category: categoryController.text,
                description: descController.text,
                transactionDate: DateTime.parse(dateController.text),
              ).toJson();

              if (transaction == null) {
                await ApiService.post('/finance/transactions', data);
              } else {
                await ApiService.put(
                    '/finance/transactions/${transaction.id}', data);
              }

              if (mounted) {
                Navigator.pop(context);
                _loadTransactions();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteTransaction(String id) async {
    await ApiService.delete('/finance/transactions/$id');
    _loadTransactions();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Finance')),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.blue.shade50,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Income', style: TextStyle(fontSize: 16)),
                    Text('₹${_totalIncome.toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.green)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Expense', style: TextStyle(fontSize: 16)),
                    Text('₹${_totalExpense.toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.red)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Balance', style: TextStyle(fontSize: 16)),
                    Text(
                        '₹${(_totalIncome - _totalExpense).toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _transactions.length,
                    itemBuilder: (context, i) {
                      final txn = _transactions[i];
                      return ListTile(
                        leading: Icon(
                          txn.type == 'income'
                              ? Icons.arrow_downward
                              : Icons.arrow_upward,
                          color:
                              txn.type == 'income' ? Colors.green : Colors.red,
                        ),
                        title: Text(txn.category),
                        subtitle:
                            Text('${txn.description} • ${txn.transactionDate.toIso8601String().split('T')[0]}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('₹${txn.amount.toStringAsFixed(2)}',
                                style: TextStyle(
                                    fontSize: 16,
                                    color: txn.type == 'income'
                                        ? Colors.green
                                        : Colors.red)),
                            IconButton(
                                icon: const Icon(Icons.edit, size: 20),
                                onPressed: () => _showForm(txn)),
                            IconButton(
                                icon: const Icon(Icons.delete, size: 20),
                                onPressed: () => _deleteTransaction(txn.id!)),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
