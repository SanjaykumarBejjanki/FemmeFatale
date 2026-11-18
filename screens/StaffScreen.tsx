import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  createStaff,
  deleteStaff,
  fetchStaff,
  type StaffMember,
} from "../lib/staffService";

export default function StaffScreen({ onBack }: { onBack: () => void }) {
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStaff();
      setStaffList(data);
    } catch (error) {
      console.error("LOAD STAFF ERROR:", error);
      Alert.alert(
        "Unable to load staff",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const addStaff = async () => {
    if (!staffName.trim() || !staffPhone.trim() || !staffRole.trim()) {
      Alert.alert("Missing details", "Enter the full name, phone number, and role.");
      return;
    }

    setSaving(true);
    try {
      const newStaff = await createStaff(staffName, staffPhone, staffRole);
      setStaffList((previous) => [newStaff, ...previous]);
      setStaffName("");
      setStaffRole("");
      Alert.alert("Success", "Staff member saved to your boutique.");
    } catch (error) {
      console.error("ADD STAFF ERROR:", error);
      Alert.alert(
        "Could not save staff",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (staff: StaffMember) => {
    Alert.alert("Remove staff member", `Remove ${staff.name} from your team?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setDeletingId(staff.id);
          try {
            await deleteStaff(staff.id);
            setStaffList((previous) =>
              previous.filter((item) => item.id !== staff.id),
            );
          } catch (error) {
            console.error("DELETE STAFF ERROR:", error);
            Alert.alert(
              "Could not remove staff",
              error instanceof Error ? error.message : "Please try again.",
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="Back to dashboard"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#C2185B"
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>FEMMEFATALE BOUTIQUE</Text>
            <Text style={styles.title}>Staff</Text>
            <Text style={styles.subtitle}>Manage your boutique team</Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="account-group"
              size={25}
              color="#C2185B"
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={25}
              color="#C2185B"
            />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Team Members</Text>
            <Text style={styles.summaryValue}>{staffList.length}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Staff Member</Text>
          <Text style={styles.cardSubtitle}>
            Add a team member to your boutique
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={staffName}
            onChangeText={setStaffName}
            placeholder="Enter staff name"
            placeholderTextColor="#A18B94"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={staffPhone}
            onChangeText={setStaffPhone}
            placeholder="Enter phone number"
            placeholderTextColor="#A18B94"
            style={styles.input}
            keyboardType="phone-pad"
            maxLength={15}
            editable={!saving}
          />

          <Text style={styles.label}>Role</Text>
          <TextInput
            value={staffRole}
            onChangeText={setStaffRole}
            placeholder="e.g. Tailor, Designer, Assistant"
            placeholderTextColor="#A18B94"
            style={styles.input}
            editable={!saving}
          />

          <TouchableOpacity
            style={[styles.addButton, saving && styles.disabledButton]}
            activeOpacity={0.85}
            onPress={addStaff}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.addButtonText}>Add Staff</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Your Team</Text>
          <Text style={styles.countBadge}>{staffList.length}</Text>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#C2185B" size="large" />
            <Text style={styles.emptySubtitle}>Loading team members...</Text>
          </View>
        ) : staffList.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={32}
                color="#C2185B"
              />
            </View>
            <Text style={styles.emptyTitle}>No staff added yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first team member using the form above.
            </Text>
          </View>
        ) : (
          staffList.map((staff) => (
            <View key={staff.id} style={styles.staffCard}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={23}
                  color="#C2185B"
                />
              </View>

              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{staff.name}</Text>
                                <Text style={styles.staffPhone}>
                  {staff.phone || "Phone number not added"}
                </Text>
                <Text style={styles.staffRole}>{staff.role}</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(staff)}
                disabled={deletingId === staff.id}
                accessibilityLabel={`Remove ${staff.name}`}
              >
                {deletingId === staff.id ? (
                  <ActivityIndicator color="#C62828" />
                ) : (
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#C62828"
                  />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7FA",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 130,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3DCE6",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    color: "#C2185B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  title: {
    color: "#AD1457",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#AD8293",
    fontSize: 12,
    marginTop: 2,
  },
  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#FCE4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    marginBottom: 18,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FCE4EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  summaryLabel: {
    color: "#AD8293",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#AD1457",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    marginBottom: 22,
  },
  cardTitle: {
    color: "#AD1457",
    fontSize: 17,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#AD8293",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
  },
  label: {
    color: "#8E4565",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#4A1730",
    fontSize: 14,
    marginBottom: 15,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C2185B",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 9,
    marginTop: 3,
  },
  disabledButton: {
    opacity: 0.65,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: "#FCE4EC",
    color: "#C2185B",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F8BBD0",
  },
  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: "#FCE4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#AD1457",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 13,
  },
  emptySubtitle: {
    color: "#AD8293",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    marginBottom: 10,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "#FCE4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffName: {
    color: "#4A1730",
    fontSize: 14,
    fontWeight: "900",
  },
  staffPhone: {
    color: "#6F5962",
    fontSize: 12,
    marginTop: 4,
  },
  staffRole: {
    color: "#AD8293",
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    padding: 9,
  },
});



