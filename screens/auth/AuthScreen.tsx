import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const resetFields = () => {
    setFullName("");
    setShopName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  const switchMode = (newMode: AuthMode) => {
    resetFields();
    setMode(newMode);
  };

  const validateForm = () => {
    if (isSignup && !fullName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return false;
    }

    if (isSignup && !shopName.trim()) {
      Alert.alert("Missing shop name", "Please enter your shop name.");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return false;
    }

    if (!password) {
      Alert.alert("Missing password", "Please enter your password.");
      return false;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password too short",
        "Password must contain at least 8 characters."
      );
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              shop_name: shopName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          Alert.alert(
            "Account created",
            "Your FemmeBill account has been created successfully."
          );
        } else {
          Alert.alert(
            "Check your email",
            "Your account was created. Please check your email and confirm your email address before logging in."
          );
        }

        setPassword("");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw error;
        }

        Alert.alert("Welcome back", "You have successfully logged in.");
      }
    } catch (error: any) {
      const message = error?.message || "Something went wrong.";

      Alert.alert("Authentication failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>F</Text>
        </View>

        <Text style={styles.title}>FemmeBill</Text>

        <Text style={styles.subtitle}>
          Smart tailoring & boutique management
        </Text>

        <View style={styles.card}>
          <View style={styles.modeContainer}>
            <Pressable
              style={[
                styles.modeButton,
                mode === "login" && styles.modeButtonActive,
              ]}
              onPress={() => switchMode("login")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "login" && styles.modeTextActive,
                ]}
              >
                Login
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeButton,
                mode === "signup" && styles.modeButtonActive,
              ]}
              onPress={() => switchMode("signup")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "signup" && styles.modeTextActive,
                ]}
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          {isSignup && (
            <>
              <Text style={styles.label}>Full Name</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                editable={!loading}
              />

              <Text style={styles.label}>Shop Name</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your shop name"
                placeholderTextColor="#999"
                value={shopName}
                onChangeText={setShopName}
                autoCapitalize="words"
                editable={!loading}
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />

            <Pressable
              style={styles.showButton}
              onPress={() => setShowPassword((value) => !value)}
              disabled={loading}
            >
              <Text style={styles.showText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>

          {isSignup && (
            <Text style={styles.passwordHint}>
              Password must contain at least 8 characters.
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignup ? "Create Account" : "Login"}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignup
                ? "Already have a FemmeBill account?"
                : "Don't have a FemmeBill account?"}
            </Text>

            <Pressable
              onPress={() => switchMode(isSignup ? "login" : "signup")}
              disabled={loading}
            >
              <Text style={styles.switchLink}>
                {isSignup ? " Login" : " Create Account"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerText}>
          Your shop data is protected with Supabase authentication and
          database security.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f4f8",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#6d3f73",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  logoText: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2d2330",
  },

  subtitle: {
    fontSize: 14,
    color: "#77707a",
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },

  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },

  modeContainer: {
    flexDirection: "row",
    backgroundColor: "#f1edf2",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 9,
  },

  modeButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  modeText: {
    color: "#77707a",
    fontSize: 14,
    fontWeight: "600",
  },

  modeTextActive: {
    color: "#6d3f73",
    fontWeight: "800",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3c343e",
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd6df",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#29232b",
    backgroundColor: "#ffffff",
  },

  passwordContainer: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd6df",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#29232b",
  },

  showButton: {
    paddingHorizontal: 14,
  },

  showText: {
    color: "#6d3f73",
    fontSize: 13,
    fontWeight: "700",
  },

  passwordHint: {
    color: "#8a828c",
    fontSize: 12,
    marginTop: 7,
  },

  primaryButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#6d3f73",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  primaryButtonPressed: {
    opacity: 0.85,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 20,
  },

  switchText: {
    color: "#77707a",
    fontSize: 13,
  },

  switchLink: {
    color: "#6d3f73",
    fontSize: 13,
    fontWeight: "800",
  },

  footerText: {
    maxWidth: 420,
    textAlign: "center",
    color: "#918a92",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 22,
  },
});