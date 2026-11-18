import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const colors = {
  PrimaryWine: "#8B1238",
  Magenta: "#C2185B",
  Gold: "#C69A3A",
  Cream: "#FFF9F2",
  SoftPink: "#FCE8F0",
  DarkText: "#242124",
  White: "#FFFFFF",
  Muted: "#777777",
  Border: "#E8DDE2",
  Error: "#B3261E",
};

type AuthMode = "login" | "signup";

type AuthScreenProps = {
  onAuthenticated?: () => void;
};

export default function AuthScreen({
  onAuthenticated,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nameError, setNameError] = useState("");

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setNameError("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearErrors();
    setPassword("");
  };

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const validateForm = () => {
    let valid = true;

    clearErrors();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must contain at least 6 characters.");
      valid = false;
    }

    if (mode === "signup" && !fullName.trim()) {
      setNameError("Full name is required.");
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        onAuthenticated?.();
      }
    } catch (error: any) {
      console.error("LOGIN ERROR:", error);

      let message =
        error?.message ||
        "Unable to sign in. Please try again.";

      if (
        message.toLowerCase().includes("invalid login credentials")
      ) {
        message =
          "Invalid email or password. Please check your details.";
      }

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        Alert.alert(
          "Account Created",
          "Your Femme Fatale Boutique account has been created."
        );

        onAuthenticated?.();
        return;
      }

      Alert.alert(
        "Account Created",
        "Your account has been created. Please check your email to verify your account before logging in.",
        [
          {
            text: "OK",
            onPress: () => {
              setMode("login");
              setPassword("");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("SIGNUP ERROR:", error);

      let message =
        error?.message ||
        "Unable to create your account. Please try again.";

      if (
        message.toLowerCase().includes("user already registered")
      ) {
        message =
          "An account with this email already exists. Please log in.";
      }

      Alert.alert("Sign Up Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (mode === "login") {
      await handleLogin();
    } else {
      await handleSignup();
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError(
        "Enter your email address first to reset your password."
      );
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          trimmedEmail.toLowerCase()
        );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Reset Link Sent",
        "If an account exists for this email, a password reset link has been sent."
      );
    } catch (error: any) {
      console.error("PASSWORD RESET ERROR:", error);

      Alert.alert(
        "Reset Password",
        error?.message ||
          "Unable to send the password reset email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios" ? "padding" : "height"
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>FF</Text>
          </View>

          <Text style={styles.brandName}>
            Femme Fatale
          </Text>

          <Text style={styles.brandSubName}>
            BOUTIQUE
          </Text>

          <Text style={styles.tagline}>
            Style Speaks Louder â™¡
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.modeButton,
                mode === "login" &&
                  styles.modeButtonActive,
              ]}
              onPress={() => switchMode("login")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "login" &&
                    styles.modeTextActive,
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.modeButton,
                mode === "signup" &&
                  styles.modeButtonActive,
              ]}
              onPress={() => switchMode("signup")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "signup" &&
                    styles.modeTextActive,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>
            {mode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </Text>

          <Text style={styles.description}>
            {mode === "login"
              ? "Sign in to manage your boutique."
              : "Set up your boutique management account."}
          </Text>

          {mode === "signup" && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Full Name
              </Text>

              <TextInput
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  if (nameError) setNameError("");
                }}
                placeholder="Enter your full name"
                placeholderTextColor="#A59BA0"
                style={[
                  styles.input,
                  nameError && styles.inputError,
                ]}
                autoCapitalize="words"
                editable={!loading}
              />

              {!!nameError && (
                <Text style={styles.errorText}>
                  {nameError}
                </Text>
              )}
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Email Address
            </Text>

            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) setEmailError("");
              }}
              placeholder="Enter your email"
              placeholderTextColor="#A59BA0"
              style={[
                styles.input,
                emailError && styles.inputError,
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            {!!emailError && (
              <Text style={styles.errorText}>
                {emailError}
              </Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>
                Password
              </Text>

              {mode === "login" && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.passwordWrapper,
                passwordError &&
                  styles.inputError,
              ]}
            >
              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder="Enter your password"
                placeholderTextColor="#A59BA0"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={styles.showButton}
                onPress={() =>
                  setShowPassword((previous) => !previous)
                }
                disabled={loading}
              >
                <Text style={styles.showText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {!!passwordError && (
              <Text style={styles.errorText}>
                {passwordError}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={colors.White}
              />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login"
                  ? "Login"
                  : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </Text>

            <TouchableOpacity
              onPress={() =>
                switchMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
              disabled={loading}
            >
              <Text style={styles.switchAction}>
                {mode === "login"
                  ? " Create Account"
                  : " Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>
          Femme Fatale Boutique
        </Text>

        <Text style={styles.footerSubText}>
          Boutique Management System
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F8",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  brandSection: {
    alignItems: "center",
    marginBottom: 18,
  },

  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#B51655",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
    borderWidth: 2,
    borderColor: "#E7B7C9",
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 1,
  },

  brandName: {
    color: "#B51655",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  brandSubName: {
    color: "#A47A36",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 2,
  },

  tagline: {
    color: "#9A647A",
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },

  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#F0D5E0",
    shadowColor: "#8F123F",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  modeContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF0F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  modeButtonActive: {
    backgroundColor: "#B51655",
  },

  modeText: {
    color: "#B51655",
    fontSize: 14,
    fontWeight: "700",
  },

  modeTextActive: {
    color: "#FFFFFF",
  },

  heading: {
    color: "#242124",
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 5,
  },

  description: {
    color: "#777078",
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 19,
  },

  fieldContainer: {
    marginBottom: 14,
  },

  label: {
    color: "#30262B",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  forgotText: {
    color: "#B51655",
    fontSize: 12,
    fontWeight: "700",
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E8D5DE",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#242124",
    backgroundColor: "#FFFCFE",
    fontSize: 15,
  },

  passwordWrapper: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E8D5DE",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFCFE",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    color: "#242124",
    fontSize: 15,
  },

  showButton: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },

  showText: {
    color: "#B51655",
    fontSize: 12,
    fontWeight: "800",
  },

  inputError: {
    borderColor: "#B3261E",
    borderWidth: 1.5,
  },

  errorText: {
    color: "#B3261E",
    fontSize: 12,
    marginTop: 5,
  },

  submitButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#B51655",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  switchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 17,
  },

  switchText: {
    color: "#777078",
    fontSize: 13,
  },

  switchAction: {
    color: "#B51655",
    fontSize: 13,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#B51655",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 16,
  },

  footerSubText: {
    textAlign: "center",
    color: "#9A8C93",
    fontSize: 11,
    marginTop: 3,
  },
});

