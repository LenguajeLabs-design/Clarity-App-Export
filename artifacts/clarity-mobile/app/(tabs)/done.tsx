import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItemCard } from "@/components/ItemCard";
import { TriageSheet } from "@/components/TriageSheet";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { AppItem } from "@/lib/types";

export default function DoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, updateItem, deleteItem, markDone } = useAppData();

  const [selected, setSelected] = useState<AppItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const doneItems = items
    .filter((it) => it.done)
    .sort((a, b) => {
      const aDate = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const bDate = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return bDate - aDate;
    });

  function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7)
      return d.toLocaleDateString(undefined, { weekday: "long" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  type Section = { title: string; data: AppItem[] };
  const sections = doneItems.reduce<Section[]>((acc, item) => {
    const label = formatDate(item.doneAt);
    const existing = acc.find((s) => s.title === label);
    if (existing) {
      existing.data.push(item);
    } else {
      acc.push({ title: label, data: [item] });
    }
    return acc;
  }, []);

  function openTriage(item: AppItem) {
    setSelected(item);
    setSheetOpen(true);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          Done
        </Text>
        {doneItems.length > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.muted, borderRadius: 12 },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              {doneItems.length}
            </Text>
          </View>
        )}
      </View>

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
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
          )}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => openTriage(item)}
              onToggleDone={() => markDone(item.id)}
              showArea
              showTiming
            />
          )}
        />
      ) : (
        <View style={[styles.empty, { paddingBottom: bottomPad + 90 }]}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Nothing completed yet
          </Text>
          <Text
            style={[
              styles.emptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Complete a task and it will appear here
          </Text>
        </View>
      )}

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
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 14 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
