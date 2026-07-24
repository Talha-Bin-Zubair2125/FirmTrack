import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'custom_drawer.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  Map<String, Map<String, dynamic>> _attendanceData = {};
  String? _employeeCreatedAtString;
  int _defaultAbsentDeduction = 0;
  bool _isLoading = true;

  Timer? _autoSyncTimer;

  final String _baseUrl =
      "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  final List<int> _years = [2024, 2025, 2026, 2027, 2028];
  final List<String> _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  @override
  void initState() {
    super.initState();
    _fetchLiveHistory();
    _autoSyncTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _fetchLiveHistory(isBackground: true);
    });
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  // UTC → PKT (+5) conversion
  DateTime? _safeParseDate(dynamic dateValue) {
    if (dateValue == null) return null;

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
        List<String> parts =
        str.contains('/') ? str.split('/') : str.split('-');
        if (parts.length >= 3) {
          int d = int.parse(parts[0]);
          int m = int.parse(parts[1]);
          int y = int.parse(parts[2].substring(0, 4));
          return DateTime(y, m, d);
        }
      } catch (_) {}
    }
    return null;
  }

  // ✅ NEW: checkInTime ko PKT mein format karta hai (e.g. "10:42 AM")
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

  Future<void> _fetchLiveHistory({bool isBackground = false}) async {
    if (!isBackground) {
      setState(() => _isLoading = true);
    }

    var authBox = Hive.box('authBox');
    String empID = authBox.get('employeeID', defaultValue: '');
    String cacheKey = "cache_${empID}_${_selectedMonth}_$_selectedYear";

    if (!Hive.isBoxOpen('historyCacheBox')) {
      await Hive.openBox('historyCacheBox');
    }
    var cacheBox = Hive.box('historyCacheBox');

    try {
      final response = await http.get(
        Uri.parse(
            '$_baseUrl/report/bymonth?employeeID=$empID&month=$_selectedMonth&year=$_selectedYear'),
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
                empID.trim().toUpperCase();
          } catch (e) {
            return false;
          }
        }).toList();

        _employeeCreatedAtString = data['employeeCreatedAt'];
        _defaultAbsentDeduction = data['defaultAbsentDeduction'] != null
            ? int.parse(data['defaultAbsentDeduction'].toString())
            : 0;

        await cacheBox.put(cacheKey, {
          'employeeCreatedAt': _employeeCreatedAtString,
          'defaultAbsentDeduction': _defaultAbsentDeduction,
          'records': dbRecords,
        });

        _parseAndDisplayData(dbRecords);
      } else {
        if (!isBackground) _loadFromLocalCache(cacheBox, cacheKey);
      }
    } catch (e) {
      if (!isBackground) _loadFromLocalCache(cacheBox, cacheKey);
    }
  }

  void _parseAndDisplayData(List<dynamic> dbRecords) {
    Map<String, Map<String, dynamic>> parsedData = {};
    for (var record in dbRecords) {
      DateTime? parsedDate = _safeParseDate(record['date']);
      if (parsedDate != null) {
        String uiKey = DateFormat('d MMMM yyyy').format(parsedDate);
        String rawStatus = record['status'].toString().toLowerCase().trim();

        String uiStatus = "On Time";
        if (rawStatus == "late") uiStatus = "Late";
        if (rawStatus == "absent") uiStatus = "Absent";
        if (rawStatus == "half-day" || rawStatus == "halfday") {
          uiStatus = "Half-Day";
        }
        if (rawStatus == "present") uiStatus = "On Time";

        int parsedDeduction = 0;
        if (record['deduction'] != null) {
          parsedDeduction =
              num.parse(record['deduction'].toString()).abs().toInt();
        }

        // ✅ NEW: checkInTime parse karo aur store karo
        String checkInTimeText = _formatCheckInTime(record['checkInTime']);

        parsedData[uiKey] = {
          "status": uiStatus,
          "deduction": parsedDeduction,
          "checkInTime": checkInTimeText,
        };
      }
    }

    if (!mounted) return;
    setState(() {
      _attendanceData = parsedData;
      _isLoading = false;
    });
  }

  void _loadFromLocalCache(Box cacheBox, String cacheKey) {
    if (cacheBox.containsKey(cacheKey)) {
      final cachedData = cacheBox.get(cacheKey);
      _employeeCreatedAtString = cachedData['employeeCreatedAt'];
      _defaultAbsentDeduction = cachedData['defaultAbsentDeduction'] != null
          ? int.parse(cachedData['defaultAbsentDeduction'].toString())
          : 0;
      final List<dynamic> cachedRecords = cachedData['records'] ?? [];
      _parseAndDisplayData(cachedRecords);
    } else {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  Color _statusColor(String status) {
    switch (status) {
      case 'On Time':
        return const Color(0xFF059669);
      case 'Late':
        return const Color(0xFFC05621);
      case 'Half-Day':
        return const Color(0xFFDC2626);
      case 'Absent':
        return const Color(0xFFDC2626);
      default:
        return Colors.grey;
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'On Time':
        return const Color(0xFFECFDF5);
      case 'Late':
        return const Color(0xFFFFF7ED);
      case 'Half-Day':
        return const Color(0xFFFEF2F2);
      case 'Absent':
        return const Color(0xFFFEF2F2);
      default:
        return const Color(0xFFF3F4F6);
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'On Time':
        return Icons.check_rounded;
      case 'Late':
        return Icons.access_time_rounded;
      case 'Half-Day':
        return Icons.hourglass_bottom_rounded;
      case 'Absent':
        return Icons.close_rounded;
      default:
        return Icons.remove;
    }
  }

  // ── Log card builders ─────────────────────────────────────────────────────

  Widget _recordCard(String formattedDate, Map<String, dynamic> record) {
    final String status = record['status'];
    final int deduction = int.parse(record['deduction'].toString());
    final String checkInTime = record['checkInTime']?.toString() ?? '';
    final color = _statusColor(status);
    final bg = _statusBg(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
      child: ListTile(
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
          child: Icon(_statusIcon(status), color: color, size: 20),
        ),
        title: Text(
          formattedDate,
          style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Color(0xFF212529)),
        ),
        // ✅ FIX: Status ke sath check-in time bhi dikhega
        subtitle: Text(
          checkInTime.isNotEmpty
              ? 'Status: $status  •  $checkInTime'
              : 'Status: $status',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        trailing: Container(
          padding:
          const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: deduction > 0
                ? const Color(0xFFFEF2F2)
                : const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            deduction > 0 ? '- Rs. $deduction' : 'Rs. 0',
            style: TextStyle(
              color: deduction > 0
                  ? const Color(0xFFDC2626)
                  : const Color(0xFF059669),
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _specialCard({
    required String formattedDate,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String subtitle,
    String? trailingText,
    Color? trailingColor,
    Color? cardBg,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: cardBg ?? Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: iconColor.withValues(alpha: 0.15)),
      ),
      child: ListTile(
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration:
          BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          formattedDate,
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: iconColor),
        ),
        subtitle: Text(subtitle,
            style: TextStyle(fontSize: 12, color: iconColor.withValues(alpha: 0.7))),
        trailing: trailingText != null
            ? Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: (trailingColor ?? iconColor).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            trailingText,
            style: TextStyle(
              color: trailingColor ?? iconColor,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        )
            : null,
      ),
    );
  }

  // ── Stat card ─────────────────────────────────────────────────────────────

  Widget _buildStatCard(String title, int count, Color color, Color bgColor, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          )
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                color: bgColor, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            '$count',
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    int daysInMonth =
    DateUtils.getDaysInMonth(_selectedYear, _selectedMonth);

    final nowUtc = DateTime.now().toUtc();
    final pktNow = nowUtc.add(const Duration(hours: 5));
    DateTime today = DateTime(pktNow.year, pktNow.month, pktNow.day);

    if (_attendanceData.isNotEmpty) {
      List<DateTime> recordDates = [];
      for (String dateKey in _attendanceData.keys) {
        try {
          recordDates.add(DateFormat('d MMMM yyyy').parse(dateKey));
        } catch (_) {}
      }
      if (recordDates.isNotEmpty) {
        recordDates.sort();
        if (recordDates.last.isAfter(today)) {
          today = recordDates.last;
        }
      }
    }

    int autoAbsentDeduction = _defaultAbsentDeduction;
    int totalDeduction = 0;
    int lateDaysCount = 0;
    int onTimeCount = 0;
    int absentDaysCount = 0;
    int halfDayCount = 0;

    DateTime? creationDate;
    if (_employeeCreatedAtString != null) {
      DateTime? temp = _safeParseDate(_employeeCreatedAtString);
      if (temp != null) {
        creationDate = DateTime(temp.year, temp.month, temp.day);
      }
    }

    if (creationDate == null) {
      if (_attendanceData.isNotEmpty) {
        List<DateTime> parsedDates = [];
        for (String dateKey in _attendanceData.keys) {
          try {
            parsedDates.add(DateFormat('d MMMM yyyy').parse(dateKey));
          } catch (_) {}
        }
        if (parsedDates.isNotEmpty) {
          parsedDates.sort();
          creationDate = parsedDates.first;
        }
      } else {
        creationDate = today;
      }
    }

    for (int i = 1; i <= daysInMonth; i++) {
      DateTime currentDate = DateTime(_selectedYear, _selectedMonth, i);
      if (creationDate != null && currentDate.isBefore(creationDate)) {
        continue;
      }
      String formattedDate = DateFormat('d MMMM yyyy').format(currentDate);
      if (_attendanceData.containsKey(formattedDate)) {
        var record = _attendanceData[formattedDate]!;
        int cardDeduction = int.parse(record['deduction'].toString());
        totalDeduction += cardDeduction;
        if (record['status'] == 'Late') lateDaysCount++;
        else if (record['status'] == 'On Time') onTimeCount++;
        else if (record['status'] == 'Absent') absentDaysCount++;
        else if (record['status'] == 'Half-Day') halfDayCount++;
      } else {
        if (currentDate.isBefore(today) &&
            currentDate.weekday != DateTime.sunday) {
          absentDaysCount++;
          totalDeduction += autoAbsentDeduction;
        }
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      appBar: AppBar(
        title: const Text(
          'My History',
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
      drawer: const CustomDrawer(selectedIndex: 2),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: Column(
              children: [

                // ── Month / Year Dropdowns ──────────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding:
                        const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: _selectedMonth,
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded,
                                color: Color(0xFF212529)),
                            items: List.generate(
                              12,
                                  (index) => DropdownMenuItem(
                                value: index + 1,
                                child: Text(
                                  _months[index],
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                      color: Color(0xFF212529)),
                                ),
                              ),
                            ),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => _selectedMonth = val);
                                _fetchLiveHistory();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding:
                        const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: _selectedYear,
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded,
                                color: Color(0xFF212529)),
                            items: _years
                                .map(
                                  (year) => DropdownMenuItem(
                                value: year,
                                child: Text(
                                  year.toString(),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                      color: Color(0xFF212529)),
                                ),
                              ),
                            )
                                .toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => _selectedYear = val);
                                _fetchLiveHistory();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Body ───────────────────────────────────────────────
                _isLoading
                    ? const Expanded(
                  child: Center(
                    child: CircularProgressIndicator(
                        color: Color(0xFF212529)),
                  ),
                )
                    : Expanded(
                  child: Column(
                    children: [

                      // ── Deduction card ──────────────────────
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: const Color(0xFF212529),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF212529)
                                  .withValues(alpha: 0.2),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            )
                          ],
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Total Deductions — ${_months[_selectedMonth - 1]} $_selectedYear',
                              style: TextStyle(
                                color: Colors.white
                                    .withValues(alpha: 0.6),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Rs. $totalDeduction',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // ── Stat cards ──────────────────────────
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              'On Time',
                              onTimeCount,
                              const Color(0xFF059669),
                              const Color(0xFFECFDF5),
                              Icons.check_rounded,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildStatCard(
                              'Late/Half',
                              lateDaysCount + halfDayCount,
                              const Color(0xFFC05621),
                              const Color(0xFFFFF7ED),
                              Icons.access_time_rounded,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildStatCard(
                              'Absent',
                              absentDaysCount,
                              const Color(0xFFDC2626),
                              const Color(0xFFFEF2F2),
                              Icons.close_rounded,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // ── Log title ───────────────────────────
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Attendance Log',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF212529)),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // ── Log list ────────────────────────────
                      Expanded(
                        child: ListView.builder(
                          itemCount: daysInMonth,
                          itemBuilder: (context, index) {
                            int day = index + 1;
                            DateTime currentDate = DateTime(
                                _selectedYear, _selectedMonth, day);

                            // Before joining
                            if (creationDate != null &&
                                currentDate.isBefore(creationDate!)) {
                              return _specialCard(
                                formattedDate: DateFormat('d MMMM yyyy')
                                    .format(currentDate),
                                icon: Icons.person_off_outlined,
                                iconColor: Colors.grey,
                                iconBg: Colors.grey.shade100,
                                subtitle: 'Before joining',
                                cardBg: Colors.white,
                              );
                            }

                            String formattedDate =
                            DateFormat('d MMMM yyyy')
                                .format(currentDate);
                            bool hasRecord =
                            _attendanceData.containsKey(formattedDate);

                            if (hasRecord) {
                              return _recordCard(
                                formattedDate,
                                _attendanceData[formattedDate]!,
                              );
                            }

                            bool isSunday =
                                currentDate.weekday == DateTime.sunday;
                            bool isPast = currentDate.isBefore(today);

                            if (isSunday) {
                              return _specialCard(
                                formattedDate: formattedDate,
                                icon: Icons.weekend_rounded,
                                iconColor: const Color(0xFF1D4ED8),
                                iconBg: const Color(0xFFEFF6FF),
                                subtitle: 'Weekend',
                                cardBg: Colors.white,
                              );
                            } else if (isPast) {
                              return _specialCard(
                                formattedDate: formattedDate,
                                icon: Icons.close_rounded,
                                iconColor: const Color(0xFFDC2626),
                                iconBg: const Color(0xFFFEF2F2),
                                subtitle: 'Absent (Auto)',
                                trailingText: '- Rs. $autoAbsentDeduction',
                                trailingColor: const Color(0xFFDC2626),
                                cardBg: Colors.white,
                              );
                            } else {
                              return _specialCard(
                                formattedDate: formattedDate,
                                icon: Icons.remove_rounded,
                                iconColor: Colors.grey,
                                iconBg: Colors.grey.shade100,
                                subtitle: 'Upcoming / No record',
                                cardBg: Colors.white,
                              );
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}