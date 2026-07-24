import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'custom_drawer.dart';
import 'package:intl/intl.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  Map<DateTime, Map<String, dynamic>> _attendanceData = {};
  String? _employeeCreatedAtString;
  int _defaultAbsentDeduction = 0;
  bool _isLoading = true;

  Timer? _autoSyncTimer;

  final String _baseUrl =
      "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _selectedDay = _normalizeDate(_focusedDay);
    _fetchMonthData(_focusedDay.month, _focusedDay.year);

    _autoSyncTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _fetchMonthData(_focusedDay.month, _focusedDay.year,
          isBackground: true);
    });
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  DateTime _normalizeDate(DateTime date) {
    return DateTime.utc(date.year, date.month, date.day);
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

  Future<void> _fetchMonthData(int month, int year,
      {bool isBackground = false}) async {
    if (!isBackground) setState(() => _isLoading = true);

    var authBox = Hive.box('authBox');
    String empID = authBox.get('employeeID', defaultValue: '');
    String cacheKey = "cache_${empID}_${month}_$year";

    if (!Hive.isBoxOpen('historyCacheBox')) {
      await Hive.openBox('historyCacheBox');
    }
    var cacheBox = Hive.box('historyCacheBox');

    try {
      final response = await http.get(
        Uri.parse(
            '$_baseUrl/report/bymonth?employeeID=$empID&month=$month&year=$year'),
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

        _processCalendarData(dbRecords);
      } else {
        if (!isBackground) _loadCalendarFromCache(cacheBox, cacheKey);
      }
    } catch (e) {
      if (!isBackground) _loadCalendarFromCache(cacheBox, cacheKey);
    }
  }

  void _processCalendarData(List<dynamic> dbRecords) {
    Map<DateTime, Map<String, dynamic>> temporaryMap = {};

    for (var record in dbRecords) {
      DateTime? parsedDate = _safeParseDate(record['date']);
      if (parsedDate != null) {
        DateTime targetKey = DateTime.utc(
          parsedDate.year,
          parsedDate.month,
          parsedDate.day,
        );

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

        // ✅ NEW: checkInTime parse karke store karo
        String checkInTimeText = _formatCheckInTime(record['checkInTime']);

        temporaryMap[targetKey] = {
          "status": uiStatus,
          "deduction": parsedDeduction,
          "checkInTime": checkInTimeText,
        };
      }
    }

    if (!mounted) return;
    setState(() {
      _attendanceData = temporaryMap;
      _isLoading = false;
    });
  }

  void _loadCalendarFromCache(Box cacheBox, String cacheKey) {
    if (cacheBox.containsKey(cacheKey)) {
      final cachedData = cacheBox.get(cacheKey);
      _employeeCreatedAtString = cachedData['employeeCreatedAt'];
      _defaultAbsentDeduction = cachedData['defaultAbsentDeduction'] != null
          ? int.parse(cachedData['defaultAbsentDeduction'].toString())
          : 0;
      final List<dynamic> cachedRecords = cachedData['records'] ?? [];
      _processCalendarData(cachedRecords);
    } else {
      if (!mounted) return;
      setState(() {
        _attendanceData = {};
        _isLoading = false;
      });
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
        return Icons.remove_rounded;
    }
  }

  // ── Day detail card ───────────────────────────────────────────────────────

  Widget _detailCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    String? trailingText,
    Color? trailingColor,
    Color? borderColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor ?? Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: ListTile(
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
              color: iconBg, borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        title: Text(
          title,
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              color: iconColor == Colors.grey
                  ? Colors.grey
                  : const Color(0xFF212529)),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
              fontSize: 12,
              color: iconColor == Colors.grey
                  ? Colors.grey.shade400
                  : Colors.grey.shade500),
        ),
        trailing: trailingText != null
            ? Container(
          padding:
          const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: (trailingColor ?? iconColor).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            trailingText,
            style: TextStyle(
              color: trailingColor ?? iconColor,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        )
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nowUtc = DateTime.now().toUtc();
    final pktNow = nowUtc.add(const Duration(hours: 5));
    DateTime today = DateTime.utc(pktNow.year, pktNow.month, pktNow.day);

    if (_attendanceData.isNotEmpty) {
      List<DateTime> recordDates = _attendanceData.keys.toList();
      recordDates.sort();
      DateTime maxDate = recordDates.last;
      DateTime normalizedMax =
      DateTime.utc(maxDate.year, maxDate.month, maxDate.day);
      if (normalizedMax.isAfter(today)) today = normalizedMax;
    }

    int autoAbsentDeduction = _defaultAbsentDeduction;

    DateTime? creationDate;
    if (_employeeCreatedAtString != null) {
      DateTime? temp = _safeParseDate(_employeeCreatedAtString);
      if (temp != null) {
        creationDate = DateTime.utc(temp.year, temp.month, temp.day);
      }
    }

    if (creationDate == null) {
      if (_attendanceData.isNotEmpty) {
        List<DateTime> parsedDates = _attendanceData.keys.toList();
        parsedDates.sort();
        creationDate = parsedDates.first;
      } else {
        creationDate = today;
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      appBar: AppBar(
        title: const Text(
          'Attendance Calendar',
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
      drawer: const CustomDrawer(selectedIndex: 3),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: SingleChildScrollView(
            padding:
            const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                // ── Calendar Card ─────────────────────────────────────
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      )
                    ],
                  ),
                  child: TableCalendar(
                    firstDay: DateTime.utc(2024, 1, 1),
                    lastDay: DateTime.utc(2030, 12, 31),
                    focusedDay: _focusedDay,
                    selectedDayPredicate: (day) =>
                        isSameDay(_selectedDay, day),
                    onDaySelected: (selectedDay, focusedDay) {
                      setState(() {
                        _selectedDay = _normalizeDate(selectedDay);
                        _focusedDay = focusedDay;
                      });
                    },
                    onPageChanged: (focusedDay) {
                      _focusedDay = focusedDay;
                      _fetchMonthData(
                          focusedDay.month, focusedDay.year);
                    },
                    calendarFormat: CalendarFormat.month,
                    headerStyle: HeaderStyle(
                      formatButtonVisible: false,
                      titleCentered: true,
                      titleTextStyle: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Color(0xFF212529)),
                      leftChevronIcon: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F7FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.chevron_left_rounded,
                            color: Color(0xFF212529), size: 20),
                      ),
                      rightChevronIcon: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F7FE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.chevron_right_rounded,
                            color: Color(0xFF212529), size: 20),
                      ),
                    ),
                    calendarStyle: CalendarStyle(
                      todayDecoration: BoxDecoration(
                        color: const Color(0xFF212529)
                            .withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      todayTextStyle: const TextStyle(
                          color: Color(0xFF212529),
                          fontWeight: FontWeight.bold),
                      selectedDecoration: const BoxDecoration(
                        color: Color(0xFF212529),
                        shape: BoxShape.circle,
                      ),
                      selectedTextStyle: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold),
                      weekendTextStyle:
                      const TextStyle(color: Color(0xFF1D4ED8)),
                      outsideDaysVisible: false,
                    ),
                    daysOfWeekStyle: const DaysOfWeekStyle(
                      weekdayStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey),
                      weekendStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1D4ED8)),
                    ),
                    calendarBuilders: CalendarBuilders(
                      markerBuilder: (context, date, events) {
                        final normalizedDate = _normalizeDate(date);

                        if (creationDate != null &&
                            normalizedDate.isBefore(creationDate!)) {
                          return null;
                        }

                        if (_attendanceData
                            .containsKey(normalizedDate)) {
                          String status =
                          _attendanceData[normalizedDate]!['status'];
                          Color dotColor = const Color(0xFF059669);
                          if (status == 'Late') {
                            dotColor = const Color(0xFFC05621);
                          }
                          if (status == 'Half-Day') {
                            dotColor = const Color(0xFFDC2626);
                          }
                          if (status == 'Absent') {
                            dotColor = const Color(0xFFDC2626);
                          }

                          return Positioned(
                            bottom: 4,
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                  color: dotColor,
                                  shape: BoxShape.circle),
                            ),
                          );
                        } else {
                          if (normalizedDate.isBefore(today) &&
                              normalizedDate.weekday !=
                                  DateTime.sunday) {
                            return Positioned(
                              bottom: 4,
                              child: Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                    color: Color(0xFFDC2626),
                                    shape: BoxShape.circle),
                              ),
                            );
                          }
                          if (normalizedDate.isBefore(today) &&
                              normalizedDate.weekday ==
                                  DateTime.sunday) {
                            return Positioned(
                              bottom: 4,
                              child: Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                    color: Color(0xFF1D4ED8),
                                    shape: BoxShape.circle),
                              ),
                            );
                          }
                        }
                        return null;
                      },
                    ),
                  ),
                ),

                // ── Legend ────────────────────────────────────────────
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade100),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _legendDot(const Color(0xFF059669), 'On Time'),
                      _legendDot(const Color(0xFFC05621), 'Late'),
                      _legendDot(const Color(0xFFDC2626), 'Absent'),
                      _legendDot(const Color(0xFF1D4ED8), 'Weekend'),
                    ],
                  ),
                ),

                // ── Day Details ───────────────────────────────────────
                const SizedBox(height: 24),
                const Text(
                  'Day Details',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF212529)),
                ),
                const SizedBox(height: 12),

                _isLoading
                    ? const Padding(
                  padding: EdgeInsets.all(20.0),
                  child: Center(
                      child: CircularProgressIndicator(
                          color: Color(0xFF212529))),
                )
                    : Builder(
                  builder: (context) {
                    final normalizedSelected =
                    _normalizeDate(_selectedDay!);

                    // Before joining
                    if (creationDate != null &&
                        normalizedSelected
                            .isBefore(creationDate!)) {
                      return _detailCard(
                        icon: Icons.person_off_outlined,
                        iconColor: Colors.grey,
                        iconBg: Colors.grey.shade100,
                        title: 'Before Joining',
                        subtitle:
                        'This date is prior to employee registration.',
                        borderColor: Colors.grey.shade200,
                      );
                    }

                    // Has record
                    if (_attendanceData
                        .containsKey(normalizedSelected)) {
                      var record =
                      _attendanceData[normalizedSelected]!;
                      final String status = record['status'];
                      int itemDeduction = int.parse(
                          record['deduction'].toString());
                      // ✅ NEW: checkInTime extract karo
                      final String checkInTime =
                          record['checkInTime']?.toString() ?? '';

                      return _detailCard(
                        icon: _statusIcon(status),
                        iconColor: _statusColor(status),
                        iconBg: _statusBg(status),
                        title: status,
                        // ✅ FIX: subtitle mein check-in time dikhega
                        subtitle: checkInTime.isNotEmpty
                            ? 'Checked in at $checkInTime'
                            : 'Attendance record marked.',
                        trailingText: itemDeduction > 0
                            ? '- Rs. $itemDeduction'
                            : 'Rs. 0',
                        trailingColor: itemDeduction > 0
                            ? const Color(0xFFDC2626)
                            : const Color(0xFF059669),
                        borderColor: _statusColor(status)
                            .withValues(alpha: 0.15),
                      );
                    }

                    bool isSunday = normalizedSelected.weekday ==
                        DateTime.sunday;
                    bool isPast =
                    normalizedSelected.isBefore(today);

                    if (isSunday) {
                      return _detailCard(
                        icon: Icons.weekend_rounded,
                        iconColor: const Color(0xFF1D4ED8),
                        iconBg: const Color(0xFFEFF6FF),
                        title: 'Weekend',
                        subtitle: 'Official non-working day.',
                        borderColor: const Color(0xFF1D4ED8)
                            .withValues(alpha: 0.15),
                      );
                    } else if (isPast) {
                      return _detailCard(
                        icon: Icons.close_rounded,
                        iconColor: const Color(0xFFDC2626),
                        iconBg: const Color(0xFFFEF2F2),
                        title: 'Absent (Auto)',
                        subtitle: 'System auto marked absence.',
                        trailingText:
                        '- Rs. $autoAbsentDeduction',
                        trailingColor: const Color(0xFFDC2626),
                        borderColor: const Color(0xFFDC2626)
                            .withValues(alpha: 0.15),
                      );
                    } else {
                      return _detailCard(
                        icon: Icons.remove_rounded,
                        iconColor: Colors.grey,
                        iconBg: Colors.grey.shade100,
                        title: 'Upcoming / No record',
                        subtitle: 'Future calendar slot.',
                        borderColor: Colors.grey.shade200,
                      );
                    }
                  },
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration:
          BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600),
        ),
      ],
    );
  }
}