class BankAccount {
  final String id;
  final String bankName;
  final String accountNumber;
  final String accountHolderName;
  final String accountName;
  final String type; // SAVINGS, CURRENT, CREDIT_CARD
  final double balance;
  final String currency;
  final bool isActive;

  BankAccount({
    required this.id,
    required this.bankName,
    required this.accountNumber,
    required this.accountHolderName,
    required this.accountName,
    required this.type,
    required this.balance,
    required this.currency,
    this.isActive = true,
  });

  factory BankAccount.fromJson(Map<String, dynamic> json) {
    return BankAccount(
      id: json['id'] ?? '',
      bankName: json['bank_name'] ?? '',
      accountNumber: json['account_number'] ?? '',
      accountHolderName: json['account_holder_name'] ?? '',
      accountName: json['account_name'] ?? json['bank_name'] ?? '',
      type: json['type'] ?? 'SAVINGS',
      balance: double.tryParse(json['balance']?.toString() ?? '0.0') ?? 0.0,
      currency: json['currency'] ?? '₹',
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'bank_name': bankName,
      'account_number': accountNumber,
      'account_holder_name': accountHolderName,
      'account_name': accountName,
      'type': type,
      'balance': balance,
      'currency': currency,
      'is_active': isActive,
    };
  }
}