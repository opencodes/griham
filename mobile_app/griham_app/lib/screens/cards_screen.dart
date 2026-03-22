import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/finance_provider.dart';

class CardsScreen extends StatelessWidget {
  const CardsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final financeProvider = Provider.of<FinanceProvider>(context);
    final colorScheme = Theme.of(context).colorScheme;

    final totalIncome = financeProvider.transactions
      .where((t) => t.type.toLowerCase() == 'income')
      .fold<double>(0, (p, n) => p + n.amount);
    final totalExpense = financeProvider.transactions
      .where((t) => t.type.toLowerCase() == 'expense')
      .fold<double>(0, (p, n) => p + n.amount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cards'),
      ),
      body: Consumer<FinanceProvider>(
        builder: (context, financeProvider, child) {
          if (financeProvider.cards.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          return Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: financeProvider.cards.length,
                  itemBuilder: (context, index) {
                    final card = financeProvider.cards[index];
                    return Card(
                      elevation: 4,
                      margin: const EdgeInsets.all(8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          gradient: LinearGradient(
                            colors: card.cardType == 'credit'
                                ? [colorScheme.secondary, AppColors.warning]
                                : [colorScheme.primary, AppColors.primaryDark],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          title: Text(
                            card.bankName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '**** **** **** ${card.cardNumber.substring(card.cardNumber.length - 4)}',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.75),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                card.cardType.toLowerCase() == 'credit'
                                  ? '₦${totalIncome.toStringAsFixed(2)}'
                                  : '₦${totalExpense.toStringAsFixed(2)}',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          trailing: Text(
                            card.cardType,
                            style: const TextStyle(color: Colors.white),
                          ),
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
        heroTag: 'cards_add',
        onPressed: () {
          // TODO: Implement add card functionality
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
