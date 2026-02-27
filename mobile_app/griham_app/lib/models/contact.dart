class Contact {
  final int? id;
  final String name;
  final String? phone;
  final String? email;
  final String type;

  Contact({this.id, required this.name, this.phone, this.email, required this.type});

  factory Contact.fromJson(Map<String, dynamic> json) => Contact(
    id: json['id'],
    name: json['name'],
    phone: json['phone'],
    email: json['email'],
    type: json['type'],
  );

  Map<String, dynamic> toJson() => {
    'name': name,
    'phone': phone,
    'email': email,
    'type': type,
  };
}
