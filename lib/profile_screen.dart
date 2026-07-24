import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'custom_drawer.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String employeeName = "Loading...";
  String employeeRole = "Loading...";
  String empID = "Loading...";
  String joiningDate = "Loading...";
  bool _isLoading = true;

  final String _baseUrl =
      "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _fetchLiveProfileDetails();
  }

  Future<void> _fetchLiveProfileDetails() async {
    var authBox = Hive.box('authBox');
    String currentEmpID = authBox.get('employeeID', defaultValue: '');

    setState(() {
      employeeName = authBox.get('name', defaultValue: 'FirmTrack Employee');
      employeeRole = authBox.get('role', defaultValue: 'Team Associate');
      empID = currentEmpID.isNotEmpty ? currentEmpID : 'FT-000';
    });

    int currentMonth = DateTime.now().month;
    int currentYear = DateTime.now().year;
    String targetCacheKey = "cache_${empID}_${currentMonth}_$currentYear";

    try {
      final response = await http.get(
        Uri.parse(
            '$_baseUrl/report/bymonth?employeeID=$empID&month=$currentMonth&year=$currentYear'),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        String? serverDateString = data['employeeCreatedAt'];

        if (serverDateString != null) {
          DateTime parsedDate = DateTime.parse(serverDateString);
          if (!mounted) return;
          setState(() {
            joiningDate = DateFormat('d MMMM yyyy').format(parsedDate);
            _isLoading = false;
          });
          return;
        }
      }
      _fallbackToLocalProfileCache(targetCacheKey);
    } catch (e) {
      _fallbackToLocalProfileCache(targetCacheKey);
    }
  }

  void _fallbackToLocalProfileCache(String targetCacheKey) async {
    if (!Hive.isBoxOpen('historyCacheBox')) {
      await Hive.openBox('historyCacheBox');
    }
    var cacheBox = Hive.box('historyCacheBox');

    if (cacheBox.containsKey(targetCacheKey)) {
      final cachedData = cacheBox.get(targetCacheKey);
      if (cachedData['employeeCreatedAt'] != null) {
        DateTime parsedDate =
        DateTime.parse(cachedData['employeeCreatedAt'].toString());
        if (!mounted) return;
        setState(() {
          joiningDate = DateFormat('d MMMM yyyy').format(parsedDate);
          _isLoading = false;
        });
        return;
      }
    }

    if (!mounted) return;
    setState(() {
      joiningDate = "18 May 2026";
      _isLoading = false;
    });
  }

  void _showCustomSnackBar(String message, {bool isSuccess = false}) {
    final double screenHeight = MediaQuery.of(context).size.height;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        dismissDirection: DismissDirection.up,
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle_outline : Icons.error_outline,
              color: Colors.white,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: isSuccess
            ? const Color(0xFF212529)
            : const Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
        shape:
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: EdgeInsets.only(
          bottom: screenHeight - 160,
          left: 16,
          right: 16,
        ),
        elevation: 4,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showChangePasswordBottomSheet() {
    final TextEditingController oldPasswordController =
    TextEditingController();
    final TextEditingController newPasswordController =
    TextEditingController();
    final TextEditingController confirmPasswordController =
    TextEditingController();
    bool isModalLoading = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(24),
          topLeft: Radius.circular(24),
        ),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                left: 24,
                right: 24,
                top: 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Title row
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF212529).withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.vpn_key_rounded,
                            color: Color(0xFF212529), size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Update Password',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF212529)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  _buildModalTextField(
                      oldPasswordController, 'Current Password',
                      Icons.lock_open_outlined),
                  const SizedBox(height: 12),
                  _buildModalTextField(
                      newPasswordController, 'New Password',
                      Icons.lock_outline),
                  const SizedBox(height: 12),
                  _buildModalTextField(
                      confirmPasswordController, 'Confirm New Password',
                      Icons.gpp_good_outlined),
                  const SizedBox(height: 24),

                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: isModalLoading
                          ? null
                          : () async {
                        final oldPass =
                        oldPasswordController.text.trim();
                        final newPass =
                        newPasswordController.text.trim();
                        final confPass =
                        confirmPasswordController.text.trim();

                        if (oldPass.isEmpty ||
                            newPass.isEmpty ||
                            confPass.isEmpty) {
                          _showCustomSnackBar(
                              'Please fill all password fields',
                              isSuccess: false);
                          return;
                        }
                        if (newPass != confPass) {
                          _showCustomSnackBar(
                              'New passwords do not match!',
                              isSuccess: false);
                          return;
                        }

                        setModalState(
                                () => isModalLoading = true);

                        try {
                          final response = await http.post(
                            Uri.parse(
                                '$_baseUrl/employees/change-password'),
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: jsonEncode({
                              "employeeID": empID,
                              "oldPassword": oldPass,
                              "newPassword": newPass,
                            }),
                          ).timeout(const Duration(seconds: 5));

                          final resData =
                          jsonDecode(response.body);

                          if (response.statusCode == 200) {
                            if (!mounted) return;
                            Navigator.pop(context);
                            _showCustomSnackBar(
                                'Password updated successfully!',
                                isSuccess: true);
                          } else {
                            _showCustomSnackBar(
                                resData['message'] ??
                                    'Failed to update password',
                                isSuccess: false);
                          }
                        } catch (e) {
                          _showCustomSnackBar(
                              'Network Error: Server unreachable',
                              isSuccess: false);
                        } finally {
                          setModalState(
                                  () => isModalLoading = false);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF212529),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: isModalLoading
                          ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                          : const Text('Save Changes',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildModalTextField(
      TextEditingController controller, String hint, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF4F7FE),
        borderRadius: BorderRadius.circular(14),
      ),
      child: TextField(
        controller: controller,
        obscureText: true,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle:
          TextStyle(color: Colors.grey.shade400, fontSize: 14),
          prefixIcon: Icon(icon, color: const Color(0xFF212529), size: 20),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(
              color: Color(0xFF212529),
              fontWeight: FontWeight.bold,
              fontSize: 18),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
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
      drawer: const CustomDrawer(selectedIndex: 1),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: _isLoading
              ? const Center(
              child: CircularProgressIndicator(
                  color: Color(0xFF212529)))
              : SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 30),
            child: Column(
              children: [

                // ── Profile Hero Card ───────────────────────────
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      vertical: 32, horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF212529),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF212529)
                            .withValues(alpha: 0.2),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      )
                    ],
                  ),
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color:
                          Colors.white.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: CircleAvatar(
                          radius: 46,
                          backgroundColor: Colors.white,
                          child: Text(
                            employeeName.isNotEmpty
                                ? employeeName[0].toUpperCase()
                                : 'E',
                            style: const TextStyle(
                              fontSize: 38,
                              color: Color(0xFF212529),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        employeeName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        employeeRole,
                        style: TextStyle(
                            fontSize: 14,
                            color:
                            Colors.white.withValues(alpha: 0.55),
                            fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 14),
                      // Emp ID pill — same as CustomDrawer
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color:
                          Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: Colors.white
                                  .withValues(alpha: 0.15)),
                        ),
                        child: Text(
                          'ID: $empID',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // ── Section title ───────────────────────────────
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Official Information',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF212529)),
                  ),
                ),
                const SizedBox(height: 14),

                // ── Info cards ──────────────────────────────────
                _buildInfoCard(
                    Icons.badge_outlined, 'Employee ID', empID),
                _buildInfoCard(
                    Icons.work_outline, 'Designation', employeeRole),
                _buildInfoCard(Icons.calendar_today_outlined,
                    'Joining Date', joiningDate),
                _buildInfoCard(Icons.verified_user_outlined,
                    'Account Status', 'Active'),

                const SizedBox(height: 8),

                // ── Change Password Button ──────────────────────
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: _showChangePasswordBottomSheet,
                    icon: const Icon(Icons.vpn_key_rounded, size: 18),
                    label: const Text(
                      'Change Password',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF212529),
                      side: BorderSide(
                          color: Colors.grey.shade300, width: 1),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(
      IconData leadingIcon, String titleLabel, String valueMetrics) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF212529).withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(leadingIcon, color: const Color(0xFF212529), size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titleLabel,
                  style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3),
                ),
                const SizedBox(height: 3),
                Text(
                  valueMetrics,
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF212529)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}