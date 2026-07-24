import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'scanner_screen.dart';
import 'history_screen.dart';
import 'calendar_screen.dart';
import 'custom_drawer.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String employeeName = "Loading...";
  String employeeRole = "Loading...";
  String empID = "Loading...";

  String todayStatus = "Not Marked";
  bool _isStatusLoading = true;

  int _presentCount = 0;
  int _lateCount = 0;
  int _absentCount = 0;
  List<Map<String, dynamic>> _recentActivities = [];
  bool _isMetricsLoading = true;

  final String _baseUrl = "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _loadLocalProfile();
    _initOfflineAndSync();
  }

  // UTC → PKT (+5) conversion
  DateTime _safeParseDate(dynamic dateValue) {
    if (dateValue == null) return _pktNow();

    if (dateValue is int) {
      final utc = DateTime.fromMillisecondsSinceEpoch(dateValue, isUtc: true);
      final pkt = utc.add(const Duration(hours: 5));
      return DateTime(pkt.year, pkt.month, pkt.day);
    }

    String str = dateValue.toString();
    try {
      DateTime parsed = DateTime.parse(str);
      DateTime pkt;
      if (str.endsWith('Z') ||
          str.contains('+00:00') ||
          str.contains('T')) {
        pkt = parsed.toUtc().add(const Duration(hours: 5));
      } else {
        pkt = parsed;
      }
      return DateTime(pkt.year, pkt.month, pkt.day);
    } catch (e) {
      try {
        List<String> parts = str.contains('/') ? str.split('/') : str.split('-');
        if (parts.length >= 3) {
          int d = int.parse(parts[0]);
          int m = int.parse(parts[1]);
          int y = int.parse(parts[2].substring(0, 4));
          return DateTime(y, m, d);
        }
      } catch (_) {}
    }
    return _pktNow();
  }

  // Device timezone se independent — hamesha PKT "now" deta hai
  DateTime _pktNow() {
    final utc = DateTime.now().toUtc();
    final pkt = utc.add(const Duration(hours: 5));
    return DateTime(pkt.year, pkt.month, pkt.day);
  }

  void _loadLocalProfile() {
    var authBox = Hive.box('authBox');
    setState(() {
      employeeName = authBox.get('name', defaultValue: 'User');
      employeeRole = authBox.get('role', defaultValue: 'Employee');
      empID = authBox.get('employeeID', defaultValue: 'FT-000');
    });

    _fetchTodayStatus(empID);
    _fetchDashboardMetrics(empID);
  }

  Future<void> _initOfflineAndSync() async {
    if (!Hive.isBoxOpen('offlineAttendanceBox')) {
      await Hive.openBox('offlineAttendanceBox');
    }
  }

  Future<void> _fetchTodayStatus(String currentEmpID) async {
    if (currentEmpID == "Loading..." || currentEmpID.isEmpty) return;
    try {
      final response = await http
          .get(Uri.parse('$_baseUrl/attendance/status/$currentEmpID'))
          .timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (!mounted) return;
        setState(() {
          String rawStatus = data['status'].toString().toLowerCase().trim();
          if (rawStatus == "present" || rawStatus == "on time") {
            todayStatus = "Present";
          } else if (rawStatus == "late") {
            todayStatus = "Late";
          } else if (rawStatus == "half-day" || rawStatus == "halfday") {
            todayStatus = "Half-Day";
          } else {
            todayStatus = "Not Marked";
          }
          _isStatusLoading = false;
        });
      } else {
        if (mounted) setState(() => _isStatusLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isStatusLoading = false);
    }
  }

  Future<void> _fetchDashboardMetrics(String currentEmpID) async {
    if (currentEmpID == "Loading..." || currentEmpID.isEmpty) return;

    final pktNow = _pktNow();
    int currentMonth = pktNow.month;
    int currentYear = pktNow.year;
    String cacheKey = "cache_${currentEmpID}_${currentMonth}_$currentYear";

    if (!Hive.isBoxOpen('historyCacheBox')) {
      await Hive.openBox('historyCacheBox');
    }
    var cacheBox = Hive.box('historyCacheBox');

    try {
      final response = await http.get(
        Uri.parse(
            '$_baseUrl/report/bymonth?employeeID=$currentEmpID&month=$currentMonth&year=$currentYear'),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> allRecords =
            data['records'] ?? data['attendance'] ?? data['data'] ?? [];

        final List<dynamic> dbRecords = allRecords.where((record) {
          try {
            String recordEmpId = '';
            if (record['employeeId'] is Map) {
              recordEmpId =
                  record['employeeId']['employeeID']?.toString() ?? '';
            } else if (record['employeeID'] != null) {
              recordEmpId = record['employeeID'].toString();
            } else if (record['employeeId'] != null) {
              recordEmpId = record['employeeId'].toString();
            }
            return recordEmpId.trim().toUpperCase() ==
                currentEmpID.trim().toUpperCase();
          } catch (e) {
            return false;
          }
        }).toList();

        await cacheBox.put(cacheKey, {
          'employeeCreatedAt': data['employeeCreatedAt'],
          'records': dbRecords
        });
        _processDashboardMetrics(dbRecords);
      } else {
        _loadMetricsFromCache(cacheBox, cacheKey);
      }
    } catch (e) {
      _loadMetricsFromCache(cacheBox, cacheKey);
    }
  }

  void _loadMetricsFromCache(Box cacheBox, String cacheKey) {
    if (cacheBox.containsKey(cacheKey)) {
      final cachedData = cacheBox.get(cacheKey);
      final List<dynamic> cachedRecords = cachedData['records'] ?? [];
      _processDashboardMetrics(cachedRecords);
    } else {
      if (mounted) setState(() => _isMetricsLoading = false);
    }
  }

  void _processDashboardMetrics(List<dynamic> records) {
    int present = 0;
    int late = 0;
    int absent = 0;
    List<Map<String, dynamic>> recent = [];

    records.sort((a, b) {
      DateTime dateA = _safeParseDate(a['date']);
      DateTime dateB = _safeParseDate(b['date']);
      return dateB.compareTo(dateA);
    });

    for (var record in records) {
      String status = record['status'].toString().toLowerCase().trim();

      if (status == 'present' || status == 'on time') {
        present++;
      } else if (status == 'late' || status == 'half-day' || status == 'halfday') {
        late++;
      } else if (status == 'absent') {
        absent++;
      }

      if (recent.length < 3) {
        DateTime parsedDate = _safeParseDate(record['date']);
        String timeText = _formatCheckInTime(record['checkInTime']);
        recent.add({
          'date': DateFormat('d MMM yyyy').format(parsedDate),
          'time': timeText,
          'status': status
        });
      }
    }

    if (mounted) {
      setState(() {
        _presentCount = present;
        _lateCount = late;
        _absentCount = absent;
        _recentActivities = recent;
        _isMetricsLoading = false;
      });
    }
  }

  // checkInTime ko PKT mein format karta hai (e.g. "10:42 AM")
  String _formatCheckInTime(dynamic timeValue) {
    if (timeValue == null) return '';
    try {
      DateTime parsed = DateTime.parse(timeValue.toString());
      DateTime pkt = parsed.toUtc().add(const Duration(hours: 5));
      return DateFormat('h:mm a').format(pkt);
    } catch (e) {
      return '';
    }
  }

  Future<void> _handleRefresh() async {
    setState(() {
      _isStatusLoading = true;
      _isMetricsLoading = true;
    });
    await Future.wait([
      _fetchTodayStatus(empID),
      _fetchDashboardMetrics(empID),
    ]);
  }

  // Greeting PKT hour use karti hai, device timezone se independent
  String getGreeting() {
    final utc = DateTime.now().toUtc();
    final pkt = utc.add(const Duration(hours: 5));
    var hour = pkt.hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Color getStatusColor(String status) {
    String s = status.toLowerCase();
    if (s == "present" || s == "on time") return const Color(0xFF059669);
    if (s == "late") return const Color(0xFFC05621);
    if (s == "half-day" || s == "halfday") return Colors.redAccent;
    return Colors.orange;
  }

  Color getStatusBgColor(String status) {
    String s = status.toLowerCase();
    if (s == "present" || s == "on time") return const Color(0xFFECFDF5);
    if (s == "late") return const Color(0xFFFFF7ED);
    if (s == "half-day" || s == "halfday") return const Color(0xFFFEF2F2);
    return const Color(0xFFFFF3E0);
  }

  // ─── Quick Action Button ───────────────────────────────────────────────────
  Widget _buildQuickAction(IconData icon, String title, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Icon(icon, color: const Color(0xFF212529), size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF212529),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Recent Activity Row ───────────────────────────────────────────────────
  Widget _buildActivityItem(Map<String, dynamic> log) {
    final color = getStatusColor(log['status']);
    final bgColor = getStatusBgColor(log['status']);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: ListTile(
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: bgColor,
          child: Icon(Icons.history_rounded, color: color, size: 20),
        ),
        title: Text(
          log['date'],
          style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Color(0xFF212529)),
        ),
        // ✅ Time ab subtitle mein dikhega
        subtitle: (log['time'] != null && log['time'].toString().isNotEmpty)
            ? Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            'Checked in at ${log['time']}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        )
            : null,
        trailing: Container(
          padding:
          const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            log['status'],
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 11),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    DateTime displayDate = _pktNow();
    if (_recentActivities.isNotEmpty) {
      try {
        DateTime latestRecordDate =
        DateFormat('d MMM yyyy').parse(_recentActivities.first['date']);
        if (latestRecordDate.isAfter(displayDate)) {
          displayDate = latestRecordDate;
        }
      } catch (_) {}
    }
    String currentDate = DateFormat('EEEE, d MMMM').format(displayDate);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'FirmTrack',
          style: TextStyle(
              color: Color(0xFF212529), fontWeight: FontWeight.bold, fontSize: 18),
        ),
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
              child: const Icon(Icons.menu_rounded, color: Color(0xFF212529), size: 22),
            ),
          ),
        ),
      ),
      drawer: const CustomDrawer(selectedIndex: 0),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: RefreshIndicator(
              onRefresh: _handleRefresh,
              color: const Color(0xFF212529),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [

                    // ── Greeting ──────────────────────────────────────────
                    Text(
                      '${getGreeting()},\n$employeeName!',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF212529),
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      currentDate,
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 28),

                    // ── Status Card ───────────────────────────────────────
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          )
                        ],
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'TODAY\'S STATUS',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 12),

                          _isStatusLoading
                              ? const SizedBox(
                              height: 36,
                              width: 36,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFF212529)))
                              : Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 8),
                            decoration: BoxDecoration(
                              color: getStatusBgColor(todayStatus),
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: getStatusColor(todayStatus),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  todayStatus,
                                  style: TextStyle(
                                    fontSize: 20,
                                    color: getStatusColor(todayStatus),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),
                          Divider(color: Colors.grey.shade100, thickness: 1),
                          const SizedBox(height: 16),

                          _isMetricsLoading
                              ? const Center(
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.grey))
                              : Row(
                            mainAxisAlignment:
                            MainAxisAlignment.spaceEvenly,
                            children: [
                              Column(children: [
                                Text('$_presentCount',
                                    style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF059669))),
                                const SizedBox(height: 2),
                                const Text('Present',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w600))
                              ]),
                              Container(
                                  width: 1,
                                  height: 34,
                                  color: Colors.grey.shade200),
                              Column(children: [
                                Text('$_lateCount',
                                    style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange.shade700)),
                                const SizedBox(height: 2),
                                const Text('Late/Half',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w600))
                              ]),
                              Container(
                                  width: 1,
                                  height: 34,
                                  color: Colors.grey.shade200),
                              Column(children: [
                                Text('$_absentCount',
                                    style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFFDC2626))),
                                const SizedBox(height: 2),
                                const Text('Absent',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w600))
                              ]),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ── Quick Actions ─────────────────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildQuickAction(
                          Icons.history_rounded,
                          'History',
                              () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                  const HistoryScreen())),
                        ),
                        _buildQuickAction(
                          Icons.calendar_month_rounded,
                          'Calendar',
                              () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                  const CalendarScreen())),
                        ),
                        _buildQuickAction(
                          Icons.flight_takeoff_rounded,
                          'Leave',
                              () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Please call admin to request leave.',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                backgroundColor: Color(0xFF212529),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.all(Radius.circular(10)),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 36),

                    // ── Scan QR Button ────────────────────────────────────
                    Center(
                      child: GestureDetector(
                        onTap: () async {
                          final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (context) =>
                                  const ScannerScreen()));
                          if (result == true) {
                            setState(() {
                              _isStatusLoading = true;
                              _isMetricsLoading = true;
                            });
                            _fetchTodayStatus(empID);
                            _fetchDashboardMetrics(empID);
                          }
                        },
                        child: Container(
                          height: 155,
                          width: 155,
                          decoration: BoxDecoration(
                            color: const Color(0xFF212529),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF212529)
                                    .withValues(alpha: 0.28),
                                blurRadius: 32,
                                offset: const Offset(0, 12),
                              )
                            ],
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.qr_code_scanner_rounded,
                                  size: 48, color: Colors.white),
                              SizedBox(height: 10),
                              Text(
                                'SCAN QR',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 36),

                    // ── Recent Activity ───────────────────────────────────
                    const Text(
                      'Recent Activity',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF212529)),
                    ),
                    const SizedBox(height: 14),

                    _isMetricsLoading
                        ? const Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF212529)))
                        : _recentActivities.isEmpty
                        ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border:
                        Border.all(color: Colors.grey.shade100),
                      ),
                      child: const Text(
                        'No recent attendance marked.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                        : Column(
                      children: _recentActivities
                          .map((log) => _buildActivityItem(log))
                          .toList(),
                    ),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}