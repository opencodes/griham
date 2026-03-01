import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/bank_account.dart';

class BalanceWidget extends StatelessWidget {
  final double totalBalance;
  final String currency;

  const BalanceWidget({
    Key? key,
    required this.totalBalance,
    this.currency = '₹',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            AppColors.primaryDark,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Total Balance',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            '$currency ${totalBalance.toStringAsFixed(2)}',
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class AccountCard extends StatelessWidget {
  final BankAccount account;
  final VoidCallback? onTap;

  const AccountCard({
    Key? key,
    required this.account,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        account.accountName,
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        account.bankName,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: _getTypeColor(account.type),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      account.type,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Balance',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    '₹ ${account.balance.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'SAVINGS':
        return AppColors.success;
      case 'CURRENT':
        return AppColors.primary;
      case 'CREDIT_CARD':
        return AppColors.warning;
      default:
        return AppColors.neutral;
    }
  }
}

class TransactionItem extends StatelessWidget {
  final String title;
  final String category;
  final double amount;
  final String type; // 'INCOME' or 'EXPENSE'
  final String date;
  final VoidCallback? onTap;
  final bool compact;

  const TransactionItem({
    Key? key,
    required this.title,
    required this.category,
    required this.amount,
    required this.type,
    required this.date,
    this.onTap,
    this.compact = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final normalizedType = type.toLowerCase();
    final isIncome = normalizedType == 'income' || normalizedType == 'credit';
    final amountColor = isIncome ? AppColors.success : AppColors.danger;
    final categoryIcon = _getCategoryIcon(category);
    final categoryIconColor = _getCategoryIconColor(category);
    final formattedDate = _formatDisplayDate(date);
    final verticalPadding = compact ? AppSpacing.sm : AppSpacing.md;
    final iconSize = compact ? 20.0 : 26.0;
    final amountStyle = compact
        ? Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: amountColor,
              fontWeight: FontWeight.w600,
            )
        : Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: amountColor,
              fontWeight: FontWeight.w600,
            );

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: verticalPadding),
        child: Row(
          children: [
            Icon(
              categoryIcon,
              color: categoryIconColor,
              size: iconSize,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: (compact
                            ? Theme.of(context).textTheme.bodyMedium
                            : Theme.of(context).textTheme.bodyLarge)
                        ?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          category,
                          style: Theme.of(context).textTheme.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isIncome ? '+' : '-'}₹ ${amount.toStringAsFixed(2)}',
                  style: amountStyle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  formattedDate,
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.right,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String value) {
    final category = value.toLowerCase();
    if (category.contains('food') || category.contains('grocery')) {
      return Icons.restaurant;
    }
    if (category.contains('shop') || category.contains('amazon')) {
      return Icons.shopping_bag;
    }
    if (category.contains('travel') || category.contains('flight')) {
      return Icons.flight;
    }
    if (category.contains('fuel') || category.contains('petrol')) {
      return Icons.local_gas_station;
    }
    if (category.contains('bill') || category.contains('utility')) {
      return Icons.receipt_long;
    }
    if (category.contains('emi') || category.contains('loan')) {
      return Icons.account_balance;
    }
    if (category.contains('salary')) {
      return Icons.work;
    }
    if (category.contains('cashback') || category.contains('reward')) {
      return Icons.card_giftcard;
    }
    if (category.contains('medical') || category.contains('health')) {
      return Icons.local_hospital;
    }
    if (category.contains('rent') || category.contains('home')) {
      return Icons.home;
    }
    return Icons.category;
  }

  Color _getCategoryIconColor(String value) {
    final category = value.toLowerCase();
    if (category.contains('salary') || category.contains('cashback') || category.contains('reward')) {
      return AppColors.success;
    }
    if (category.contains('food') || category.contains('grocery')) {
      return AppColors.warning;
    }
    if (category.contains('bill') || category.contains('utility') || category.contains('emi') || category.contains('loan')) {
      return AppColors.primary;
    }
    if (category.contains('medical') || category.contains('health')) {
      return AppColors.danger;
    }
    return AppColors.textSecondary;
  }

  String _formatDisplayDate(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      return value;
    }

    const weekdays = <String>[
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final weekday = weekdays[parsed.weekday - 1];
    final month = months[parsed.month - 1];
    return '$weekday, ${parsed.day} $month';
  }
}

class QuickActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final Color? backgroundColor;

  const QuickActionButton({
    Key? key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.backgroundColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onPressed,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: backgroundColor ?? AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: backgroundColor ?? AppColors.primary,
                size: 28,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              label,
              style: Theme.of(context).textTheme.labelMedium,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
