import 'package:firm_track/rules_screen.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'history_screen.dart';
import 'calendar_screen.dart';
import 'login_screen.dart';

class CustomDrawer extends StatefulWidget {
  final int selectedIndex;

  const CustomDrawer({super.key, required this.selectedIndex});

  @override
  State<CustomDrawer> createState() => _CustomDrawerState();
}

class _CustomDrawerState extends State<CustomDrawer> {
  String employeeName = "Loading...";
  String employeeRole = "Loading...";
  String empID = "Loading...";

  @override
  void initState() {
    super.initState();
    _loadLocalProfile();
  }

  void _loadLocalProfile() {
    var authBox = Hive.box('authBox');
    setState(() {
      employeeName = authBox.get('name', defaultValue: 'User');
      employeeRole = authBox.get('role', defaultValue: 'Employee');
      empID = authBox.get('employeeID', defaultValue: 'FT-000');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFFF4F7FE), // ← uniform app background
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [

          // ── Header ──────────────────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(
                top: 60, bottom: 28, left: 24, right: 24),
            decoration: const BoxDecoration(
              color: Color(0xFF212529),
              borderRadius: BorderRadius.only(
                topRight: Radius.circular(24),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar — same style as LoginScreen icon container
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: CircleAvatar(
                    radius: 34,
                    backgroundColor: Colors.white,
                    child: Text(
                      employeeName.isNotEmpty
                          ? employeeName[0].toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        fontSize: 26,
                        color: Color(0xFF212529),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  employeeName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  employeeRole,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.55),
                  ),
                ),
                const SizedBox(height: 14),
                // Emp ID badge — same pill style as HomeScreen status badge
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15)),
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

          // ── Nav Items ────────────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              children: [
                _buildDrawerItem(
                  context,
                  Icons.dashboard_rounded,
                  'Dashboard',
                  const HomeScreen(),
                  0,
                ),
                const SizedBox(height: 6),
                _buildDrawerItem(
                  context,
                  Icons.calendar_month_rounded,
                  'Attendance Calendar',
                  const CalendarScreen(),
                  3,
                ),
                const SizedBox(height: 6),
                _buildDrawerItem(
                  context,
                  Icons.history_rounded,
                  'Recent Activity',
                  const HistoryScreen(),
                  2,
                ),
                const SizedBox(height: 6),
                _buildDrawerItem(
                  context,
                  Icons.policy_rounded,
                  'Company Policies',
                  const RulesScreen(),
                  4,
                ),
                const SizedBox(height: 6),
                _buildDrawerItem(
                  context,
                  Icons.person_rounded,
                  'My Profile',
                  const ProfileScreen(),
                  1,
                ),
              ],
            ),
          ),

          // ── Logout ───────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  )
                ],
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.logout_rounded,
                      color: Color(0xFFDC2626), size: 18),
                ),
                title: const Text(
                  'Logout',
                  style: TextStyle(
                    color: Color(0xFFDC2626),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                onTap: () async {
                  var authBox = Hive.box('authBox');
                  await authBox.put('isLoggedIn', false);
                  await authBox.delete('employeeID');
                  await authBox.delete('name');
                  await authBox.delete('role');

                  if (!context.mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const LoginScreen()),
                        (Route<dynamic> route) => false,
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
      BuildContext context,
      IconData icon,
      String title,
      Widget targetScreen,
      int itemIndex,
      ) {
    bool isSelected = widget.selectedIndex == itemIndex;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        boxShadow: isSelected
            ? [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ]
            : [],
      ),
      child: ListTile(
        dense: true,
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF212529)
                : Colors.white,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? []
                : [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              )
            ],
          ),
          child: Icon(
            icon,
            size: 18,
            color: isSelected ? Colors.white : Colors.grey.shade500,
          ),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight:
            isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected
                ? const Color(0xFF212529)
                : Colors.grey.shade600,
          ),
        ),
        // Selected item ka right side indicator
        trailing: isSelected
            ? Container(
          width: 5,
          height: 5,
          decoration: const BoxDecoration(
            color: Color(0xFF212529),
            shape: BoxShape.circle,
          ),
        )
            : null,
        onTap: () {
          Navigator.pop(context);
          if (isSelected) return;
          Navigator.popUntil(context, (route) => route.isFirst);
          if (itemIndex != 0) {
            Navigator.push(
              context,
              PageRouteBuilder(
                pageBuilder: (context, animation, secondaryAnimation) =>
                targetScreen,
                transitionDuration: Duration.zero,
              ),
            );
          }
        },
      ),
    );
  }
}