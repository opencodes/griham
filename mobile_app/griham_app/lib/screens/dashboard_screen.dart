import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/finance_provider.dart';
import '../services/contacts_sync_service.dart';
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
  bool _syncingContacts = false;

  Future<void> _handleSyncContacts() async {
    if (_syncingContacts) return;
    setState(() => _syncingContacts = true);
    try {
      final result = await ContactsSyncService.syncAllContacts();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Synced ${result.sentContacts} contacts (${result.batches} batches)',
          ),
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Contacts sync failed: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _syncingContacts = false);
    }
  }

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
            child: RefreshIndicator(
              onRefresh: () => financeProvider.refreshFinanceData(),
              child: _buildCurrentTab(context, authProvider, financeProvider),
            ),
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _selectedTabIndex,
            onTap: (index) => setState(() => _selectedTabIndex = index),
            type: BottomNavigationBarType.fixed,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.account_balance), label: 'Accounts'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.history), label: 'Transactions'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.analytics), label: 'Analytics'),
              BottomNavigationBarItem(
                  icon: Icon(Icons.settings), label: 'Settings'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCurrentTab(
    BuildContext context,
    AuthProvider authProvider,
    FinanceProvider financeProvider,
  ) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildDashboardTab(context, authProvider, financeProvider);
      case 1:
        return _buildAccountsTab(context, financeProvider);
      case 2:
        return _buildTransactionsTab(context, financeProvider);
      case 3:
        return _buildAnalyticsTab(context, financeProvider);
      case 4:
        return _buildSettingsTab(context, authProvider);
      default:
        return _buildDashboardTab(context, authProvider, financeProvider);
    }
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

    final creditTotal = financeProvider.transactions.where((t) {
      final type = t.type.toLowerCase();
      return type == 'income' || type == 'credit';
    }).fold<double>(0, (p, n) => p + n.amount);
    final debitTotal = financeProvider.transactions.where((t) {
      final type = t.type.toLowerCase();
      return type == 'expense' || type == 'debit';
    }).fold<double>(0, (p, n) => p + n.amount);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
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
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.primary.withOpacity(0.2),
                child: const Icon(Icons.notifications),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.lg),

          // Total Balance Widget
          BalanceWidget(
            totalBalance: totalBalance,
          ),
          SizedBox(height: AppSpacing.lg),

          // Credit / Debit summary cards
          Column(
            children: [
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.success,
                      AppColors.successDark,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Credit',
                      style: AppTypography.bodyMedium.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      '₹ ${creditTotal.toStringAsFixed(2)}',
                      style: AppTypography.heading2.copyWith(
                        color: Colors.white,
                        fontSize: 22,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              SizedBox(height: AppSpacing.md),
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.danger,
                      Color(0xFFB91C1C),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Debit',
                      style: AppTypography.bodyMedium.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      '₹ ${debitTotal.toStringAsFixed(2)}',
                      style: AppTypography.heading2.copyWith(
                        color: Colors.white,
                        fontSize: 22,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.lg),

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
              InkWell(
                onTap: () => setState(() => _selectedTabIndex = 2),
                child: Text(
                  'See all',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.md),
          ...(() {
            final recentTransactions =
                financeProvider.transactions.take(5).toList();
            return List<Widget>.generate(recentTransactions.length, (index) {
              final transaction = recentTransactions[index];
              final isLast = index == recentTransactions.length - 1;
              return Column(
                children: [
                  TransactionItem(
                    title: transaction.description,
                    category: transaction.category,
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.transactionDate.toString().split(' ')[0],
                    compact: true,
                  ),
                  if (!isLast)
                    Divider(
                      height: 1,
                      thickness: 1,
                      color:
                          Theme.of(context).dividerColor.withValues(alpha: 0.5),
                    ),
                ],
              );
            });
          })(),
        ],
      ),
    );
  }

  Widget _buildAccountsTab(
    BuildContext context,
    FinanceProvider financeProvider,
  ) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
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
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Transactions',
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
            ...(() {
              final items = financeProvider.transactions;
              return List<Widget>.generate(items.length, (index) {
                final transaction = items[index];
                final isLast = index == items.length - 1;
                return Column(
                  children: [
                    TransactionItem(
                      title: transaction.description,
                      category: transaction.category,
                      amount: transaction.amount,
                      type: transaction.type,
                      date:
                          transaction.transactionDate.toString().split(' ')[0],
                    ),
                    if (!isLast)
                      Divider(
                        height: 1,
                        thickness: 1,
                        color: Theme.of(context)
                            .dividerColor
                            .withValues(alpha: 0.5),
                      ),
                  ],
                );
              });
            })(),
        ],
      ),
    );
  }

  Widget _buildAnalyticsTab(
    BuildContext context,
    FinanceProvider financeProvider,
  ) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
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
    final total = financeProvider.transactions
        .fold<double>(0, (prev, t) => prev + t.amount);

    return Column(
      children: categories.entries.map((entry) {
        final percentage = total == 0 ? 0.0 : (entry.value / total) * 100;
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
      physics: const AlwaysScrollableScrollPhysics(),
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
                            'Logged in as',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          SizedBox(height: AppSpacing.xs),
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
                  ],
                ),
              ],
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          AppButton(
            label: _syncingContacts ? 'Syncing contacts…' : 'Sync Contacts',
            isEnabled: !_syncingContacts,
            onPressed: () {
              _handleSyncContacts();
            },
          ),
          SizedBox(height: AppSpacing.md),
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
}
