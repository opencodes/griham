class Card {
  final String id;
  final String cardNumber;
  final String cardHolderName;
  final String expiryDate;
  final String cardType;
  final String bankName;

  Card({
    required this.id,
    required this.cardNumber,
    required this.cardHolderName,
    required this.expiryDate,
    required this.cardType,
    required this.bankName,
  });

  factory Card.fromJson(Map<String, dynamic> json) {
    return Card(
      id: json['id'] ?? '',
      cardNumber: json['card_number'] ?? '',
      cardHolderName: json['card_holder_name'] ?? '',
      expiryDate: json['expiry_date'] ?? '',
      cardType: json['card_type'] ?? '',
      bankName: json['bank_name'] ?? '',
    );
  }
}