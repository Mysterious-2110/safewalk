import { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, borderRadius } from "@/theme";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  active: boolean;
  notifyVia: "sms" | "whatsapp" | "both";
}

const STORAGE_KEY = "@sos_contacts";

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getNotifyLabel = (via: Contact["notifyVia"]) => {
  if (via === "sms") return "📱 SMS";
  if (via === "whatsapp") return "💬 WhatsApp";
  return "📱💬 Both";
};

export function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [newNotifyVia, setNewNotifyVia] = useState<Contact["notifyVia"]>("both");

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((c: Contact) => ({
          ...c,
          notifyVia: c.notifyVia || "sms",
        }));
        setContacts(parsed.length > 0 ? parsed : []);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  const saveContacts = async (newContacts: Contact[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
      setContacts(newContacts);
    } catch (error) {
      console.error("Failed to save contacts:", error);
    }
  };

  const addContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert("Error", "Please enter name and phone number");
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone: newPhone.trim(),
      relationship: newRelationship.trim() || "Contact",
      active: true,
      notifyVia: newNotifyVia,
    };

    saveContacts([...contacts, newContact]);
    setNewName("");
    setNewPhone("");
    setNewRelationship("");
    setNewNotifyVia("both");
    setModalVisible(false);
  };

  const toggleContact = (id: string) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
    );
    saveContacts(updated);
  };

  const deleteContact = (id: string) => {
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => saveContacts(contacts.filter((c) => c.id !== id)),
      },
    ]);
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={[styles.contactCard, !item.active && styles.contactInactive]}>
      <View style={styles.contactLeft}>
        <View
          style={[
            styles.avatar,
            !item.active && styles.avatarInactive,
          ]}
        >
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text
            style={[styles.contactName, !item.active && styles.textInactive]}
          >
            {item.name}
          </Text>
          <Text style={styles.contactRelation}>{item.relationship}</Text>
          <Text style={styles.contactPhone}>{item.phone}</Text>
          <Text style={styles.notifyBadge}>{getNotifyLabel(item.notifyVia)}</Text>
        </View>
      </View>
      <View style={styles.contactActions}>
        <Switch
          value={item.active}
          onValueChange={() => toggleContact(item.id)}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.textPrimary}
        />
        <TouchableOpacity
          onPress={() => deleteContact(item.id)}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Your Safety Network</Text>
        <Text style={styles.infoText}>
          Add trusted contacts who will be notified when you trigger an SOS
          alert.
        </Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No contacts added yet</Text>
            <Text style={styles.emptySubtext}>
              Add emergency contacts below
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add New Contact</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Contact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              placeholderTextColor={colors.textSecondary}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Relationship (e.g., Mom, Friend)"
              placeholderTextColor={colors.textSecondary}
              value={newRelationship}
              onChangeText={setNewRelationship}
            />
            <Text style={styles.notifyLabel}>Notify via:</Text>
            <View style={styles.notifyRow}>
              {(["sms", "whatsapp", "both"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.notifyChip,
                    newNotifyVia === option && styles.notifyChipActive,
                  ]}
                  onPress={() => setNewNotifyVia(option)}
                >
                  <Text
                    style={[
                      styles.notifyChipText,
                      newNotifyVia === option && styles.notifyChipTextActive,
                    ]}
                  >
                    {getNotifyLabel(option)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addContact}>
                <Text style={styles.modalSaveText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: "#1E3A5F",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#93C5FD",
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: "#93C5FD",
    lineHeight: 18,
    opacity: 0.8,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  contactCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInactive: {
    opacity: 0.6,
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  avatarInactive: {
    backgroundColor: colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  textInactive: {
    color: colors.textSecondary,
  },
  contactRelation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notifyBadge: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
    fontWeight: "600",
  },
  contactActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  deleteBtn: {
    paddingVertical: spacing.xs,
  },
  deleteText: {
    fontSize: 12,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalSave: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    backgroundColor: colors.success,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  notifyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  notifyRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notifyChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  notifyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  notifyChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  notifyChipTextActive: {
    color: colors.textPrimary,
  },
});
