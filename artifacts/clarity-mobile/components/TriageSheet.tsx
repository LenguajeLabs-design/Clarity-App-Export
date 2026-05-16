import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  AppItem,
  Area,
  AREA_LABEL,
  ItemType,
  Timing,
  TIMING_LABEL,
  TYPE_LABEL,
} from "@/lib/types";

interface TriageSheetProps {
  item: AppItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<AppItem>) => void;
  onDelete?: () => void;
}

const TYPES: ItemType[] = ["task", "event", "note"];
const AREAS: Area[] = ["work", "home", "family", "personal"];
const TIMINGS: Timing[] = ["today", "this-week", "later"];

export function TriageSheet({
  item,
  visible,
  onClose,
  onSave,
  onDelete,
}: TriageSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<ItemType | null>(item?.type ?? null);
  const [area, setArea] = useState<Area | null>(item?.area ?? null);
  const [timing, setTiming] = useState<Timing | null>(item?.timing ?? null);

  React.useEffect(() => {
    if (item) {
      setType(item.type);
      setArea(item.area);
      setTiming(item.timing);
    }
  }, [item]);

  function handleSave() {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSave({ type, area, timing });
    onClose();
  }

  function areaColor(a: Area): string {
    const map: Record<Area, string> = {
      work: colors.areaWork,
      home: colors.areaHome,
      family: colors.areaFamily,
      personal: colors.areaPersonal,
    };
    return map[a];
  }

  function timingColor(t: Timing): string {
    const map: Record<Timing, string> = {
      today: colors.timingToday,
      "this-week": colors.timingWeek,
      later: colors.timingLater,
    };
    return map[t];
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: colors.radius,
              borderTopRightRadius: colors.radius,
            },
          ]}
          onPress={() => {}}
        >
          <View
            style={[styles.handle, { backgroundColor: colors.mutedForeground }]}
          />

          <Text
            style={[
              styles.itemText,
              { color: colors.foreground, fontFamily: "Inter_500Medium" },
            ]}
            numberOfLines={2}
          >
            {item?.text}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Section label="Type">
              <View style={styles.chips}>
                {TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={TYPE_LABEL[t]}
                    selected={type === t}
                    color={colors.primary}
                    onPress={() => setType(type === t ? null : t)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>

            <Section label="Area">
              <View style={styles.chips}>
                {AREAS.map((a) => (
                  <Chip
                    key={a}
                    label={AREA_LABEL[a]}
                    selected={area === a}
                    color={areaColor(a)}
                    onPress={() => setArea(area === a ? null : a)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>

            <Section label="When">
              <View style={styles.chips}>
                {TIMINGS.map((t) => (
                  <Chip
                    key={t}
                    label={TIMING_LABEL[t]}
                    selected={timing === t}
                    color={timingColor(t)}
                    onPress={() => setTiming(timing === t ? null : t)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>
          </ScrollView>

          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  { borderColor: colors.destructive },
                ]}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.destructive}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius / 2, flex: 1 },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  color,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  color: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          borderColor: selected ? color : colors.border,
          backgroundColor: selected ? color + "18" : "transparent",
          borderRadius: 20,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? color : colors.mutedForeground,
            fontFamily: "Inter_500Medium",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 16,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    opacity: 0.3,
  },
  itemText: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    gap: 10,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
  },
});
