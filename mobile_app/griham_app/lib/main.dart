import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'screens/dashboard_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/finance_provider.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';

Future<void> main() async {
  runApp(const MyApp());
}

class AppBootstrap extends StatefulWidget {
  const AppBootstrap({super.key});

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  late final Future<void> _minimumSplash;

  @override
  void initState() {
    super.initState();
    _minimumSplash = Future<void>.delayed(const Duration(milliseconds: 1800));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _minimumSplash,
      builder: (context, snapshot) {
        return Consumer<AuthProvider>(
          builder: (context, auth, _) {
            final splashDone = snapshot.connectionState == ConnectionState.done;
            if (!splashDone || !auth.isInitialized) {
              return const SplashScreen();
            }

            return auth.isAuthenticated
                ? const DashboardScreen()
                : const LoginScreen();
          },
        );
      },
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => AuthProvider()),
        ChangeNotifierProxyProvider<AuthProvider, FinanceProvider>(
          create: (context) => FinanceProvider(null),
          update: (context, auth, previousFinanceProvider) =>
              FinanceProvider(auth),
        ),
      ],
      child: MaterialApp(
        title: '',
        theme: AppTheme.lightTheme(),
        home: const AppBootstrap(),
      ),
    );
  }
}
