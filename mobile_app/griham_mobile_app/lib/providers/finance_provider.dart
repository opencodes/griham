import 'dart:convert';
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../models/bank_account.dart';
import '../models/bill.dart';
import '../models/card.dart' as model;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/transaction.dart';
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
    if (_authProvider != null && _authProvider!.isAuthenticated) {
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
    final familyId = dotenv.env['FAMILY_ID'];
    if (familyId == null) {
      debugPrint('FAMILY_ID not found in .env');
      return;
    }
    debugPrint('Fetching finance data for familyId: $familyId');
    try {
      final bankAccountsResponse = await ApiService.getBankAccounts(familyId);
      if (bankAccountsResponse.statusCode == 200) {
        final data = jsonDecode(bankAccountsResponse.body)['data'] as List;
        _bankAccounts = data.map((item) => BankAccount.fromJson(item)).toList();
        debugPrint('Fetched ${_bankAccounts.length} bank accounts.');
      } else {
        debugPrint('Failed to load bank accounts: ${bankAccountsResponse.statusCode}');
      }

      final billsResponse = await ApiService.getBills(familyId);
      if (billsResponse.statusCode == 200) {
        final data = jsonDecode(billsResponse.body)['data'] as List;
        _bills = data.map((item) => Bill.fromJson(item)).toList();
        debugPrint('Fetched ${_bills.length} bills.');
      } else {
        debugPrint('Failed to load bills: ${billsResponse.statusCode}');
      }

      final cardsResponse = await ApiService.getCards(familyId);
      if (cardsResponse.statusCode == 200) {
        final data = jsonDecode(cardsResponse.body)['data'] as List;
        _cards = data.map((item) => model.Card.fromJson(item)).toList();
        debugPrint('Fetched ${_cards.length} cards.');
      } else {
        debugPrint('Failed to load cards: ${cardsResponse.statusCode}');
      }

      final transactionsResponse = await ApiService.getTransactions(familyId);
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

  /// Load transactions from a JSON payload (useful for local testing)
  Future<void> loadTransactionsFromJson(String json) async {
    try {
      final data = jsonDecode(json)['data'] as List;
      _transactions = data.map((item) {
        final amt = double.tryParse(item['amount']?.toString() ?? '0') ?? 0.0;
        final normType = (item['type'] ?? '').toString().toLowerCase();
        final date = item['transaction_date'] != null ? DateTime.parse(item['transaction_date']) : DateTime.now();

        return Transaction(
          id: item['id'] ?? '',
          amount: amt,
          type: normType,
          category: item['category'] ?? '',
          description: item['description'] ?? '',
          transactionDate: date,
        );
      }).toList();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading transactions from json: $e');
    }
  }
}