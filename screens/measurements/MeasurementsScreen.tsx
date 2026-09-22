import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type Measurement = {
  id: string;
  date: string;
  type: string;
  bust: string;
  waist: string;
  hip: string;
  shoulder: string;
  sleeveLength: string;
  blouseLength: string;
  frontNeck: string;
  backNeck: string;
  armhole: string;
  pantLength: string;
  notes: string;
};

export type MeasurementCustomer = {
  id: string;
  name: string;
  phone?: string;
};

type MeasurementsScreenProps = {
  customer: MeasurementCustomer;
  measurements: Measurement[];
  onAddMeasurement: (
    measurement: Omit<Measurement, "id">
  ) => Promise<void> | void;
  onUpdateMeasurement: (
    measurementId: string,
    measurement: Omit<Measurement, "id">
  ) => Promise<void> | void;
};

const MEASUREMENT_TYPES = [
  "Blouse",
  "Chudidar",
  "Dress",
  "Pant",
  "Lehenga",
  "Kurti",
  "Custom",
];

const EMPTY_FORM: Omit<Measurement, "id"> = {
  date: "",
  type: "Blouse",
  bust: "",
  waist: "",
  hip: "",
  shoulder: "",
  sleeveLength: "",
  blouseLength: "",
  frontNeck: "",
  backNeck: "",
  armhole: "",
  pantLength: "",
  notes: "",
};

const LABELS: Record<string, string> = {
  bust: "Bust",
  waist: "Waist",
  hip: "Hip",
  shoulder: "Shoulder",
  sleeveLength: "Sleeve Length",
  blouseLength: "Blouse Length",
  frontNeck: "Front Neck",
  backNeck: "Back Neck",
  armhole: "Armhole",
  pantLength: "Pant Length",
};

function createDefaultDate() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  return `${day}/${month}/${year}`;
}

function displayDate(value: string) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  return value;
}

function databaseDate(value: string) {
  const text = value.trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");

    return `${year}-${month}-${day}`;
  }

  return text;
}

function dateValue(value: string) {
  if (!value) return 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value).getTime() || 0;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return (
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      ).getTime() || 0
    );
  }

  return 0;
}

function MeasurementField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor="#B6A9B0"
        keyboardType="decimal-pad"
        style={styles.input}
      />
    </View>
  );
}

