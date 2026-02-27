import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/finance_provider.dart';
import '../widgets/common/app_widgets.dart';
import '../widgets/finance/finance_widgets.dart';
import 'sms_list_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedTabIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, FinanceProvider>(
      builder: (context, authProvider, financeProvider, child) {
        return Scaffold(
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SmsListScreen()),
              );
            },
            child: const Icon(Icons.add),
          ),
          body: SafeArea(
            child: IndexedStack(
              index: _selectedTabIndex,
              children: [
                _buildDashboardTab(context, authProvider, financeProvider),
                _buildAccountsTab(context, financeProvider),
                _buildTransactionsTab(context, financeProvider),
                _buildAnalyticsTab(context, financeProvider),
                _buildSettingsTab(context, authProvider),
              ],
            ),
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _selectedTabIndex,
            onTap: (index) => setState(() => _selectedTabIndex = index),
            type: BottomNavigationBarType.fixed,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.account_balance), label: 'Accounts'),
              BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Transactions'),
              BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'Analytics'),
              BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDashboardTab(
    BuildContext context,
    AuthProvider authProvider,
    FinanceProvider financeProvider,
  ) {
    final user = authProvider.user;
    final totalBalance = financeProvider.bankAccounts.fold<double>(
      0,
      (prev, account) => prev + account.balance,
    );

    final incomeTotal = financeProvider.transactions
      .where((t) => t.type.toLowerCase() == 'income')
      .fold<double>(0, (p, n) => p + n.amount);
    final expenseTotal = financeProvider.transactions
      .where((t) => t.type.toLowerCase() == 'expense')
      .fold<double>(0, (p, n) => p + n.amount);

    return SingleChildScrollView(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hello, ${user?.name.split(' ').first ?? 'User'}',
                    style: AppTypography.heading1.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    'Welcome back',
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  // Load sample button for testing
                  IconButton(
                    icon: const Icon(Icons.cloud_download),
                    tooltip: 'Load sample transactions',
                    onPressed: () async {
                      const sampleJson = r'''{"success":true,"message":"Success","data":[{"id":"7d5577d4-1568-42fa-81ed-45518a6859f6","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"income","category":"Salary","amount":"11053.38","description":"CreditPro Payment","transaction_date":"2026-03-09","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:01:51","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"36cfe520-5979-408e-9ff8-29db90fe16e7","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"316.00","description":"Transaction at FASHNEAR TECHNOLOGIES PRI","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:03:39","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"2e9a730d-b8cf-4832-b459-c04a2db7bcba","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"income","category":"Cashback","amount":"250.00","description":"Cashback received on IDFC FIRST Bank Credit Card","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:03:08","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"65e5bb1c-0038-489c-a687-6cf123542eb6","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"316.00","description":"FASHNEAR TECHNOLOGIES PRI","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:01:26","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"546a7a20-2017-4a54-97dd-b7794024b96b","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"316.00","description":"FASHNEAR TECHNOLOGIES PRI","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:58:02","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"9bf01b37-1021-4ddc-af29-dde470fa70b2","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"income","category":"Other","amount":"250.00","description":"Cashback on Credit Card","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:57:54","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"e7bbbda2-5cdd-4700-aef1-c927f9ef0b0c","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"income","category":"Other","amount":"250.00","description":"Cashback received","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:53:52","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"a13a0396-2316-479d-904b-dca8b2208e12","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"income","category":"Cashback","amount":"250.00","description":"Cashback received","transaction_date":"2026-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:53:43","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"43044932-a584-4e85-8358-50929c0f3ccc","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"1615.00","description":"FASHNEAR TECHNOLOGIES PRI","transaction_date":"2026-02-23","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:52:42","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"3c8b91f3-e278-4cab-985f-8a58ec766fd9","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Food","amount":"2032.00","description":"DELTICIOUS PURCHASE ON CREDIT CARD","transaction_date":"2026-02-22","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:53:00","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"25a1e8cc-8fc6-4677-ab02-a441544e82d6","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Food","amount":"323.00","description":"Spent at Swiggy","transaction_date":"2026-02-21","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 16:53:15","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"b403b593-8f11-4992-bbff-40f0cf82c2d6","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"1332.00","description":"HDFC Bank Card","transaction_date":"2024-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:03:49","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"},{"id":"23883f98-8ea8-436f-a1cc-90edcc66acbd","family_id":"679478a8-65b9-4f76-8a35-dd9b3b080073","account_id":"6b704083-44d3-4971-b012-dca4009dc5a1","type":"expense","category":"Shopping","amount":"1332.00","description":"EKART purchase on HDFC Bank Card","transaction_date":"2024-02-24","created_by":"91e6b2a4-e563-4be7-a544-70f11fc4cc81","created_at":"2026-02-24 17:01:41","account_name":"Test","bank_name":"HDFC","created_by_name":"John Doe"}]}''';
                      final financeProv = Provider.of<FinanceProvider>(context, listen: false);
                      await financeProv.loadTransactionsFromJson(sampleJson);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sample transactions loaded')));
                    },
                  ),
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.primary.withOpacity(0.2),
                    child: const Icon(Icons.notifications),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: AppSpacing.lg),

          // Total Balance Widget
          BalanceWidget(
            totalBalance: totalBalance,
          ),
          SizedBox(height: AppSpacing.lg),

          // Credit / Debit summary cards (moved from HomeScreen)
          Row(
            children: [
              Expanded(
                child: AppCard(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.arrow_downward, color: AppColors.success),
                            SizedBox(width: AppSpacing.sm),
                            Text('Income', style: AppTypography.subtitle1),
                          ],
                        ),
                        SizedBox(height: AppSpacing.sm),
                        Text('₹ ${incomeTotal.toStringAsFixed(2)}', style: AppTypography.heading2),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppCard(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.arrow_upward, color: AppColors.danger),
                            SizedBox(width: AppSpacing.sm),
                            Text('Expense', style: AppTypography.subtitle1),
                          ],
                        ),
                        SizedBox(height: AppSpacing.sm),
                        Text('₹ ${expenseTotal.toStringAsFixed(2)}', style: AppTypography.heading2),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),


          // Recent Transactions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Transactions',
                style: AppTypography.subtitle1.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                'See all',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.md),
          ...financeProvider.transactions.take(3).map(
                (transaction) => Padding(
                  padding: EdgeInsets.only(bottom: AppSpacing.md),
                  child: TransactionItem(
                    title: transaction.description,
                    category: transaction.category,
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.transactionDate.toString().split(' ')[0],
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _buildAccountsTab(
    BuildContext context,
    FinanceProvider financeProvider,
  ) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Bank Accounts',
                style: AppTypography.heading2.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
              FloatingActionButton.small(
                heroTag: 'accounts_add',
                onPressed: () {},
                child: const Icon(Icons.add),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.lg),
          if (financeProvider.bankAccounts.isEmpty)
            AppEmptyState(
              title: 'No Accounts',
              subtitle: 'Add your first bank account to get started',
            )
          else
            ...financeProvider.bankAccounts.map(
              (account) => Padding(
                padding: EdgeInsets.only(bottom: AppSpacing.md),
                child: AccountCard(account: account),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTransactionsTab(
    BuildContext context,
    FinanceProvider financeProvider,
  ) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Transaction History',
            style: AppTypography.heading2.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          if (financeProvider.transactions.isEmpty)
            AppEmptyState(
              title: 'No Transactions',
              subtitle: 'Your transactions will appear here',
            )
          else
            ...financeProvider.transactions.map(
              (transaction) => Padding(
                padding: EdgeInsets.only(bottom: AppSpacing.md),
                child: TransactionItem(
                  title: transaction.description,
                  category: transaction.category,
                  amount: transaction.amount,
                  type: transaction.type,
                  date: transaction.transactionDate.toString().split(' ')[0],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAnalyticsTab(
    BuildContext context,
    FinanceProvider financeProvider,
  ) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Analytics',
            style: AppTypography.heading2.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Spending Overview',
                  style: AppTypography.subtitle1.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: AppSpacing.md),
                Text(
                  'Total Spending: \$${financeProvider.transactions.fold<double>(0, (prev, t) => prev + t.amount).toStringAsFixed(2)}',
                  style: AppTypography.bodyMedium,
                ),
                SizedBox(height: AppSpacing.lg),
                _buildCategoryBreakdown(financeProvider),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBreakdown(FinanceProvider financeProvider) {
    final categories = <String, double>{};
    for (var transaction in financeProvider.transactions) {
      categories[transaction.category] =
          (categories[transaction.category] ?? 0) + transaction.amount;
    }

    return Column(
      children: categories.entries.map((entry) {
        final percentage = financeProvider.transactions.isEmpty
            ? 0.0
            : (entry.value /
                    financeProvider.transactions
                        .fold<double>(0, (prev, t) => prev + t.amount)) *
                100;
        return Padding(
          padding: EdgeInsets.only(bottom: AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    entry.key,
                    style: AppTypography.bodyMedium,
                  ),
                  Text(
                    '\$${entry.value.toStringAsFixed(2)}',
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppSpacing.sm),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: percentage / 100,
                  minHeight: 8,
                  backgroundColor: AppColors.surface,
                  valueColor: AlwaysStoppedAnimation(AppColors.primary),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSettingsTab(BuildContext context, AuthProvider authProvider) {
    final user = authProvider.user;

    return SingleChildScrollView(
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Settings',
            style: AppTypography.heading2.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          // Profile Section
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Profile',
                  style: AppTypography.subtitle1.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.primary.withOpacity(0.2),
                      child: const Icon(Icons.person),
                    ),
                    SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? 'User',
                            style: AppTypography.subtitle2.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            user?.email ?? 'email@example.com',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.edit,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ],
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          // Settings List
          AppCard(
            child: Column(
              children: [
                _buildSettingsItem('Security', Icons.lock),
                Divider(height: AppSpacing.md),
                _buildSettingsItem('Notifications', Icons.notifications),
                Divider(height: AppSpacing.md),
                _buildSettingsItem('Privacy & Terms', Icons.privacy_tip),
                Divider(height: AppSpacing.md),
                _buildSettingsItem('Help & Support', Icons.help),
              ],
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          AppButton(
            label: 'Logout',
            onPressed: () {
              authProvider.logout();
              Navigator.of(context).pushReplacementNamed('/login');
            },
            backgroundColor: AppColors.danger,
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsItem(String title, IconData icon) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary),
              SizedBox(width: AppSpacing.md),
              Text(
                title,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}