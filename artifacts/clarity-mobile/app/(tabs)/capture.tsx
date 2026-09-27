import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

export default function CaptureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addItem, items, syncStatus } = useAppData();

  const [text, setText] = useState("");
  const [brainDump, setBrainDump] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleCapture() {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (brainDump) {
      const lines = trimmed.split("\n").filter((l) => l.trim());
      lines.forEach((line) => {
        if (line.trim()) {
          addItem(line.trim());
          setCaptured((prev) => [line.trim(), ...prev]);
        }
      });
    } else {
      addItem(trimmed);
      setCaptured((prev) => [trimmed, ...prev]);
    }
    setText("");
    inputRef.current?.focus();
  }

  const recentItems = items.slice(0, 5);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, paddingBottom: 12 },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          Clarity
        </Text>
        <View style={styles.headerActions}>
          <View
            style={[styles.syncButton, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: 20 }]}
            accessibilityLabel="Automatic sync status"
          >
            <Ionicons
              name={syncStatus === "synced" ? "cloud-done-outline" : syncStatus === "error" ? "cloud-offline-outline" : "cloud-outline"}
              size={15}
              color={syncStatus === "error" ? colors.destructive : colors.mutedForeground}
            />
            <Text style={[styles.modeText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Sync</Text>
          </View>
          <TouchableOpacity
            style={[styles.modeToggle, { backgroundColor: brainDump ? colors.primary + "18" : colors.muted, borderColor: brainDump ? colors.primary : colors.border, borderRadius: 20 }]}
            onPress={() => setBrainDump((v) => !v)}
            testID="brain-dump-toggle"
          >
            <Text style={[styles.modeText, { color: brainDump ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Brain Dump</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {!brainDump && recentItems.length > 0 && (
          <View style={styles.recent}>
            <Text
              style={[
                styles.recentLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              Recent captures
            </Text>
            <FlatList
              data={recentItems}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Text
                  style={[
                    styles.recentItem,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                  numberOfLines={1}
                >
                  · {item.text}
                </Text>
              )}
            />
          </View>
        )}

        {brainDump && (
          <Text
            style={[
              styles.hint,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            One thought per line — tap Capture when done
          </Text>
        )}
      </View>

      <View
        style={[
          styles.inputArea,
          {
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 16,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              borderRadius: colors.radius / 2,
              fontFamily: "Inter_400Regular",
              ...(brainDump ? { minHeight: 120 } : {}),
            },
          ]}
          placeholder={
            brainDump
              ? "Everything on your mind, one per line…"
              : "What's on your mind?"
          }
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline={brainDump}
          returnKeyType={brainDump ? "default" : "done"}
          onSubmitEditing={brainDump ? undefined : handleCapture}
          testID="capture-input"
        />
        <TouchableOpacity
          style={[
            styles.captureBtn,
            {
              backgroundColor: text.trim() ? colors.primary : colors.muted,
              borderRadius: colors.radius / 2,
            },
          ]}
          onPress={handleCapture}
          disabled={!text.trim()}
          testID="capture-btn"
        >
          <Ionicons
            name="arrow-up"
            size={22}
            color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  modeToggle: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modeText: {
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  recent: {
    gap: 6,
  },
  recentLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  recentItem: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  captureBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
});
