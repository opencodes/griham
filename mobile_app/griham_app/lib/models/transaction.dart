class Transaction {
  final String id;
  final double amount;
  final String type;
  final String category;
  final String description;
  final DateTime transactionDate;

  Transaction({
    required this.id,
    required this.amount,
    required this.type,
    required this.category,
    required this.description,
    required this.transactionDate,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0.0') ?? 0.0,
      type: json['type'] ?? '',
      category: json['category'] ?? '',
      description: json['description'] ?? '',
      transactionDate: json['transaction_date'] != null
          ? DateTime.parse(json['transaction_date'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'amount': amount,
      'category': category,
      'description': description,
      'transaction_date': transactionDate.toIso8601String().split('T')[0],
    };
  }
}