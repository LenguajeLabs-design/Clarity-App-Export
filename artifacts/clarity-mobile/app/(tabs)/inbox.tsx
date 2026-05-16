import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
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

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, updateItem, deleteItem } = useAppData();
  const [selected, setSelected] = useState<AppItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const untriaged = items.filter(
    (it) => !it.done && (!it.type || !it.area || !it.timing)
  );

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
          Inbox
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primary + "20", borderRadius: 12 },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {untriaged.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={untriaged}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 90 },
        ]}
        scrollEnabled={!!untriaged.length}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => openTriage(item)}
            showArea
            showTiming
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.mutedForeground} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Inbox clear
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Capture something first, then triage it here
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
  container: {
    flex: 1,
  },
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
  badgeText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
