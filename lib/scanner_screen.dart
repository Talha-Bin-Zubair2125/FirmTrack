import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  bool _isProcessing = false;
  final MobileScannerController _cameraController = MobileScannerController();

  late AnimationController _animationController;
  late Animation<double> _animation;

  // ✅ Original Admin base URL
  final String _baseUrl = "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _checkLocationPermission();
    _initOfflineAndSync();

    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0, end: 230).animate(_animationController);
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _checkLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      await Geolocator.requestPermission();
    }
  }

  void _showCustomSnackBar(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle_outline : Icons.error_outline,
              color: Colors.white,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: isSuccess ? Colors.green.shade600 : Colors.redAccent.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.only(bottom: 24, left: 16, right: 16),
        elevation: 6,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _initOfflineAndSync() async {
    if (!Hive.isBoxOpen('offlineAttendanceBox')) {
      await Hive.openBox('offlineAttendanceBox');
    }
    _syncOfflineData();
  }

  Future<void> _syncOfflineData() async {
    var offlineBox = Hive.box('offlineAttendanceBox');
    if (offlineBox.isEmpty) return;

    List<dynamic> keysToDelete = [];
    for (var key in offlineBox.keys) {
      final Map<dynamic, dynamic> record = offlineBox.get(key);
      try {
        final response = await http.post(
          Uri.parse('$_baseUrl/mark'),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({
            "token": record["token"],
            "employeeID": record["employeeID"],
            "isOfflineSync": true
          }),
        ).timeout(const Duration(seconds: 4));

        // 🔥 FIX: 400 Bad Request aanay par bhi local delete kar dega taake spam loop break ho jaye!
        if (response.statusCode == 201 || response.statusCode == 200 || response.statusCode == 400) {
          keysToDelete.add(key);
        }
      } catch (e) {
        break;
      }
    }

    if (keysToDelete.isNotEmpty) {
      for (var key in keysToDelete) {
        await offlineBox.delete(key);
      }
    }
  }

  Future<void> _markAttendanceLive(String qrToken) async {
    var authBox = Hive.box('authBox');
    String empID = authBox.get('employeeID', defaultValue: '');

    if (empID.isEmpty) {
      if (!mounted) return;
      _showCustomSnackBar('Error: Employee ID not found locally!', isSuccess: false);
      Navigator.pop(context, false);
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/mark'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "token": qrToken,
          "employeeID": empID,
        }),
      ).timeout(const Duration(seconds: 5));

      final data = jsonDecode(response.body);
      if (!mounted) return;

      if (response.statusCode == 201 || response.statusCode == 200) {
        HapticFeedback.heavyImpact();
        _showCustomSnackBar(data['message'] ?? 'Attendance Marked!', isSuccess: true);
        Navigator.pop(context, true);
      } else {
        HapticFeedback.vibrate();
        _showCustomSnackBar(data['message'] ?? 'Failed to mark attendance', isSuccess: false);
        Navigator.pop(context, false);
      }
    } catch (e) {
      var offlineBox = Hive.box('offlineAttendanceBox');
      await offlineBox.add({
        "token": qrToken,
        "employeeID": empID,
        "timestamp": DateTime.now().toIso8601String(),
      });

      if (!mounted) return;
      HapticFeedback.mediumImpact();
      _showCustomSnackBar('Offline: Internet absent, Attendance saved locally!', isSuccess: true);
      Navigator.pop(context, true);
    }
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      String qrCodeData = barcodes.first.rawValue ?? "";

      if (qrCodeData.isEmpty || qrCodeData == "Unknown Data") return;

      setState(() {
        _isProcessing = true;
      });

      await _cameraController.stop();
      _markAttendanceLive(qrCodeData);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan QR Code', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _cameraController,
              builder: (context, state, child) {
                switch (state.torchState) {
                  case TorchState.on:
                    return const Icon(Icons.flash_on, color: Colors.yellow);
                  case TorchState.off:
                  case TorchState.auto:
                  case TorchState.unavailable:
                  default:
                    return const Icon(Icons.flash_off, color: Colors.grey);
                }
              },
            ),
            onPressed: () => _cameraController.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch, color: Colors.white),
            onPressed: () => _cameraController.switchCamera(),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          MobileScanner(
            controller: _cameraController,
            onDetect: _onDetect,
          ),
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.7),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.greenAccent, width: 3),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Stack(
                children: [
                  AnimatedBuilder(
                    animation: _animation,
                    builder: (context, child) {
                      return Positioned(
                        top: _animation.value,
                        left: 0,
                        right: 0,
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(
                            color: Colors.greenAccent,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.greenAccent.withValues(alpha: 0.5),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.6),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.greenAccent),
                    SizedBox(height: 16),
                    Text(
                      'Processing Attendance...',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          if (!_isProcessing)
            const Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Text(
                'Align the QR code within the frame to scan',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ),
        ],
      ),
    );
  }
}