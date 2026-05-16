import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItemCard } from "@/components/ItemCard";
import { TriageSheet } from "@/components/TriageSheet";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";
import { AppItem, Area, AREA_LABEL, Project } from "@/lib/types";

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projects, items, addProject, deleteProject, updateItem, deleteItem, markDone } =
    useAppData();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState<Area | null>(null);
  const [triageItem, setTriageItem] = useState<AppItem | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function getProjectItems(projectId: string) {
    return items.filter((it) => it.projectId === projectId && !it.done);
  }

  function areaColor(area: Area | null): string {
    if (!area) return colors.mutedForeground;
    const map: Record<Area, string> = {
      work: colors.areaWork,
      home: colors.areaHome,
      family: colors.areaFamily,
      personal: colors.areaPersonal,
    };
    return map[area];
  }

  function handleAddProject() {
    if (!newName.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    addProject(newName.trim(), newArea);
    setNewName("");
    setNewArea(null);
    setAddModalOpen(false);
  }

  function handleDeleteProject(project: Project) {
    if (Platform.OS === "web") {
      deleteProject(project.id);
      if (selectedProject?.id === project.id) setSelectedProject(null);
      return;
    }
    Alert.alert(
      "Delete project?",
      `"${project.name}" will be removed. Items stay in your inbox.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteProject(project.id);
            if (selectedProject?.id === project.id) setSelectedProject(null);
          },
        },
      ]
    );
  }

  const AREAS: Area[] = ["work", "home", "family", "personal"];

  if (selectedProject) {
    const projectItems = getProjectItems(selectedProject.id);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity
            onPress={() => setSelectedProject(null)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.projectTitleRow}>
            <View
              style={[
                styles.areaDot,
                { backgroundColor: areaColor(selectedProject.area) },
              ]}
            />
            <Text
              style={[
                styles.title,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
              numberOfLines={1}
            >
              {selectedProject.name}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteProject(selectedProject)}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={projectItems}
          keyExtractor={(it) => it.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 90 },
          ]}
          scrollEnabled={!!projectItems.length}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => {
                setTriageItem(item);
                setTriageOpen(true);
              }}
              onToggleDone={() => markDone(item.id)}
              showArea
              showTiming
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={48} color={colors.mutedForeground} />
              <Text
                style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
              >
                No tasks
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                Triage items from Inbox and assign them here
              </Text>
            </View>
          }
        />

        <TriageSheet
          item={triageItem}
          visible={triageOpen}
          onClose={() => setTriageOpen(false)}
          onSave={(updates) => {
            if (triageItem) updateItem(triageItem.id, updates);
          }}
          onDelete={() => {
            if (triageItem) deleteItem(triageItem.id);
          }}
        />
      </View>
    );
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
          Projects
        </Text>
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius / 2 },
          ]}
          onPress={() => setAddModalOpen(true)}
          testID="add-project-btn"
        >
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 90 },
        ]}
        scrollEnabled={!!projects.length}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: project }) => {
          const count = getProjectItems(project.id).length;
          return (
            <TouchableOpacity
              style={[
                styles.projectCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
              onPress={() => setSelectedProject(project)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.projectDot,
                  { backgroundColor: areaColor(project.area) },
                ]}
              />
              <View style={styles.projectInfo}>
                <Text
                  style={[
                    styles.projectName,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {project.name}
                </Text>
                {project.area && (
                  <Text
                    style={[
                      styles.projectArea,
                      { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    {AREA_LABEL[project.area]}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.taskCount,
                  { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {count}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-outline" size={48} color={colors.mutedForeground} />
            <Text
              style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
            >
              No projects yet
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            >
              Tap + to create your first project
            </Text>
          </View>
        }
      />

      <Modal
        visible={addModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setAddModalOpen(false)}
        >
          <Pressable
            style={[
              styles.addSheet,
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
                styles.sheetTitle,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              New Project
            </Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius / 2,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Project name"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddProject}
              testID="project-name-input"
            />
            <Text
              style={[
                styles.areaLabel,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              Area
            </Text>
            <View style={styles.areaChips}>
              {AREAS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.areaChip,
                    {
                      borderColor:
                        newArea === a ? areaColor(a) : colors.border,
                      backgroundColor:
                        newArea === a ? areaColor(a) + "18" : "transparent",
                      borderRadius: 20,
                    },
                  ]}
                  onPress={() => setNewArea(newArea === a ? null : a)}
                >
                  <Text
                    style={[
                      styles.areaChipText,
                      {
                        color:
                          newArea === a ? areaColor(a) : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {AREA_LABEL[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.createBtn,
                {
                  backgroundColor: newName.trim()
                    ? colors.primary
                    : colors.muted,
                  borderRadius: colors.radius / 2,
                },
              ]}
              onPress={handleAddProject}
              disabled={!newName.trim()}
            >
              <Text
                style={[
                  styles.createBtnText,
                  {
                    color: newName.trim()
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  projectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingHorizontal: 12,
  },
  areaDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  projectDot: { width: 10, height: 10, borderRadius: 5 },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 16 },
  projectArea: { fontSize: 12, marginTop: 2 },
  taskCount: { fontSize: 14 },
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  addSheet: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    opacity: 0.3,
  },
  sheetTitle: { fontSize: 20 },
  nameInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  areaLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  areaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  areaChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  areaChipText: { fontSize: 14 },
  createBtn: { padding: 16, alignItems: "center", marginTop: 4, marginBottom: 8 },
  createBtnText: { fontSize: 16 },
});
