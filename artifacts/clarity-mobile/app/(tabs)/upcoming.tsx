import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  SectionList,
  Platform,
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
import { AppItem, Timing } from "@/lib/types";

const FILTERS: { key: Timing | "done"; label: string }[] = [
  { key: "this-week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "done", label: "Done" },
];

export default function UpcomingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, updateItem, deleteItem, markDone } = useAppData();

  const [activeFilter, setActiveFilter] = useState<Timing | "done">("this-week");
  const [selected, setSelected] = useState<AppItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  let filtered: AppItem[];
  if (activeFilter === "done") {
    filtered = items.filter((it) => it.done);
  } else {
    filtered = items.filter((it) => it.timing === activeFilter && !it.done);
  }

  const sections =
    filtered.length > 0 ? [{ title: "", data: filtered }] : [];

  function openTriage(item: AppItem) {
    setSelected(item);
    setSheetOpen(true);
  }

  const filterColor = (key: Timing | "done") => {
    if (key === "this-week") return colors.timingWeek;
    if (key === "later") return colors.timingLater;
    return colors.mutedForeground;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          Upcoming
        </Text>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const fColor = filterColor(f.key);
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? fColor + "18" : "transparent",
                  borderColor: active ? fColor : colors.border,
                  borderRadius: 20,
                },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active ? fColor : colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => openTriage(item)}
            onToggleDone={() => markDone(item.id)}
            showArea
            showTiming
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={activeFilter === "done" ? "checkmark-done-outline" : "time-outline"}
              size={48}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {activeFilter === "done" ? "Nothing completed yet" : "Nothing here"}
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {activeFilter === "done"
                ? "Completed items will appear here"
                : "Triage items from Inbox to schedule them"}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
