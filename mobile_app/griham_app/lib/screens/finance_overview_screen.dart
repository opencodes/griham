import 'package:flutter/material.dart';
import 'bank_accounts_screen.dart';
import 'bills_screen.dart';
import 'cards_screen.dart';
import 'transactions_screen.dart';

class FinanceOverviewScreen extends StatelessWidget {
  const FinanceOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Finance Overview'),
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        children: [
          _buildDashboardCard(
            context,
            title: 'Bank Accounts',
            icon: Icons.account_balance,
            color: Colors.blue,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const BankAccountsScreen()),
              );
            },
          ),
          _buildDashboardCard(
            context,
            title: 'Bills',
            icon: Icons.receipt,
            color: Colors.orange,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const BillsScreen()),
              );
            },
          ),
          _buildDashboardCard(
            context,
            title: 'Cards',
            icon: Icons.credit_card,
            color: Colors.purple,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const CardsScreen()),
              );
            },
          ),
          _buildDashboardCard(
            context,
            title: 'Transactions',
            icon: Icons.swap_horiz,
            color: Colors.green,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const TransactionsScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 48,
              color: color,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}