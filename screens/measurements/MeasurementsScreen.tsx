import React, { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Alert,
  Modal,
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
  phone: string;
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

  onDeleteMeasurement: (
    measurementId: string
  ) => Promise<void> | void;
};

const colors = {
  PrimaryWine: "#8B1238",
  Magenta: "#AD1457",
  Gold: "#C69A3A",
  Cream: "#FFF9F2",
  SoftPink: "#FCE8F0",
  DarkText: "#242124",
  White: "#FFFFFF",
  Gray: "#777777",
  LightGray: "#F4F1F2",
  Border: "#E8DDE1",
  Green: "#2E7D32",
  Red: "#C62828",
};

const measurementTypes = [
  "Blouse",
  "Chudidar",
  "Dress",
  "Pant",
  "Lehenga",
  "Kurti",
  "Custom",
];

const emptyForm = {
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

const formatDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const dbDate = () => {
  return new Date().toISOString().split("T")[0];
};

const displayToDbDate = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return dbDate();
  }

  const parts = trimmed.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts;

    return `${year}-${month.padStart(
      2,
      "0"
    )}-${day.padStart(2, "0")}`;
  }

  return trimmed;
};

const dbToDisplayDate = (value: string) => {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
};

export default function MeasurementsScreen({
  customer,
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement,
}: MeasurementsScreenProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [showDetails, setShowDetails] =
    useState(false);

  const [editingMeasurement, setEditingMeasurement] =
    useState<Measurement | null>(null);

  const [selectedMeasurement, setSelectedMeasurement] =
    useState<Measurement | null>(null);

  const [form, setForm] = useState({
    ...emptyForm,
  });

  const [date, setDate] = useState(
    dbToDisplayDate(dbDate())
  );

  const [fabricPhotos, setFabricPhotos] = useState<string[]>([]);
  const [roughNotes, setRoughNotes] = useState("");

  const filteredMeasurements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return measurements.filter((measurement) => {
      const matchesType =
        typeFilter === "All" ||
        measurement.type === typeFilter;

      const matchesSearch =
        !query ||
        measurement.type
          .toLowerCase()
          .includes(query) ||
        measurement.notes
          .toLowerCase()
          .includes(query) ||
        measurement.date
          .toLowerCase()
          .includes(query);

      return matchesType && matchesSearch;
    });
  }, [
    measurements,
    search,
    typeFilter,
  ]);

  const latestMeasurement =
    measurements.length > 0
      ? [...measurements].sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )[0]
      : null;

  const openAddForm = () => {
    setEditingMeasurement(null);
    setForm({ ...emptyForm });
    setFabricPhotos([]);
    setRoughNotes("");
    setDate(dbToDisplayDate(dbDate()));
    setShowForm(true);
  };

  const openEditForm = (
    measurement: Measurement
  ) => {
    setEditingMeasurement(measurement);
    setFabricPhotos([]);
    setRoughNotes("");

    setForm({
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
      armhole: measurement.armhole || "",
      pantLength:
        measurement.pantLength || "",
      notes: measurement.notes || "",
    });

    setDate(
      dbToDisplayDate(
        measurement.date
      )
    );

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMeasurement(null);
    setFabricPhotos([]);
    setRoughNotes("");
  };

  const updateField = (
    field: keyof typeof emptyForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const pickFabricPhotos = async () => {
    try {
      if (fabricPhotos.length >= 5) {
        Alert.alert("Photo limit", "You can add up to 5 fabric photos.");
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow gallery access to select fabric photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5 - fabricPhotos.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedUris = result.assets
          .map((asset) => asset.uri)
          .filter((uri) => !fabricPhotos.includes(uri));

        setFabricPhotos((previous) =>
          [...previous, ...selectedUris].slice(0, 5)
        );
      }
    } catch (error) {
      console.error("FABRIC PHOTO PICKER ERROR:", error);
      Alert.alert("Unable to open gallery", "Please try again.");
    }
  };

  const removeFabricPhoto = (uri: string) => {
    setFabricPhotos((previous) =>
      previous.filter((photo) => photo !== uri)
    );
  };
  const saveMeasurement = async () => {
    if (!form.type.trim()) {
      Alert.alert(
        "Measurement Type",
        "Please select a measurement type."
      );
      return;
    }

    const measurementData: Omit<
      Measurement,
      "id"
    > = {
      date: displayToDbDate(date),
      type: form.type,
      bust: form.bust.trim(),
      waist: form.waist.trim(),
      hip: form.hip.trim(),
      shoulder: form.shoulder.trim(),
      sleeveLength:
        form.sleeveLength.trim(),
      blouseLength:
        form.blouseLength.trim(),
      frontNeck:
        form.frontNeck.trim(),
      backNeck:
        form.backNeck.trim(),
      armhole: form.armhole.trim(),
      pantLength:
        form.pantLength.trim(),
      notes: [form.notes.trim(), roughNotes.trim()].filter(Boolean).join("\n\n"),
    };

    try {
      if (editingMeasurement) {
        await onUpdateMeasurement(
          editingMeasurement.id,
          measurementData
        );
      } else {
        await onAddMeasurement(
          measurementData
        );
      }

      closeForm();
    } catch (error) {
      console.error(
        "SAVE MEASUREMENT ERROR:",
        error
      );

      Alert.alert(
        "Save Failed",
        "Unable to save measurement."
      );
    }
  };

  const confirmDeleteMeasurement = (
    measurement: Measurement
  ) => {
    Alert.alert(
      "Delete Measurement",
      `Are you sure you want to delete this ${measurement.type} measurement?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await onDeleteMeasurement(
                measurement.id
              );

              setShowDetails(false);
              setSelectedMeasurement(null);
            } catch (error) {
              console.error(
                "DELETE MEASUREMENT ERROR:",
                error
              );

              Alert.alert(
                "Delete Failed",
                "Unable to delete measurement."
              );
            }
          },
        },
      ]
    );
  };

  const field = (
    label: string,
    key: keyof typeof emptyForm,
    placeholder = "Enter value"
  ) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {label}
        </Text>

        <TextInput
          value={form[key]}
          onChangeText={(value) =>
            updateField(key, value)
          }
          placeholder={placeholder}
          placeholderTextColor="#999"
          style={[styles.input, styles.measurementInput]}
          keyboardType={
            key === "notes"
              ? "default"
              : "decimal-pad"
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>
              FEMME FATALE BOUTIQUE
            </Text>

            <Text style={styles.title}>
              Measurements
            </Text>

            <Text style={styles.subtitle}>
              {customer.name} Ã¢â‚¬Â¢ {customer.phone}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddForm}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>
              + Add
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {customer.name
                .split(" ")
                .map((item) => item[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {customer.name}
            </Text>

            <Text style={styles.customerPhone}>
              {customer.phone}
            </Text>
          </View>

          <View style={styles.measurementCount}>
            <Text
              style={
                styles.measurementCountNumber
              }
            >
              {measurements.length}
            </Text>

            <Text
              style={
                styles.measurementCountLabel
              }
            >
              Saved
            </Text>
          </View>
        </View>

        {latestMeasurement && (
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <View>
                <Text style={styles.latestTitle}>
                  Latest Measurement
                </Text>

                <Text style={styles.latestDate}>
                  {latestMeasurement.type} {"\u00B7"}{" "}
                  {formatDate(
                    latestMeasurement.date
                  )}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  openEditForm(
                    latestMeasurement
                  )
                }
              >
                <Text
                  style={styles.latestEdit}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.measurementGrid}>
              <MeasurementValue
                label="Bust"
                value={latestMeasurement.bust}
              />

              <MeasurementValue
                label="Waist"
                value={latestMeasurement.waist}
              />

              <MeasurementValue
                label="Hip"
                value={latestMeasurement.hip}
              />

              <MeasurementValue
                label="Shoulder"
                value={
                  latestMeasurement.shoulder
                }
              />
            </View>
          </View>
        )}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>{"\u2315"}</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search measurements..."
            placeholderTextColor="#999"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
            >
              <Text style={styles.clearText}>{"\u00D7"}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContent
          }
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              typeFilter === "All" &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setTypeFilter("All")
            }
          >
            <Text
              style={[
                styles.filterText,
                typeFilter === "All" &&
                  styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {measurementTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                typeFilter === type &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                setTypeFilter(type)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  typeFilter === type &&
                    styles.filterTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>
            Measurement History
          </Text>

          <Text style={styles.historyCount}>
            {filteredMeasurements.length}
          </Text>
        </View>

        {filteredMeasurements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{"\u{1F4CF}"}</Text>

            <Text style={styles.emptyTitle}>
              No measurements found
            </Text>

            <Text style={styles.emptySubtitle}>
              Add a measurement profile for{" "}
              {customer.name}.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openAddForm}
            >
              <Text
                style={styles.emptyButtonText}
              >
                + Add Measurement
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMeasurements.map(
            (measurement) => (
              <TouchableOpacity
                key={measurement.id}
                style={styles.historyCard}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedMeasurement(
                    measurement
                  );
                  setShowDetails(true);
                }}
              >
                <View
                  style={styles.historyTop}
                >
                  <View
                    style={styles.historyMain}
                  >
                    <Text
                      style={
                        styles.historyType
                      }
                    >
                      {measurement.type}
                    </Text>

                    <Text
                      style={
                        styles.historyDate
                      }
                    >
                      {formatDate(
                        measurement.date
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.smallEditButton
                    }
                    onPress={() =>
                      openEditForm(
                        measurement
                      )
                    }
                  >
                    <Text
                      style={
                        styles.smallEditText
                      }
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.historyMeasurements
                  }
                >
                  <SmallMeasurement
                    label="Bust"
                    value={
                      measurement.bust
                    }
                  />

                  <SmallMeasurement
                    label="Waist"
                    value={
                      measurement.waist
                    }
                  />

                  <SmallMeasurement
                    label="Hip"
                    value={
                      measurement.hip
                    }
                  />

                  <SmallMeasurement
                    label="Shoulder"
                    value={
                      measurement.shoulder
                    }
                  />
                </View>

                {measurement.notes ? (
                  <Text
                    style={styles.notesPreview}
                    numberOfLines={1}
                  >
                    Note:{" "}
                    {measurement.notes}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          )
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <View style={styles.overlay}>
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.modalTitle}
                >
                  {editingMeasurement
                    ? "Edit Measurement"
                    : "New Measurement"}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {customer.name}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeForm}
              >
                <Text style={styles.closeText}>{"\u00D7"}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.formSectionTitle}>
                Measurement Type
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.typeRow
                }
              >
                {measurementTypes.map(
                  (type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        form.type === type &&
                          styles.typeChipActive,
                      ]}
                      onPress={() =>
                        updateField(
                          "type",
                          type
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          form.type ===
                            type &&
                            styles.typeChipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>

              <Text style={styles.formSectionTitle}>
                Date
              </Text>

              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.formSectionTitle}>
                Body Measurements
              </Text>

              <Text style={styles.measurementHelper}>
                Enter measurements in inches
              </Text>

              <View style={styles.measurementGrid}>
                <View style={styles.measurementCard}>
                  {field("Length", "blouseLength", 'e.g. 15"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Shoulder", "shoulder", 'e.g. 14"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Hands / Sleeve", "sleeveLength", 'e.g. 12"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("High Chest", "bust", 'e.g. 34"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Low Chest", "waist", 'e.g. 30"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Front", "frontNeck", 'e.g. 6"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Back", "backNeck", 'e.g. 7"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Armhole", "armhole", 'e.g. 15"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Pant Length", "pantLength", 'e.g. 40"')}
                </View>
                <View style={styles.measurementCard}>
                  {field("Hip", "hip", 'e.g. 38"')}
                </View>
              </View>

              <Text style={styles.formSectionTitle}>
                Additional Measurement
              </Text><Text style={styles.formSectionTitle}>
                Additional Measurement
              </Text>
              {field("Hip", "hip", 'e.g. 38"')}



              <Text style={styles.formSectionTitle}>
                Rough Notes
              </Text>

              <TextInput
                value={roughNotes}
                onChangeText={setRoughNotes}
                placeholder="Special fitting instructions, design preferences, alterations..."
                placeholderTextColor="#947783"
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.roughNotesInput,
                ]}
              />

              <Text style={styles.formSectionTitle}>
                Fabric Photos
              </Text>

              <TouchableOpacity
                style={styles.photoPickerButton}
                onPress={pickFabricPhotos}
                activeOpacity={0.85}
              >
                <Text style={styles.photoPickerIcon}>+</Text>
                <Text style={styles.photoPickerText}>
                  Add Fabric Photos
                </Text>
              </TouchableOpacity>

              <Text style={styles.photoHint}>
                Add up to 5 fabric or design reference photos.
              </Text>

              {fabricPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {fabricPhotos.map((photo, index) => (
                    <View
                      key={`${photo}-${index}`}
                      style={styles.photoCard}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={styles.fabricPhoto}
                      />

                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removeFabricPhoto(photo)}
                      >
                        <Text style={styles.removePhotoText}>{"\u00D7"}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveMeasurement}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {editingMeasurement
                    ? "Update Measurement"
                    : "Save Measurement"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeForm}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowDetails(false)
        }
      >
        <View style={styles.overlay}>
          <View style={styles.detailsModal}>
            {selectedMeasurement && (
              <>
                <View
                  style={styles.modalHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.modalTitle}
                    >
                      {
                        selectedMeasurement.type
                      }
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {customer.name} Ã¢â‚¬Â¢{" "}
                      {formatDate(
                        selectedMeasurement.date
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() =>
                      setShowDetails(false)
                    }
                  >
                    <Text style={styles.closeText}>{"\u00D7"}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  <DetailGroup
                    title="Body Measurements"
                    values={[
                      [
                        "Bust",
                        selectedMeasurement.bust,
                      ],
                      [
                        "Waist",
                        selectedMeasurement.waist,
                      ],
                      [
                        "Hip",
                        selectedMeasurement.hip,
                      ],
                      [
                        "Shoulder",
                        selectedMeasurement.shoulder,
                      ],
                      [
                        "Sleeve Length",
                        selectedMeasurement.sleeveLength,
                      ],
                      [
                        "Blouse Length",
                        selectedMeasurement.blouseLength,
                      ],
                      [
                        "Front Neck",
                        selectedMeasurement.frontNeck,
                      ],
                      [
                        "Back Neck",
                        selectedMeasurement.backNeck,
                      ],
                      [
                        "Armhole",
                        selectedMeasurement.armhole,
                      ],
                      [
                        "Pant Length",
                        selectedMeasurement.pantLength,
                      ],
                    ]}
                  />

                  <View
                    style={styles.detailsSection}
                  >
                    <Text
                      style={
                        styles.detailsSectionTitle
                      }
                    >
                      Notes
                    </Text>

                    <Text
                      style={styles.detailsNotes}
                    >
                      {selectedMeasurement.notes ||
                        "No notes added."}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.detailsActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.detailsEditButton
                      }
                      onPress={() => {
                        setShowDetails(false);
                        openEditForm(
                          selectedMeasurement
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.detailsEditText
                        }
                      >
                        Edit Measurement
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.detailsDeleteButton
                      }
                      onPress={() =>
                        confirmDeleteMeasurement(
                          selectedMeasurement
                        )
                      }
                    >
                      <Text
                        style={
                          styles.detailsDeleteText
                        }
                      >
                        Delete Measurement
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.detailsCloseButton
                      }
                      onPress={() =>
                        setShowDetails(false)
                      }
                    >
                      <Text
                        style={
                          styles.detailsCloseButtonText
                        }
                      >
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MeasurementValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.measurementValue}>
      <Text
        style={
          styles.measurementValueLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.measurementValueText
        }
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function SmallMeasurement({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.smallMeasurement}>
      <Text
        style={
          styles.smallMeasurementLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.smallMeasurementValue
        }
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function DetailGroup({
  title,
  values,
}: {
  title: string;
  values: [string, string][];
}) {
  return (
    <View style={styles.detailsSection}>
      <Text
        style={styles.detailsSectionTitle}
      >
        {title}
      </Text>

      <View style={styles.detailsGrid}>
        {values.map(([label, value]) => (
          <View
            key={label}
            style={styles.detailItem}
          >
            <Text
              style={styles.detailLabel}
            >
              {label}
            </Text>

            <Text
              style={styles.detailValue}
            >
              {value || "-"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Cream,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 45,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  headerText: {
    flex: 1,
    paddingRight: 10,
  },

  brand: {
    color: colors.Gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.DarkText,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.Gray,
  },

  addButton: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 3,
  },

  addButtonText: {
    color: colors.White,
    fontSize: 14,
    fontWeight: "900",
  },

  customerCard: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.SoftPink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  customerAvatarText: {
    color: colors.PrimaryWine,
    fontWeight: "900",
    fontSize: 16,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.DarkText,
  },

  customerPhone: {
    marginTop: 3,
    fontSize: 12,
    color: colors.Gray,
  },

  measurementCount: {
    alignItems: "center",
    minWidth: 55,
  },

  measurementCountNumber: {
    color: colors.PrimaryWine,
    fontSize: 18,
    fontWeight: "900",
  },

  measurementCountLabel: {
    color: colors.Gray,
    fontSize: 10,
    marginTop: 2,
  },

  latestCard: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
  },

  latestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  latestTitle: {
    color: colors.White,
    fontSize: 16,
    fontWeight: "900",
  },

  latestDate: {
    color: "#F3C4D5",
    fontSize: 11,
    marginTop: 4,
  },

  latestEdit: {
    color: colors.White,
    fontSize: 12,
    fontWeight: "900",
    borderWidth: 1,
    borderColor: "#FFFFFF66",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 12,
    marginTop: 14,
  },

  measurementValue: {
    width: "25%",
  },

  measurementValueLabel: {
    color: "#F3C4D5",
    fontSize: 9,
    marginBottom: 3,
  },

  measurementValueText: {
    color: colors.White,
    fontSize: 14,
    fontWeight: "900",
  },

  searchBox: {
    height: 49,
    backgroundColor: colors.White,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.Border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 12,
  },

  searchIcon: {
    color: colors.PrimaryWine,
    fontSize: 22,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: colors.DarkText,
    fontSize: 14,
  },

  clearText: {
    fontSize: 24,
    color: colors.Gray,
    paddingLeft: 8,
  },

  filterContent: {
    paddingBottom: 16,
    gap: 8,
  },

  filterButton: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  filterButtonActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  filterText: {
    color: colors.Gray,
    fontSize: 11,
    fontWeight: "700",
  },

  filterTextActive: {
    color: colors.White,
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  historyTitle: {
    flex: 1,
    color: colors.DarkText,
    fontSize: 18,
    fontWeight: "900",
  },

  historyCount: {
    minWidth: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.SoftPink,
    color: colors.PrimaryWine,
    textAlign: "center",
    textAlignVertical: "center",
    paddingTop: 6,
    fontWeight: "900",
    fontSize: 11,
  },

  historyCard: {
    backgroundColor: colors.White,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EADCE2",
    padding: 17,
    marginBottom: 15,
    shadowColor: "#6D243F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  historyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  historyMain: {
    flex: 1,
  },

  historyType: {
    color: colors.DarkText,
    fontSize: 15,
    fontWeight: "900",
  },

  historyDate: {
    marginTop: 4,
    color: colors.Gray,
    fontSize: 11,
  },

  smallEditButton: {
    borderWidth: 1,
    borderColor: colors.PrimaryWine,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  smallEditText: {
    color: colors.PrimaryWine,
    fontSize: 10,
    fontWeight: "900",
  },

  historyMeasurements: {
    flexDirection: "row",
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.Border,
  },

  smallMeasurement: {
    flex: 1,
  },

  smallMeasurementLabel: {
    fontSize: 9,
    color: colors.Gray,
  },

  smallMeasurementValue: {
    marginTop: 3,
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "800",
  },

  notesPreview: {
    marginTop: 10,
    fontSize: 10,
    color: colors.Gray,
    fontStyle: "italic",
  },

  emptyCard: {
    backgroundColor: colors.White,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.Border,
    alignItems: "center",
    padding: 30,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "900",
    color: colors.DarkText,
  },

  emptySubtitle: {
    marginTop: 5,
    color: colors.Gray,
    fontSize: 12,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 16,
    backgroundColor: colors.PrimaryWine,
    borderRadius: 11,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },

  emptyButtonText: {
    color: colors.White,
    fontWeight: "900",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(20,10,15,0.5)",
    justifyContent: "flex-end",
  },

  formModal: {
    maxHeight: "94%",
    backgroundColor: colors.Cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },

  detailsModal: {
    maxHeight: "88%",
    backgroundColor: colors.Cream,
    borderRadius: 26,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EADCE2",
    shadowColor: "#6D243F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  modalTitle: {
    color: colors.DarkText,
    fontSize: 21,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: colors.Gray,
    fontSize: 12,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.White,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  closeText: {
    color: colors.DarkText,
    fontSize: 25,
    marginTop: -2,
  },

  formSectionTitle: {
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 9,
  },

  typeRow: {
    gap: 7,
    paddingBottom: 5,
  },

  typeChip: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  typeChipActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  typeChipText: {
    color: colors.Gray,
    fontSize: 11,
    fontWeight: "800",
  },

  typeChipTextActive: {
    color: colors.White,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },

  column: {
    flex: 1,
  },

  measurementInput: {
    width: "100%",
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.DarkText,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3C4D5",
    borderRadius: 12,
  },
  measurementHelper: {
    color: "#967986",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },


  measurementCard: {
    width: "48%",
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F3C4D5",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  fieldContainer: {
    marginBottom: 9,
  },

  fieldLabel: {
    color: "#71334F",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    minHeight: 46,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: colors.DarkText,
    fontSize: 13,
  },

  notesInput: {
    minHeight: 85,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  photoHint: {
    color: "#947783",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  photoPickerButton: {
    minHeight: 115,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F3C4D5",
    borderStyle: "dashed",
    borderRadius: 16,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },

  photoPickerIcon: {
    color: "#AD1457",
    fontSize: 32,
    fontWeight: "500",
  },

  photoPickerText: {
    color: "#AD1457",
    fontSize: 14,
    fontWeight: "800",
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  photoCard: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.LightGray,
  },

  fabricPhoto: {
    width: "100%",
    height: "100%",
  },

  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.PrimaryWine,
    alignItems: "center",
    justifyContent: "center",
  },

  removePhotoText: {
    color: colors.White,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
  },

  roughNotesInput: {
    minHeight: 150,
    borderColor: "#F3C4D5",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    textAlignVertical: "top",
    paddingTop: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    lineHeight: 21,
  },
  saveButton: {
    minHeight: 50,
    backgroundColor: colors.PrimaryWine,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  saveButtonText: {
    color: colors.White,
    fontSize: 15,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 48,
    backgroundColor: colors.White,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.Border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  cancelButtonText: {
    color: colors.DarkText,
    fontWeight: "800",
  },

  detailsSection: {
    backgroundColor: colors.White,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EADCE2",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#6D243F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  detailsSectionTitle: {
    color: colors.PrimaryWine,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: 0.2,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  detailItem: {
    width: "48%",
    backgroundColor: "#FFF4F7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0DCE4",
    padding: 13,
    minHeight: 68,
    justifyContent: "center",
  },

  detailLabel: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  detailValue: {
    color: colors.PrimaryWine,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  detailsNotes: {
    color: colors.DarkText,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: "#FFF4F7",
    borderRadius: 12,
    padding: 12,
  },

  detailsActions: {
    marginTop: 4,
    marginBottom: 12,
  },

  detailsEditButton: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D243F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  detailsEditText: {
    color: colors.White,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  detailsDeleteButton: {
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F3B8B8",
    borderRadius: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  detailsDeleteText: {
    color: colors.Red,
    fontWeight: "900",
    fontSize: 14,
  },

  detailsCloseButton: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: "#EADCE2",
    borderRadius: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  detailsCloseButtonText: {
    color: colors.PrimaryWine,
    fontWeight: "900",
    fontSize: 14,
  },
});









