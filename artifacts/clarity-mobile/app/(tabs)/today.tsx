import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItemCard } from "@/components/ItemCard";
import { TriageSheet } from "@/components/TriageSheet";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { AppItem } from "@/lib/types";

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, updateItem, deleteItem, markDone } = useAppData();
  const [showDone, setShowDone] = useState(false);
  const [selected, setSelected] = useState<AppItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayActive = items.filter(
    (it) => it.timing === "today" && !it.done
  );
  const todayDone = items.filter(
    (it) => it.done && it.doneAt && isToday(it.doneAt)
  );

  const sections = [
    ...(todayActive.length ? [{ title: "", data: todayActive }] : []),
    ...(showDone && todayDone.length
      ? [{ title: "Completed today", data: todayDone }]
      : []),
  ];

  function isToday(iso: string): boolean {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  function openTriage(item: AppItem) {
    setSelected(item);
    setSheetOpen(true);
  }

  const dayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Today
          </Text>
          <Text
            style={[
              styles.dateLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {dayLabel}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.selectionAsync();
            }
            setShowDone((v) => !v);
          }}
          style={[
            styles.doneToggle,
            {
              backgroundColor: showDone ? colors.primary + "18" : colors.muted,
              borderColor: showDone ? colors.primary : colors.border,
              borderRadius: 20,
            },
          ]}
        >
          <Ionicons
            name={showDone ? "eye" : "eye-outline"}
            size={14}
            color={showDone ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.doneToggleText,
              {
                color: showDone ? colors.primary : colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {section.title}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => openTriage(item)}
            onToggleDone={() => markDone(item.id)}
            showArea
            showTiming={false}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sunny-outline" size={48} color={colors.timingToday} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Nothing scheduled
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Triage items in Inbox and mark them for Today
            </Text>
          </View>
        }
      />

      <TriageSheet
        item={selected}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={(updates) => {
          if (selected) updateItem(selected.id, updates);
        }}
        onDelete={() => {
          if (selected) deleteItem(selected.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  dateLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  doneToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  doneToggleText: {
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
