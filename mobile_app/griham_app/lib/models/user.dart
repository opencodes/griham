class User {
  final String id;
  final String name;
  final String email;
  final String? familyId;
  final String? avatar;

  User({required this.id, required this.name, required this.email, this.familyId, this.avatar});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['full_name'],
      email: json['email'],
      familyId: json['family_id'],
      avatar: json['avatar_url'],
    );
  }
}