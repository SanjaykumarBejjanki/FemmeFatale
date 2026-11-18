import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type OwnerPinScreenProps = {
  onUnlock: () => void;
};

const DEMO_PIN = "1234";

export default function OwnerPinScreen({
  onUnlock,
}: OwnerPinScreenProps) {
  const [pin, setPin] = useState("");

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) {
      return;
    }

    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === DEMO_PIN) {
        setPin("");
        onUnlock();
      } else {
        setTimeout(() => {
          Alert.alert(
            "Incorrect PIN",
            "Please enter the correct Owner PIN."
          );
          setPin("");
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin((previous) => previous.slice(0, -1));
  };

  const renderKey = (
    value: string,
    onPress: () => void,
    icon?: keyof typeof MaterialCommunityIcons.glyphMap
  ) => (
    <TouchableOpacity
      key={value}
      style={styles.key}
      activeOpacity={0.65}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        icon ? "Delete last digit" : `Enter ${value}`
      }
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color="#C21868"
        />
      ) : (
        <Text style={styles.keyText}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="needle"
              size={31}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.heading}>
            <Text style={styles.brand}>
              <Text style={styles.brandPink}>Femme</Text>
              <Text style={styles.brandDark}> Fatale</Text>
            </Text>

            <Text style={styles.brandSubtitle}>
              BOUTIQUE MANAGEMENT
            </Text>

            <View style={styles.divider} />

            <Text style={styles.welcome}>Welcome Back!</Text>

            <Text style={styles.subtitle}>
              Enter your 4-digit Owner PIN
            </Text>
          </View>

          <View
            style={styles.pinSection}
            accessibilityLabel={`${pin.length} of 4 PIN digits entered`}
          >
            <Text style={styles.pinLabel}>ENTER YOUR PIN</Text>

            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < pin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.keypad}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
              (digit) =>
                renderKey(digit, () => handleDigit(digit))
            )}

            <View style={styles.emptyKey} />

            {renderKey("0", () => handleDigit("0"))}

            {renderKey(
              "backspace",
              handleBackspace,
              "backspace-outline"
            )}
          </View>

          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={16}
              color="#C21868"
            />

            <Text style={styles.forgotText}>
              Forgot PIN? Contact your administrator
            </Text>
          </View>
        </View>

        <Text style={styles.bottomText}>
          MADE WITH LOVE FOR YOUR BOUTIQUE
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF0F6",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#F5D4E3",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",

    elevation: 5,
    shadowColor: "#C21868",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
  },

  logoCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#D63384",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 5,
    borderColor: "#FCE4EF",
  },

  heading: {
    alignItems: "center",
    marginBottom: 20,
  },

  brand: {
    fontSize: 29,
    fontWeight: "900",
    fontFamily: "sans-serif",
    letterSpacing: -0.8,
    textAlign: "center",
  },

  brandPink: {
    color: "#C21868",
  },

  brandDark: {
    color: "#38212D",
  },

  brandSubtitle: {
    color: "#C21868",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginTop: 6,
  },

  divider: {
    width: 45,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#EFA5C6",
    marginTop: 19,
    marginBottom: 17,
  },

  welcome: {
    fontSize: 25,
    fontWeight: "800",
    fontFamily: "sans-serif",
    color: "#38212D",
    letterSpacing: -0.4,
    textAlign: "center",
  },

  subtitle: {
    color: "#9B7889",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "sans-serif",
    marginTop: 7,
    textAlign: "center",
  },

  pinSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 22,
  },

  pinLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B27A96",
    letterSpacing: 2,
    marginBottom: 13,
  },

  pinDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 23,
  },

  pinDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: "#D63384",
    backgroundColor: "#FFFFFF",
  },

  pinDotFilled: {
    backgroundColor: "#D63384",
    borderColor: "#D63384",
  },

  keypad: {
    width: "100%",
    maxWidth: 300,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    rowGap: 10,
  },

  key: {
    width: "30%",
    height: 57,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F4D5E3",
    backgroundColor: "#FFF7FA",
    alignItems: "center",
    justifyContent: "center",

    elevation: 1,
    shadowColor: "#C21868",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },

  keyText: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "sans-serif",
    color: "#54263F",
  },

  emptyKey: {
    width: "30%",
    height: 57,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
    flexWrap: "wrap",
  },

  forgotText: {
    color: "#A36D88",
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "sans-serif",
    textAlign: "center",
  },

  bottomText: {
    marginTop: 20,
    color: "#C18AA5",
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "sans-serif",
    letterSpacing: 2,
    textAlign: "center",
  },
});
