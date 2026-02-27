import 'package:flutter/material.dart';

class AppColors {
  // Primary
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryLight = Color(0xFFEFF6FF);
  static const Color primaryDark = Color(0xFF1E40AF);

  // Secondary
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color successDark = Color(0xFF059669);

  // Status Colors
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);

  // Neutral
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color transparent = Color(0x00000000);

  // Surface
  static const Color surface = Color(0xFFF3F4F6);

  // Light Theme
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFF3F4F6);
  static const Color lightBorder = Color(0xFFE5E7EB);
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textTertiary = Color(0xFF9CA3AF);

  // Dark Theme
  static const Color darkBackground = Color(0xFF1F2937);
  static const Color darkSurface = Color(0xFF374151);
  static const Color darkBorder = Color(0xFF4B5563);
  static const Color darkTextPrimary = Color(0xFFF3F4F6);
  static const Color darkTextSecondary = Color(0xFFD1D5DB);

  // Semantic colors
  static const Color income = Color(0xFF10B981);
  static const Color expense = Color(0xFFEF4444);
  static const Color neutral = Color(0xFF6B7280);
}

class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

class AppTypography {
  static const String fontFamily = 'Roboto';
  static const String fontFamilyDisplay = 'Poppins';

  // Display
  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamilyDisplay,
    fontSize: 32.0,
    fontWeight: FontWeight.bold,
    height: 1.2,
    letterSpacing: -0.5,
  );

  static const TextStyle displayMedium = TextStyle(
    fontFamily: fontFamilyDisplay,
    fontSize: 28.0,
    fontWeight: FontWeight.bold,
    height: 1.3,
  );

  static const TextStyle displaySmall = TextStyle(
    fontFamily: fontFamilyDisplay,
    fontSize: 24.0,
    fontWeight: FontWeight.bold,
    height: 1.3,
  );

  // Heading
  static const TextStyle headingLarge = TextStyle(
    fontFamily: fontFamilyDisplay,
    fontSize: 20.0,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle headingMedium = TextStyle(
    fontFamily: fontFamilyDisplay,
    fontSize: 18.0,
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static const TextStyle headingSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.0,
    fontWeight: FontWeight.w600,
    height: 1.5,
  );

  // Body
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.0,
    fontWeight: FontWeight.normal,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    fontWeight: FontWeight.normal,
    height: 1.5,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.0,
    fontWeight: FontWeight.normal,
    height: 1.5,
  );

  // Label
  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    fontWeight: FontWeight.w600,
    height: 1.5,
    letterSpacing: 0.1,
  );

  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.0,
    fontWeight: FontWeight.w500,
    height: 1.4,
    letterSpacing: 0.1,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10.0,
    fontWeight: FontWeight.w500,
    height: 1.3,
    letterSpacing: 0.1,
  );

  // Convenience getters for compatibility
  static TextStyle get heading1 => displayLarge;
  static TextStyle get heading2 => displayMedium;
  static TextStyle get subtitle1 => headingMedium;
  static TextStyle get subtitle2 => headingSmall;
}

class AppTheme {
  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.lightBackground,
      colorScheme: ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.success,
        error: AppColors.danger,
        surface: AppColors.lightSurface,
        errorContainer: AppColors.dangerLight,
        onPrimary: AppColors.white,
        onSecondary: AppColors.white,
        onError: AppColors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.lightBackground,
        foregroundColor: AppColors.textPrimary,
        elevation: 0.5,
        centerTitle: false,
        titleTextStyle: AppTypography.headingLarge.copyWith(
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 0.5,
        margin: const EdgeInsets.all(0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightSurface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        labelStyle: AppTypography.bodyMedium.copyWith(
          color: AppColors.textSecondary,
        ),
        hintStyle: AppTypography.bodyMedium.copyWith(
          color: AppColors.textTertiary,
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.danger, width: 2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          textStyle: AppTypography.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          elevation: 0,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          textStyle: AppTypography.labelLarge,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textTertiary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerColor: AppColors.lightBorder,
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(
          color: AppColors.textPrimary,
        ),
        displayMedium: AppTypography.displayMedium.copyWith(
          color: AppColors.textPrimary,
        ),
        displaySmall: AppTypography.displaySmall.copyWith(
          color: AppColors.textPrimary,
        ),
        headlineLarge: AppTypography.headingLarge.copyWith(
          color: AppColors.textPrimary,
        ),
        headlineMedium: AppTypography.headingMedium.copyWith(
          color: AppColors.textPrimary,
        ),
        headlineSmall: AppTypography.headingSmall.copyWith(
          color: AppColors.textPrimary,
        ),
        bodyLarge: AppTypography.bodyLarge.copyWith(
          color: AppColors.textPrimary,
        ),
        bodyMedium: AppTypography.bodyMedium.copyWith(
          color: AppColors.textSecondary,
        ),
        bodySmall: AppTypography.bodySmall.copyWith(
          color: AppColors.textTertiary,
        ),
        labelLarge: AppTypography.labelLarge.copyWith(
          color: AppColors.textPrimary,
        ),
        labelMedium: AppTypography.labelMedium.copyWith(
          color: AppColors.textSecondary,
        ),
        labelSmall: AppTypography.labelSmall.copyWith(
          color: AppColors.textTertiary,
        ),
      ),
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.success,
        error: AppColors.danger,
        surface: AppColors.darkSurface,
        errorContainer: AppColors.dangerLight,
        onPrimary: AppColors.white,
        onSecondary: AppColors.white,
        onError: AppColors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkTextPrimary,
        elevation: 0.5,
        centerTitle: false,
        titleTextStyle: AppTypography.headingLarge.copyWith(
          color: AppColors.darkTextPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkSurface,
        elevation: 0.5,
        margin: const EdgeInsets.all(0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(
          color: AppColors.darkTextPrimary,
        ),
        headlineLarge: AppTypography.headingLarge.copyWith(
          color: AppColors.darkTextPrimary,
        ),
        bodyLarge: AppTypography.bodyLarge.copyWith(
          color: AppColors.darkTextPrimary,
        ),
        bodyMedium: AppTypography.bodyMedium.copyWith(
          color: AppColors.darkTextSecondary,
        ),
      ),
      dividerColor: AppColors.darkBorder,
    );
  }
}
