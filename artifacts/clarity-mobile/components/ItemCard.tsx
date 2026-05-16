import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { AppItem, Area, Timing, AREA_LABEL, TIMING_LABEL } from "@/lib/types";

interface ItemCardProps {
  item: AppItem;
  onPress?: () => void;
  onToggleDone?: () => void;
  showArea?: boolean;
  showTiming?: boolean;
}

function areaColor(
  area: Area | null,
  colors: ReturnType<typeof useColors>
): string {
  if (!area) return colors.mutedForeground;
  const map: Record<Area, string> = {
    work: colors.areaWork,
    home: colors.areaHome,
    family: colors.areaFamily,
    personal: colors.areaPersonal,
  };
  return map[area];
}

function timingColor(
  timing: Timing | null,
  colors: ReturnType<typeof useColors>
): string {
  if (!timing) return colors.mutedForeground;
  const map: Record<Timing, string> = {
    today: colors.timingToday,
    "this-week": colors.timingWeek,
    later: colors.timingLater,
  };
  return map[timing];
}

export function ItemCard({
  item,
  onPress,
  onToggleDone,
  showArea = true,
  showTiming = true,
}: ItemCardProps) {
  const colors = useColors();

  function handleToggle() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggleDone?.();
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius / 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`item-card-${item.id}`}
    >
      <TouchableOpacity
        style={styles.checkbox}
        onPress={handleToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID={`item-check-${item.id}`}
      >
        <View
          style={[
            styles.checkCircle,
            {
              borderColor: item.area ? areaColor(item.area, colors) : colors.border,
              backgroundColor: item.done
                ? item.area
                  ? areaColor(item.area, colors)
                  : colors.mutedForeground
                : "transparent",
            },
          ]}
        >
          {item.done && (
            <Ionicons name="checkmark" size={12} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.text,
            {
              color: item.done ? colors.mutedForeground : colors.foreground,
              textDecorationLine: item.done ? "line-through" : "none",
              fontFamily: "Inter_400Regular",
            },
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>

        {(showArea || showTiming) && (
          <View style={styles.tags}>
            {showArea && item.area && (
              <View
                style={[
                  styles.tag,
                  { borderColor: areaColor(item.area, colors) },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: areaColor(item.area, colors), fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {AREA_LABEL[item.area]}
                </Text>
              </View>
            )}
            {showTiming && item.timing && (
              <View
                style={[
                  styles.tag,
                  { borderColor: timingColor(item.timing, colors) },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: timingColor(item.timing, colors), fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {TIMING_LABEL[item.timing]}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    flexShrink: 0,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
  },
});
