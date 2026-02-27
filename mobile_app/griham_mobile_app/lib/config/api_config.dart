class ApiConfig {
  static const String baseUrl = 'http://localhost:8000';
  static const String apiVersion = 'api/v1';
  static const int timeoutDuration = 30;

  static String get apiBaseUrl => '$baseUrl/$apiVersion';
  static String get authBaseUrl => '$baseUrl/auth';

  // Endpoints
  static const String loginEndpoint = '/login';
  static const String registerEndpoint = '/register';
  static const String logoutEndpoint = '/logout';
  static const String refreshTokenEndpoint = '/refresh-token';
  
  // Finance endpoints
  static const String accountsEndpoint = '/accounts';
  static const String transactionsEndpoint = '/transactions';
  static const String billsEndpoint = '/bills';
  static const String cardsEndpoint = '/cards';
  static const String goalsEndpoint = '/goals';
}
