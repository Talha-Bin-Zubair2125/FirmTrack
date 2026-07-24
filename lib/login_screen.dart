import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _idController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _isLoading = false;

  final String _baseUrl = "https://foster-platter-juicy.ngrok-free.dev/api/admin";

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  void _loadSavedCredentials() {
    var authBox = Hive.box('authBox');
    if (authBox.get('rememberMe', defaultValue: false) == true) {
      setState(() {
        _idController.text = authBox.get('savedEmployeeID', defaultValue: '');
        _passwordController.text = authBox.get('savedPassword', defaultValue: '');
        _rememberMe = true;
      });
    }
  }

  void _showCustomSnackBar(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: isSuccess ? Colors.teal : Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (_idController.text.isEmpty || _passwordController.text.isEmpty) {
      _showCustomSnackBar('Please fill in all fields.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/employees/login'),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "employeeID": _idController.text.trim(),
          "password": _passwordController.text.trim(),
        }),
      );

      if (response.statusCode == 200) {
        var data = jsonDecode(response.body);
        var authBox = Hive.box('authBox');
        await authBox.putAll({
          'isLoggedIn': true,
          'employeeID': data['user']['employeeID'],
          'name': data['user']['name'],
          'role': data['user']['role'],
          'rememberMe': _rememberMe,
          'savedEmployeeID': _rememberMe ? _idController.text : null,
          'savedPassword': _rememberMe ? _passwordController.text : null,
        });

        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const HomeScreen()));
      } else {
        _showCustomSnackBar('Invalid Credentials.');
      }
    } catch (e) {
      _showCustomSnackBar('Connection error.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE), // Light soft background
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: const Color(0xFF212529), borderRadius: BorderRadius.circular(24)),
                  child: const Icon(Icons.qr_code_scanner, size: 50, color: Colors.white),
                ),
                const SizedBox(height: 24),
                const Text("Welcome Back", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF212529))),
                const Text("Sign in to continue", style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 40),

                // Inputs
                _buildTextField(_idController, "Employee ID", Icons.badge_outlined, false),
                const SizedBox(height: 16),
                _buildTextField(_passwordController, "Password", Icons.lock_outline, true),

                // Remember Me
                Row(
                  children: [
                    Checkbox(value: _rememberMe, activeColor: const Color(0xFF212529), onChanged: (v) => setState(() => _rememberMe = v!)),
                    const Text("Remember me", style: TextStyle(color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 24),

                // Login Button
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF212529),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text("LOGIN", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, bool isPassword) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.grey.shade200, blurRadius: 10, offset: const Offset(0, 5))],
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword && _obscurePassword,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(icon, color: const Color(0xFF212529)),
          suffixIcon: isPassword ? IconButton(icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)) : null,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(vertical: 20),
        ),
      ),
    );
  }
}