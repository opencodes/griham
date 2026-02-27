class FamilyMember {
  final int? id;
  final String name;
  final String relation;
  final String? dob;
  final String? phone;

  FamilyMember({this.id, required this.name, required this.relation, this.dob, this.phone});

  factory FamilyMember.fromJson(Map<String, dynamic> json) => FamilyMember(
    id: json['id'],
    name: json['name'],
    relation: json['relation'],
    dob: json['dob'],
    phone: json['phone'],
  );

  Map<String, dynamic> toJson() => {
    'name': name,
    'relation': relation,
    'dob': dob,
    'phone': phone,
  };
}
