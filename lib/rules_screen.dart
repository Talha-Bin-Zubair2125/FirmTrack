import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'custom_drawer.dart';
import 'home_screen.dart';

class RulesScreen extends StatefulWidget {
  const RulesScreen({super.key});

  @override
  State<RulesScreen> createState() => _RulesScreenState();
}

class _RulesScreenState extends State<RulesScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _rulesData = {};
  String _errorMessage = "Failed to load rules. Please try again.";

  Timer? _autoSyncTimer;

  final String _baseUrl =
      "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _fetchDeductionRules();

    _autoSyncTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _fetchDeductionRules(isBackground: true);
    });
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchDeductionRules({bool isBackground = false}) async {
    if (!isBackground) setState(() => _isLoading = true);

    try {
      var authBox = Hive.box('authBox');
      String token = authBox.get('token', defaultValue: '');

      final response = await http.get(
        Uri.parse('$_baseUrl/settings/deduction'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'ngrok-skip-browser-warning': 'true',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _rulesData = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        if (!isBackground && mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = "Server error: ${response.statusCode}";
          });
        }
      }
    } catch (e) {
      if (!isBackground && mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = "Connection error. Check internet.";
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
              (route) => false,
        );
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF4F7FE),
        appBar: AppBar(
          title: const Text(
            'Company Policies',
            style: TextStyle(
                color: Color(0xFF212529),
                fontWeight: FontWeight.bold,
                fontSize: 18),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
          // ── Uniform menu icon — back arrow hata diya ─────────────────
          leading: Builder(
            builder: (context) => GestureDetector(
              onTap: () => Scaffold.of(context).openDrawer(),
              child: Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    )
                  ],
                ),
                child: const Icon(Icons.menu_rounded,
                    color: Color(0xFF212529), size: 22),
              ),
            ),
          ),
        ),
        drawer: const CustomDrawer(selectedIndex: 4),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: _isLoading
                ? const Center(
                child: CircularProgressIndicator(
                    color: Color(0xFF212529)))
                : _rulesData.isEmpty
                ? Center(
              child: Text(
                _errorMessage,
                style:
                const TextStyle(color: Color(0xFFDC2626)),
              ),
            )
                : SingleChildScrollView(
              padding:
              const EdgeInsets.fromLTRB(20, 8, 20, 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // ── Header ──────────────────────────────
                  const Text(
                    'Attendance & Deduction Rules',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF212529)),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Current administrative policies for attendance and salary deductions.',
                    style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey,
                        height: 1.5),
                  ),
                  const SizedBox(height: 24),

                  // ── Rule Cards ───────────────────────────
                  _buildRuleCard(
                    icon: Icons.access_time_rounded,
                    title: 'Late Arrival Penalty',
                    description:
                    'Deduction applied if you arrive after the allowed time (${_rulesData['lateArrivalTime'] ?? 'N/A'}).',
                    amount: _rulesData['deductionPerLate']
                        ?.toString() ??
                        '0',
                    iconColor: const Color(0xFFC05621),
                    iconBg: const Color(0xFFFFF7ED),
                    amountColor: const Color(0xFFC05621),
                  ),
                  const SizedBox(height: 12),
                  _buildRuleCard(
                    icon: Icons.hourglass_bottom_rounded,
                    title: 'Half-Day Penalty',
                    description:
                    'Deduction applied for a half-day mark (after ${_rulesData['allowedHalfDayTime'] ?? 'N/A'}).',
                    amount:
                    _rulesData['deductionPerHalfDay']
                        ?.toString() ??
                        '0',
                    iconColor: const Color(0xFFDC2626),
                    iconBg: const Color(0xFFFEF2F2),
                    amountColor: const Color(0xFFDC2626),
                  ),
                  const SizedBox(height: 12),
                  _buildRuleCard(
                    icon: Icons.close_rounded,
                    title: 'Full Absence Penalty',
                    description:
                    'Deduction for missing a full working day without approved leave.',
                    amount:
                    _rulesData['deductionPerAbsence']
                        ?.toString() ??
                        '0',
                    iconColor: const Color(0xFFDC2626),
                    iconBg: const Color(0xFFFEF2F2),
                    amountColor: const Color(0xFFDC2626),
                  ),
                  const SizedBox(height: 12),
                  _buildRuleCard(
                    icon: Icons.event_busy_rounded,
                    title: 'Excess Leave Penalty',
                    description:
                    'Additional deduction if total leaves exceed the allowed quota (${_rulesData['allowedTotalLeave'] ?? '0'} leaves).',
                    amount: _rulesData[
                    'exceedsTotalLeaveDeduction']
                        ?.toString() ??
                        '0',
                    iconColor: const Color(0xFF6D28D9),
                    iconBg: const Color(0xFFF5F3FF),
                    amountColor: const Color(0xFF6D28D9),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRuleCard({
    required IconData icon,
    required String title,
    required String description,
    required String amount,
    required Color iconColor,
    required Color iconBg,
    required Color amountColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon box — uniform rounded square
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),

          // Title + description
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF212529)),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      height: 1.45),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Deduction pill — same as HistoryScreen trailing badge
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Deduction',
                style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey.shade400,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3),
              ),
              const SizedBox(height: 5),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: amountColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '- Rs. $amount',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: amountColor),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}