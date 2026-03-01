import 'dart:convert';
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../models/bank_account.dart';
import '../models/bill.dart';
import '../models/card.dart' as model;
import '../models/transaction.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_provider.dart';

class FinanceProvider with ChangeNotifier {
  final AuthProvider? _authProvider;
  List<BankAccount> _bankAccounts = [];
  List<Bill> _bills = [];
  List<model.Card> _cards = [];
  List<Transaction> _transactions = [];

  List<BankAccount> get bankAccounts => _bankAccounts;
  List<Bill> get bills => _bills;
  List<model.Card> get cards => _cards;
  List<Transaction> get transactions => _transactions;

  FinanceProvider(this._authProvider) {
    if (_authProvider != null && _authProvider.isAuthenticated) {
      _fetchFinanceData();
    }
  }

  /// public method to refresh data from API
  Future<void> refreshFinanceData() async {
    await _fetchFinanceData();
  }

  /// locally insert a new transaction (useful for offline additions)
  void addTransaction(Transaction transaction) {
    _transactions.insert(0, transaction);
    notifyListeners();
  }

  Future<void> _fetchFinanceData() async {
    final prefs = await SharedPreferences.getInstance();
    final familyId = prefs.getString('family_id');
    if (familyId == null) {
      debugPrint('family_id not found in shared preferences');
      return;
    }
    debugPrint('Fetching finance data for familyId: $familyId');
    try {
      final responses = await Future.wait([
        ApiService.getBankAccounts(familyId),
        ApiService.getBills(familyId),
        ApiService.getCards(familyId),
        ApiService.getTransactions(familyId),
      ]);

      final bankAccountsResponse = responses[0];
      if (bankAccountsResponse.statusCode == 200) {
        final data = jsonDecode(bankAccountsResponse.body)['data'] as List;
        _bankAccounts = data.map((item) => BankAccount.fromJson(item)).toList();
        debugPrint('Fetched ${_bankAccounts.length} bank accounts.');
      } else {
        debugPrint('Failed to load bank accounts: ${bankAccountsResponse.statusCode}');
      }

      final billsResponse = responses[1];
      if (billsResponse.statusCode == 200) {
        final data = jsonDecode(billsResponse.body)['data'] as List;
        _bills = data.map((item) => Bill.fromJson(item)).toList();
        debugPrint('Fetched ${_bills.length} bills.');
      } else {
        debugPrint('Failed to load bills: ${billsResponse.statusCode}');
      }

      final cardsResponse = responses[2];
      if (cardsResponse.statusCode == 200) {
        final data = jsonDecode(cardsResponse.body)['data'] as List;
        _cards = data.map((item) => model.Card.fromJson(item)).toList();
        debugPrint('Fetched ${_cards.length} cards.');
      } else {
        debugPrint('Failed to load cards: ${cardsResponse.statusCode}');
      }

      final transactionsResponse = responses[3];
      if (transactionsResponse.statusCode == 200) {
        final data = jsonDecode(transactionsResponse.body)['data'] as List;
        _transactions = data.map((item) => Transaction.fromJson(item)).toList();
        debugPrint('Fetched ${_transactions.length} transactions.');
      } else {
        debugPrint('Failed to load transactions: ${transactionsResponse.statusCode}');
      }

      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching finance data: $e');
    }
  }

}
