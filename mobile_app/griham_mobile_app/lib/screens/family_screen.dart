import 'package:flutter/material.dart';
import '../models/family_member.dart';
import '../services/api_service.dart';

class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  List<FamilyMember> _members = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    try {
      final response = await ApiService.get('/family');
      setState(() {
        _members = (response['data'] as List).map((e) => FamilyMember.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _showForm([FamilyMember? member]) {
    final nameController = TextEditingController(text: member?.name);
    final relationController = TextEditingController(text: member?.relation);
    final dobController = TextEditingController(text: member?.dob);
    final phoneController = TextEditingController(text: member?.phone);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(member == null ? 'Add Family Member' : 'Edit Family Member'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: relationController, decoration: const InputDecoration(labelText: 'Relation')),
              TextField(controller: dobController, decoration: const InputDecoration(labelText: 'DOB (YYYY-MM-DD)')),
              TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final data = FamilyMember(
                name: nameController.text,
                relation: relationController.text,
                dob: dobController.text,
                phone: phoneController.text,
              ).toJson();

              if (member == null) {
                await ApiService.post('/family', data);
              } else {
                await ApiService.put('/family/${member.id}', data);
              }
              
              if (mounted) {
                Navigator.pop(context);
                _loadMembers();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteMember(int id) async {
    await ApiService.delete('/family/$id');
    _loadMembers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Family')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _members.length,
              itemBuilder: (context, i) {
                final member = _members[i];
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(member.name),
                  subtitle: Text('${member.relation} • ${member.dob ?? 'No DOB'}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(icon: const Icon(Icons.edit), onPressed: () => _showForm(member)),
                      IconButton(icon: const Icon(Icons.delete), onPressed: () => _deleteMember(member.id!)),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
