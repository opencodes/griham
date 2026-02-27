import 'package:flutter/material.dart';
import '../models/contact.dart';
import '../services/api_service.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});

  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  List<Contact> _contacts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    try {
      final response = await ApiService.get('/contacts');
      setState(() {
        _contacts =
            (response['data'] as List).map((e) => Contact.fromJson(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  void _showForm([Contact? contact]) {
    final nameController = TextEditingController(text: contact?.name);
    final phoneController = TextEditingController(text: contact?.phone);
    final emailController = TextEditingController(text: contact?.email);
    String type = contact?.type ?? 'friend';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(contact == null ? 'Add Contact' : 'Edit Contact'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Name')),
              TextField(
                  controller: phoneController,
                  decoration: const InputDecoration(labelText: 'Phone')),
              TextField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Email')),
              DropdownButtonFormField<String>(
                initialValue: type,
                items: ['friend', 'neighbor', 'vendor']
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => type = v!,
                decoration: const InputDecoration(labelText: 'Type'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final data = Contact(
                name: nameController.text,
                phone: phoneController.text,
                email: emailController.text,
                type: type,
              ).toJson();

              if (contact == null) {
                await ApiService.post('/contacts', data);
              } else {
                await ApiService.put('/contacts/${contact.id}', data);
              }

              if (mounted) {
                Navigator.pop(context);
                _loadContacts();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteContact(int id) async {
    await ApiService.delete('/contacts/$id');
    _loadContacts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contacts')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _contacts.length,
              itemBuilder: (context, i) {
                final contact = _contacts[i];
                return ListTile(
                  title: Text(contact.name),
                  subtitle: Text('${contact.phone ?? ''} • ${contact.type}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _showForm(contact)),
                      IconButton(
                          icon: const Icon(Icons.delete),
                          onPressed: () => _deleteContact(contact.id!)),
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
