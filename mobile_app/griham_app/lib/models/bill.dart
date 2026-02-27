class Bill {
  final String id;
  final String billerName;
  final double amount;
  final DateTime dueDate;
  final String status;

  Bill({
    required this.id,
    required this.billerName,
    required this.amount,
    required this.dueDate,
    required this.status,
  });

  factory Bill.fromJson(Map<String, dynamic> json) {
    return Bill(
      id: json['id'] ?? '',
      billerName: json['biller_name'] ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0.0') ?? 0.0,
      dueDate: json['due_date'] != null ? DateTime.parse(json['due_date']) : DateTime.now(),
      status: json['status'] ?? '',
    );
  }
}