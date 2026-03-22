import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../config/theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final pulse = Curves.easeInOut.transform(
            (math.sin(_controller.value * math.pi * 2) + 1) / 2,
          );

          return Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF061018),
                  Color(0xFF0B1220),
                  Color(0xFF16181F),
                ],
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  top: -60,
                  right: -40,
                  child: _GlowOrb(
                    size: 220,
                    color: AppColors.primary.withValues(alpha: 0.16),
                  ),
                ),
                Positioned(
                  bottom: -30,
                  left: -50,
                  child: _GlowOrb(
                    size: 180,
                    color: AppColors.warning.withValues(alpha: 0.12),
                  ),
                ),
                Positioned(
                  top: 140 + (pulse * 20),
                  left: 30,
                  child: _AccentRing(
                    size: 72,
                    color: AppColors.primary.withValues(alpha: 0.12),
                  ),
                ),
                Positioned(
                  right: 36,
                  bottom: 180 - (pulse * 18),
                  child: _AccentRing(
                    size: 96,
                    color: AppColors.warning.withValues(alpha: 0.10),
                  ),
                ),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Transform.scale(
                        scale: 0.96 + (pulse * 0.08),
                        child: SizedBox(
                          width: 140,
                          height: 140,
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.18,
                                    ),
                                    blurRadius: 28,
                                    offset: const Offset(0, 14),
                                  ),
                                ],
                              ),
                              child: Image.asset(
                                'assets/images/logo.png',
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        'Home Karta',
                        style: textTheme.displaySmall?.copyWith(
                          color: AppColors.darkTextPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Smart family finance, beautifully organized',
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.darkTextSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      SizedBox(
                        width: 120,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(
                            minHeight: 6,
                            value: _controller.value,
                            backgroundColor: AppColors.darkBorder,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final double size;
  final Color color;

  const _GlowOrb({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }
}

class _AccentRing extends StatelessWidget {
  final double size;
  final Color color;

  const _AccentRing({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 12),
      ),
    );
  }
}
