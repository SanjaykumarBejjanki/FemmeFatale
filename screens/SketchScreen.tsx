import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  onBack: () => void;
  onGenerateReceipt: () => void;
};

type Stroke = {
  id: string;
  d: string;
  color: string;
  width: number;
};

export default function SketchScreen({
  onBack,
  onGenerateReceipt,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(
    Math.max(280, screenWidth - 44)
  );
  const [canvasHeight] = useState(390);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const toolRef = useRef<"pen" | "eraser">("pen");
  toolRef.current = tool;
  const currentPath = useRef("");
  const strokeId = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current = `M ${locationX} ${locationY}`;

        strokeId.current += 1;

        const newStroke: Stroke = {
          id: String(strokeId.current),
          d: currentPath.current,
          color: toolRef.current === "eraser" ? "#FFFFFF" : "#B51655",
          width: toolRef.current === "eraser" ? 22 : 3,
        };

        setStrokes((previous) => [...previous, newStroke]);
      },

      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current += ` L ${locationX} ${locationY}`;

        setStrokes((previous) => {
          if (previous.length === 0) return previous;

          const updated = [...previous];
          const last = updated[updated.length - 1];

          updated[updated.length - 1] = {
            ...last,
            d: currentPath.current,
          };

          return updated;
        });
      },

      onPanResponderRelease: () => {
        currentPath.current = "";
      },

      onPanResponderTerminate: () => {
        currentPath.current = "";
      },
    })
  ).current;

  const clearCanvas = () => {
    Alert.alert(
      "Clear sketch?",
      "This will remove all drawing from the canvas.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => setStrokes([]),
        },
      ]
    );
  };

  const pickReferencePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo permission required",
          "Allow photo library access to select fabric or design references."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.85,
        });

      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        setReferencePhotos((previous) => [...previous, uri]);
      }
    } catch (error) {
      Alert.alert(
        "Unable to open photos",
        "Please try selecting the photo again."
      );
    }
  };

  const removePhoto = (uri: string) => {
    setReferencePhotos((previous) =>
      previous.filter((photo) => photo !== uri)
    );
  };

  const handleEnhance = () => {
    if (strokes.length === 0) {
      Alert.alert(
        "No sketch yet",
        "Draw a design on the canvas before using AI Enhance."
      );
      return;
    }

    setIsEnhancing(true);

    Alert.alert(
      "AI Enhance Sketch",
      "Your drawing canvas is ready. To generate an AI-enhanced design, an AI image-generation service needs to be connected to this app.",
      [
        {
          text: "OK",
          onPress: () => setIsEnhancing(false),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={23}
            color="#B51655"
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Sketch Studio</Text>
          <Text style={styles.subtitle}>
            Your boutique design space
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="draw"
            size={24}
            color="#B51655"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.orderBanner}>
          <MaterialCommunityIcons
            name="palette-outline"
            size={18}
            color="#B51655"
          />
          <Text style={styles.orderBannerText}>
            Design your next boutique creation
          </Text>
        </View>

        {/* DRAWING CANVAS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons
                name="draw"
                size={21}
                color="#B51655"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Rough Sketch Canvas
              </Text>
              <Text style={styles.sectionSubtitle}>
                Draw using your finger
              </Text>
            </View>
          </View>

          <View
            style={styles.canvas}
            onLayout={(event) => {
              setCanvasWidth(event.nativeEvent.layout.width);
            }}
            {...panResponder.panHandlers}
          >
            <Svg
              width="100%"
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            >
              {strokes.map((stroke) => (
                <Path
                  key={stroke.id}
                  d={stroke.d}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>

            {strokes.length === 0 && (
              <View pointerEvents="none" style={styles.canvasHint}>
                <MaterialCommunityIcons
                  name="gesture-tap"
                  size={32}
                  color="#E6A6C1"
                />
                <Text style={styles.canvasHintText}>
                  Start drawing here
                </Text>
              </View>
            )}
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                tool === "pen" && styles.toolButtonActive,
              ]}
              onPress={() => setTool("pen")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={tool === "pen" ? "#FFFFFF" : "#B51655"}
              />
              <Text
                style={[
                  styles.toolText,
                  tool === "pen" && styles.toolTextActive,
                ]}
              >
                Pen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toolButton,
                toolRef.current === "eraser" && styles.toolButtonActive,
              ]}
              onPress={() => setTool("eraser")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="eraser"
                size={20}
                color={toolRef.current === "eraser" ? "#FFFFFF" : "#B51655"}
              />
              <Text
                style={[
                  styles.toolText,
                  toolRef.current === "eraser" && styles.toolTextActive,
                ]}
              >
                Eraser
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearCanvas}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={19}
                color="#B51655"
              />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleEnhance}
            disabled={isEnhancing}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="auto-fix"
              size={21}
              color="#FFFFFF"
            />
            <Text style={styles.aiButtonText}>
              {isEnhancing ? "Preparing..." : "AI Enhance Sketch"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PRIVATE REFERENCE VAULT */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons
                name="folder-lock-outline"
                size={21}
                color="#B51655"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Private Fabric & Reference Vault
              </Text>
              <Text style={styles.sectionSubtitle}>
                Add fabric, pattern or design photos
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.uploadBox}
            onPress={pickReferencePhoto}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="cloud-upload-outline"
              size={30}
              color="#B51655"
            />
            <Text style={styles.uploadTitle}>
              Upload Fabric / Reference Photo
            </Text>
            <Text style={styles.uploadSubtitle}>
              Choose an image from your phone
            </Text>
          </TouchableOpacity>

          {referencePhotos.length > 0 && (
            <View style={styles.photoGrid}>
              {referencePhotos.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoCard}>
                  <Image
                    source={{ uri }}
                    style={styles.referenceImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(uri)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={17}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.privacyNotice}>
            <MaterialCommunityIcons
              name="lock"
              size={16}
              color="#B51655"
            />
            <Text style={styles.privacyText}>
              Reference photos stay in this screen's current session.
              Cloud/private storage can be connected separately.
            </Text>
          </View>
        </View>

        {/* RECEIPT */}
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={onGenerateReceipt}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="receipt-text-check-outline"
            size={23}
            color="#FFFFFF"
          />
          <Text style={styles.receiptButtonText}>
            Generate Final Bill Receipt
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          FemmeFatale Boutique • Sketch Studio
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F2D5E1",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#B51655",
  },
  subtitle: {
    fontSize: 12,
    color: "#96717F",
    marginTop: 3,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 14,
    paddingBottom: 35,
  },
  orderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FCE4EF",
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
  },
  orderBannerText: {
    flex: 1,
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1D7E2",
    padding: 14,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#8B1238",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#96717F",
    marginTop: 3,
  },
  canvas: {
    height: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#EEDDE4",
    overflow: "hidden",
  },
  canvasHint: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasHintText: {
    marginTop: 8,
    color: "#C99BAE",
    fontSize: 13,
    fontWeight: "600",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
  },
  toolButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EED3DF",
    backgroundColor: "#FFFFFF",
  },
  toolButtonActive: {
    backgroundColor: "#B51655",
    borderColor: "#B51655",
  },
  toolText: {
    color: "#8B1238",
    fontSize: 12,
    fontWeight: "800",
  },
  toolTextActive: {
    color: "#FFFFFF",
  },
  clearButton: {
    minHeight: 46,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 12,
    backgroundColor: "#FFF0F5",
  },
  clearText: {
    color: "#B51655",
    fontSize: 12,
    fontWeight: "800",
  },
  aiButton: {
    minHeight: 49,
    marginTop: 11,
    borderRadius: 13,
    backgroundColor: "#D01860",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  uploadBox: {
    minHeight: 135,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#E6B9CC",
    backgroundColor: "#FFFAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  uploadTitle: {
    marginTop: 8,
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  uploadSubtitle: {
    marginTop: 4,
    color: "#96717F",
    fontSize: 11,
    textAlign: "center",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  photoCard: {
    width: "47%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF0F5",
  },
  referenceImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#B51655",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF0F5",
    borderRadius: 10,
    padding: 11,
    marginTop: 13,
  },
  privacyText: {
    flex: 1,
    color: "#8B1238",
    fontSize: 11,
    lineHeight: 16,
  },
  receiptButton: {
    minHeight: 57,
    backgroundColor: "#D01860",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  receiptButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  footerNote: {
    color: "#B58A9C",
    fontSize: 11,
    textAlign: "center",
    marginTop: 18,
  },
});