function MeasurementCard({
  measurement,
  latest,
  onEdit,
  onView,
}: {
  measurement: Measurement;
  latest: boolean;
  onEdit: () => void;
  onView: () => void;
}) {
  const preview = [
    measurement.bust
      ? `Bust ${measurement.bust}"`
      : "",
    measurement.waist
      ? `Waist ${measurement.waist}"`
      : "",
    measurement.hip
      ? `Hip ${measurement.hip}"`
      : "",
    measurement.shoulder
      ? `Shoulder ${measurement.shoulder}"`
      : "",
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.measurementIcon}>
            <Text style={styles.measurementIconText}>M</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>
                {measurement.type}
              </Text>

              {latest && (
                <View style={styles.latestBadge}>
                  <Text style={styles.latestBadgeText}>
                    LATEST
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.cardDate}>
              {displayDate(measurement.date) || "No date"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {preview.length > 0 ? (
        <View style={styles.previewContainer}>
          {preview.map((item) => (
            <View
              key={item}
              style={styles.previewChip}
            >
              <Text style={styles.previewText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noMeasurementText}>
          No measurements entered yet
        </Text>
      )}

      {measurement.notes ? (
        <Text
          numberOfLines={2}
          style={styles.cardNotes}
        >
          {measurement.notes}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.viewButton}
        onPress={onView}
      >
        <Text style={styles.viewButtonText}>
          View Full Measurement →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MeasurementsScreen({
  customer,
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
}: MeasurementsScreenProps) {
  const [modalVisible, setModalVisible] =
    useState(false);

  const [detailsVisible, setDetailsVisible] =
    useState(false);

  const [editingMeasurement, setEditingMeasurement] =
    useState<Measurement | null>(null);

  const [selectedMeasurement, setSelectedMeasurement] =
    useState<Measurement | null>(null);

  const [form, setForm] =
    useState<Omit<Measurement, "id">>(
      EMPTY_FORM
    );

  const [selectedType, setSelectedType] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort(
      (a, b) =>
        dateValue(b.date) -
        dateValue(a.date)
    );
  }, [measurements]);

  const latestMeasurement =
    sortedMeasurements[0] || null;

  const filteredMeasurements =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return sortedMeasurements.filter(
        (measurement) => {
          const matchesType =
            selectedType === "All" ||
            measurement.type === selectedType;

          const searchable = [
            measurement.type,
            measurement.date,
            measurement.notes,
            measurement.bust,
            measurement.waist,
            measurement.hip,
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(query);

          return (
            matchesType &&
            matchesSearch
          );
        }
      );
    }, [
      sortedMeasurements,
      selectedType,
      search,
    ]);

  function openAddMeasurement() {
    setEditingMeasurement(null);

    setForm({
      ...EMPTY_FORM,
      date: createDefaultDate(),
    });

    setModalVisible(true);
  }

  function openEditMeasurement(
    measurement: Measurement
  ) {
    setEditingMeasurement(measurement);

    setForm({
      date: displayDate(measurement.date),
      type: measurement.type || "Blouse",
      bust: measurement.bust || "",
      waist: measurement.waist || "",
      hip: measurement.hip || "",
      shoulder: measurement.shoulder || "",
      sleeveLength:
        measurement.sleeveLength || "",
      blouseLength:
        measurement.blouseLength || "",
      frontNeck:
        measurement.frontNeck || "",
      backNeck:
        measurement.backNeck || "",
      armhole:
        measurement.armhole || "",
      pantLength:
        measurement.pantLength || "",
      notes:
        measurement.notes || "",
    });

    setModalVisible(true);
  }

  function openDetails(
    measurement: Measurement
  ) {
    setSelectedMeasurement(measurement);
    setDetailsVisible(true);
  }

  function updateField(
    field: keyof Omit<Measurement, "id">,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveMeasurement() {
    if (!form.type.trim()) {
      Alert.alert(
        "Measurement Type",
        "Please select a measurement type."
      );
      return;
    }

    if (!form.date.trim()) {
      Alert.alert(
        "Date Required",
        "Please enter the measurement date."
      );
      return;
    }

    setSaving(true);

    try {
      const payload: Omit<
        Measurement,
        "id"
      > = {
        ...form,
        date: databaseDate(form.date),
        type: form.type.trim(),
      };

      if (editingMeasurement) {
        await onUpdateMeasurement(
          editingMeasurement.id,
          payload
        );

        Alert.alert(
          "Measurement Updated",
          "Measurement updated successfully."
        );
      } else {
        await onAddMeasurement(payload);

        Alert.alert(
          "Measurement Saved",
          "Measurement saved successfully."
        );
      }

      setModalVisible(false);
      setEditingMeasurement(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      Alert.alert(
        "Unable to Save",
        error instanceof Error
          ? error.message
          : "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              FEMME FATALE BOUTIQUE
            </Text>

            <Text style={styles.heading}>
              Measurements
            </Text>

            <Text style={styles.subheading}>
              {customer.name}'s saved measurements
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddMeasurement}
          >
            <Text style={styles.addPlus}>
              ＋
            </Text>

            <Text style={styles.addButtonText}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {/* CUSTOMER SUMMARY */}

        <View style={styles.customerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(customer.name || "?")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>
              {customer.name}
            </Text>

            {customer.phone ? (
              <Text style={styles.customerPhone}>
                {customer.phone}
              </Text>
            ) : null}
          </View>

          <View style={styles.countBox}>
            <Text style={styles.countNumber}>
              {measurements.length}
            </Text>

            <Text style={styles.countLabel}>
              Saved
            </Text>
          </View>
        </View>

        {/* LATEST MEASUREMENT */}

        {latestMeasurement && (
          <View style={styles.latestPanel}>
            <View style={styles.latestHeader}>
              <View>
                <Text
                  style={styles.latestKicker}
                >
                  LATEST MEASUREMENT
                </Text>

                <Text style={styles.latestTitle}>
                  {latestMeasurement.type}
                </Text>

                <Text style={styles.latestDate}>
                  {displayDate(
                    latestMeasurement.date
                  )}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  openDetails(
                    latestMeasurement
                  )
                }
              >
                <Text style={styles.latestView}>
                  View
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.latestStats}>
              <View style={styles.latestStat}>
                <Text style={styles.statLabel}>
                  Bust
                </Text>

                <Text style={styles.statValue}>
                  {latestMeasurement.bust
                    ? `${latestMeasurement.bust}"`
                    : "—"}
                </Text>
              </View>

              <View style={styles.latestStat}>
                <Text style={styles.statLabel}>
                  Waist
                </Text>

                <Text style={styles.statValue}>
                  {latestMeasurement.waist
                    ? `${latestMeasurement.waist}"`
                    : "—"}
                </Text>
              </View>

              <View style={styles.latestStat}>
                <Text style={styles.statLabel}>
                  Hip
                </Text>

                <Text style={styles.statValue}>
                  {latestMeasurement.hip
                    ? `${latestMeasurement.hip}"`
                    : "—"}
                </Text>
              </View>

              <View style={styles.latestStat}>
                <Text style={styles.statLabel}>
                  Shoulder
                </Text>

                <Text style={styles.statValue}>
                  {latestMeasurement.shoulder
                    ? `${latestMeasurement.shoulder}"`
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SEARCH */}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>
            ⌕
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search measurements..."
            placeholderTextColor="#A99BA3"
            style={styles.searchInput}
          />

          {search ? (
            <TouchableOpacity
              onPress={() => setSearch("")}
            >
              <Text style={styles.clearText}>
                ×
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContainer
          }
        >
          {[
            "All",
            ...MEASUREMENT_TYPES,
          ].map((type) => {
            const active =
              selectedType === type;

            return (
              <TouchableOpacity
                key={type}
                onPress={() =>
                  setSelectedType(type)
                }
                style={[
                  styles.filter,
                  active &&
                    styles.filterActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* HISTORY */}

        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Measurement History
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              {filteredMeasurements.length}{" "}
              record
              {filteredMeasurements.length ===
              1
                ? ""
                : "s"}
            </Text>
          </View>

          <Text style={styles.unitText}>
            All values in inches
          </Text>
        </View>

        {filteredMeasurements.length ===
        0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text
                style={styles.emptyIconText}
              >
                M
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No measurements found
            </Text>

            <Text style={styles.emptyText}>
              {measurements.length === 0
                ? "Add the customer's first measurement profile."
                : "Try another search or measurement type."}
            </Text>

            {measurements.length === 0 && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={
                  openAddMeasurement
                }
              >
                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  + Add Measurement
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredMeasurements.map(
            (measurement) => (
              <MeasurementCard
                key={measurement.id}
                measurement={
                  measurement
                }
                latest={
                  measurement.id ===
                  latestMeasurement?.id
                }
                onEdit={() =>
                  openEditMeasurement(
                    measurement
                  )
                }
                onView={() =>
                  openDetails(
                    measurement
                  )
                }
              />
            )
          )
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ADD / EDIT MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View
                style={styles.modalHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.modalKicker}
                  >
                    {editingMeasurement
                      ? "UPDATE PROFILE"
                      : "NEW PROFILE"}
                  </Text>

                  <Text
                    style={styles.modalTitle}
                  >
                    {editingMeasurement
                      ? "Edit Measurement"
                      : "Add Measurement"}
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={saving}
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text
                    style={styles.closeText}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* TYPE */}

                <Text
                  style={
                    styles.formSectionTitle
                  }
                >
                  Measurement Profile
                </Text>

                <Text
                  style={styles.fieldLabel}
                >
                  Type
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.typeContainer
                  }
                >
                  {MEASUREMENT_TYPES.map(
                    (type) => {
                      const active =
                        form.type === type;

                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() =>
                            updateField(
                              "type",
                              type
                            )
                          }
                          style={[
                            styles.typePill,
                            active &&
                              styles.typePillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typePillText,
                              active &&
                                styles.typePillTextActive,
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>

                {/* DATE */}

                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      marginTop: 15,
                    },
                  ]}
                >
                  Date
                </Text>

                <TextInput
                  value={form.date}
                  onChangeText={(value) =>
                    updateField(
                      "date",
                      value
                    )
                  }
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#B6A9B0"
                  keyboardType="numbers-and-punctuation"
                  style={styles.fullInput}
                />

                {/* BODY MEASUREMENTS */}

                <Text
                  style={
                    styles.formSectionTitle
                  }
                >
                  Body Measurements
                </Text>

                <View style={styles.grid}>
                  <MeasurementField
                    label="Bust"
                    value={form.bust}
                    onChangeText={(value) =>
                      updateField(
                        "bust",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Waist"
                    value={form.waist}
                    onChangeText={(value) =>
                      updateField(
                        "waist",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Hip"
                    value={form.hip}
                    onChangeText={(value) =>
                      updateField(
                        "hip",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Shoulder"
                    value={form.shoulder}
                    onChangeText={(value) =>
                      updateField(
                        "shoulder",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Sleeve Length"
                    value={
                      form.sleeveLength
                    }
                    onChangeText={(value) =>
                      updateField(
                        "sleeveLength",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Blouse Length"
                    value={
                      form.blouseLength
                    }
                    onChangeText={(value) =>
                      updateField(
                        "blouseLength",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Front Neck"
                    value={
                      form.frontNeck
                    }
                    onChangeText={(value) =>
                      updateField(
                        "frontNeck",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Back Neck"
                    value={
                      form.backNeck
                    }
                    onChangeText={(value) =>
                      updateField(
                        "backNeck",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Armhole"
                    value={form.armhole}
                    onChangeText={(value) =>
                      updateField(
                        "armhole",
                        value
                      )
                    }
                  />

                  <MeasurementField
                    label="Pant Length"
                    value={
                      form.pantLength
                    }
                    onChangeText={(value) =>
                      updateField(
                        "pantLength",
                        value
                      )
                    }
                  />
                </View>

                {/* NOTES */}

                <Text
                  style={styles.fieldLabel}
                >
                  Notes
                </Text>

                <TextInput
                  value={form.notes}
                  onChangeText={(value) =>
                    updateField(
                      "notes",
                      value
                    )
                  }
                  placeholder="Fitting notes, alterations, special instructions..."
                  placeholderTextColor="#B6A9B0"
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />

                {/* SAVE */}

                <TouchableOpacity
                  disabled={saving}
                  style={[
                    styles.saveButton,
                    saving &&
                      styles.disabledButton,
                  ]}
                  onPress={
                    saveMeasurement
                  }
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editingMeasurement
                      ? "Update Measurement"
                      : "Save Measurement"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={saving}
                  style={
                    styles.cancelButton
                  }
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    height: 25,
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DETAILS MODAL */}

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setDetailsVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard}>
            <View
              style={styles.modalHeader}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.modalKicker}
                >
                  SAVED MEASUREMENT
                </Text>

                <Text
                  style={styles.modalTitle}
                >
                  {selectedMeasurement?.type ||
                    "Measurement"}
                </Text>

                <Text
                  style={styles.detailDate}
                >
                  {displayDate(
                    selectedMeasurement?.date ||
                      ""
                  )}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setDetailsVisible(false)
                }
              >
                <Text
                  style={styles.closeText}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {selectedMeasurement && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={styles.detailGrid}
                >
                  {Object.entries(
                    LABELS
                  ).map(([key, label]) => {
                    const value =
                      selectedMeasurement[
                        key as keyof Measurement
                      ];

                    return (
                      <View
                        key={key}
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          {label}
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {value
                            ? `${value}"`
                            : "—"}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {selectedMeasurement.notes ? (
                  <View
                    style={styles.notesBox}
                  >
                    <Text
                      style={
                        styles.notesBoxTitle
                      }
                    >
                      Notes
                    </Text>

                    <Text
                      style={
                        styles.notesBoxText
                      }
                    >
                      {
                        selectedMeasurement.notes
                      }
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => {
                    setDetailsVisible(
                      false
                    );

                    openEditMeasurement(
                      selectedMeasurement
                    );
                  }}
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    Edit Measurement
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    height: 25,
                  }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  container: {
    padding: 18,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  eyebrow: {
    color: "#8B1238",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  heading: {
    color: "#242124",
    fontSize: 29,
    fontWeight: "800",
  },

  subheading: {
    color: "#81747C",
    fontSize: 13,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: "#8B1238",
    height: 46,
    minWidth: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
    marginLeft: 10,
  },

  addPlus: {
    color: "#FFFFFF",
    fontSize: 18,
    marginRight: 3,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E3E8",
    marginBottom: 15,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#8B1238",
    fontSize: 20,
    fontWeight: "900",
  },

  customerName: {
    color: "#242124",
    fontSize: 17,
    fontWeight: "800",
  },

  customerPhone: {
    color: "#8A7D84",
    fontSize: 12,
    marginTop: 3,
  },

  countBox: {
    minWidth: 55,
    alignItems: "center",
  },

  countNumber: {
    color: "#8B1238",
    fontSize: 20,
    fontWeight: "900",
  },

  countLabel: {
    color: "#8A7D84",
    fontSize: 10,
    marginTop: 1,
  },

  latestPanel: {
    backgroundColor: "#8B1238",
    borderRadius: 21,
    padding: 17,
    marginBottom: 15,
  },

  latestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  latestKicker: {
    color: "#F6DCA8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  latestTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 3,
  },

  latestDate: {
    color: "#E8CBD5",
    fontSize: 11,
    marginTop: 3,
  },

  latestView: {
    color: "#F6DCA8",
    fontSize: 13,
    fontWeight: "800",
  },

  latestStats: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor:
      "rgba(255,255,255,0.18)",
  },

  latestStat: {
    flex: 1,
  },

  statLabel: {
    color: "#EACDD7",
    fontSize: 10,
    marginBottom: 3,
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  searchBox: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADDE2",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 12,
  },

  searchIcon: {
    color: "#8B1238",
    fontSize: 24,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    color: "#242124",
    fontSize: 14,
  },

  clearText: {
    color: "#8B1238",
    fontSize: 23,
    paddingLeft: 8,
  },

  filterContainer: {
    gap: 8,
    paddingBottom: 18,
  },

  filter: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5D8DE",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  filterActive: {
    backgroundColor: "#8B1238",
    borderColor: "#8B1238",
  },

  filterText: {
    color: "#6D6269",
    fontSize: 12,
    fontWeight: "700",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    color: "#242124",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#958990",
    fontSize: 11,
    marginTop: 3,
  },

  unitText: {
    color: "#A2949B",
    fontSize: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E4E8",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  measurementIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  measurementIconText: {
    color: "#8B1238",
    fontWeight: "900",
    fontSize: 16,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardTitle: {
    color: "#242124",
    fontSize: 15,
    fontWeight: "800",
  },

  latestBadge: {
    backgroundColor: "#F7E8C8",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  latestBadgeText: {
    color: "#8A641B",
    fontSize: 8,
    fontWeight: "900",
  },

  cardDate: {
    color: "#91858C",
    fontSize: 11,
    marginTop: 3,
  },

  editButton: {
    borderWidth: 1,
    borderColor: "#E6D6DD",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  editButtonText: {
    color: "#8B1238",
    fontSize: 11,
    fontWeight: "800",
  },

  previewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },

  previewChip: {
    backgroundColor: "#FFF9F2",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  previewText: {
    color: "#5F555B",
    fontSize: 10,
    fontWeight: "700",
  },

  noMeasurementText: {
    color: "#AA9EA5",
    fontSize: 11,
    marginTop: 13,
  },

  cardNotes: {
    color: "#756A71",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },

  viewButton: {
    marginTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F2E8EB",
    paddingTop: 11,
  },

  viewButtonText: {
    color: "#8B1238",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E4E8",
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyIconText: {
    color: "#8B1238",
    fontSize: 23,
    fontWeight: "900",
  },

  emptyTitle: {
    color: "#242124",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    color: "#91858C",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  emptyButton: {
    backgroundColor: "#8B1238",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 15,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 30,
  },

  modalRoot: {
    flex: 1,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      "rgba(30,20,25,0.52)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "94%",
    paddingHorizontal: 18,
    paddingTop: 17,
  },

  detailCard: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingHorizontal: 18,
    paddingTop: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 15,
  },

  modalKicker: {
    color: "#8B1238",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  modalTitle: {
    color: "#242124",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F5E8ED",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#8B1238",
    fontSize: 24,
    lineHeight: 25,
  },

  formSectionTitle: {
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
    marginBottom: 9,
  },

  typeContainer: {
    gap: 8,
    paddingBottom: 2,
  },

  typePill: {
    borderWidth: 1,
    borderColor: "#E4D7DD",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  typePillActive: {
    backgroundColor: "#8B1238",
    borderColor: "#8B1238",
  },

  typePillText: {
    color: "#6D6269",
    fontSize: 11,
    fontWeight: "700",
  },

  typePillTextActive: {
    color: "#FFFFFF",
  },

  fieldLabel: {
    color: "#4B4248",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },

  fullInput: {
    height: 45,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6D9DE",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#242124",
    fontSize: 13,
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  field: {
    width: "48%",
    marginBottom: 12,
  },

  input: {
    height: 43,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6D9DE",
    borderRadius: 12,
    paddingHorizontal: 11,
    color: "#242124",
    fontSize: 13,
  },

  notesInput: {
    minHeight: 88,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6D9DE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 11,
    color: "#242124",
    fontSize: 13,
    marginBottom: 16,
  },

  saveButton: {
    backgroundColor: "#8B1238",
    borderRadius: 14,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  cancelButtonText: {
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "800",
  },

  detailDate: {
    color: "#91858C",
    fontSize: 12,
    marginTop: 4,
  },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  detailItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#F0E4E8",
  },

  detailLabel: {
    color: "#8D8087",
    fontSize: 10,
    fontWeight: "700",
  },

  detailValue: {
    color: "#242124",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  notesBox: {
    backgroundColor: "#FCE8F0",
    borderRadius: 14,
    padding: 13,
    marginVertical: 5,
    marginBottom: 15,
  },

  notesBoxTitle: {
    color: "#8B1238",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },

  notesBoxText: {
    color: "#594E54",
    fontSize: 12,
    lineHeight: 18,
  },
});