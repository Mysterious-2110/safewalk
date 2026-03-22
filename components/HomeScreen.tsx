import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOSButton } from "@/components/SOSButton";
import { colors, spacing, borderRadius } from "@/theme";

const STORAGE_KEY = "@sos_contacts";

interface Contact {
	id: string;
	name: string;
	phone: string;
}

type StatusType = "safe" | "sent" | "error";

export function HomeScreen() {
	const [contactCount, setContactCount] = useState(0);
	const [latitude, setLatitude] = useState<number | null>(null);
	const [longitude, setLongitude] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<StatusType>("safe");

	useEffect(() => {
		loadContacts();
	}, []);

	const loadContacts = async () => {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			const contacts: Contact[] = stored ? JSON.parse(stored) : [];
			setContactCount(contacts.length);
		} catch (error) {
			console.error("Failed to load contacts:", error);
		}
	};

	const triggerSOS = async () => {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		setLoading(true);

		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") {
			setLoading(false);
			Alert.alert("Permission Denied", "Location permission is required for SOS.");
			return;
		}

		const loc = await Location.getCurrentPositionAsync({});
		setLatitude(loc.coords.latitude);
		setLongitude(loc.coords.longitude);

		const stored = await AsyncStorage.getItem(STORAGE_KEY);
		const contacts: Contact[] = stored ? JSON.parse(stored) : [];
		const phoneNumbers = contacts.map((c) => c.phone);

		if (phoneNumbers.length === 0) {
			setLoading(false);
			Alert.alert("No emergency contacts found");
			return;
		}

		try {
			const payload = {
				lat: loc.coords.latitude,
				lng: loc.coords.longitude,
				contacts: phoneNumbers,
			};
			console.log("[FRONTEND] Before fetch - Request payload:", JSON.stringify(payload));
			const response = await fetch("http://192.168.1.4:3000/send-sos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			console.log("[FRONTEND] Response status:", response.status);
			const responseData = await response.json();
			console.log("[FRONTEND] Response data:", JSON.stringify(responseData));

			if (response.ok) {
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				setStatus("sent");
				Alert.alert("Success", "SOS sent successfully");
				setTimeout(() => setStatus("safe"), 3000);
			} else {
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
				setStatus("error");
				Alert.alert("Error", `Failed to send SOS: ${response.status}`);
				setTimeout(() => setStatus("safe"), 3000);
			}
		} catch (error) {
			setLoading(false);
			console.log("[FRONTEND] Fetch error:", error);
			Alert.alert("Error", "Failed to send SOS");
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.appName}>SafeWalk</Text>
				<View style={styles.locationPill}>
					<Text style={styles.locationText}>
						{latitude !== null && longitude !== null
							? `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`
							: "Fetching location..."}
					</Text>
				</View>
			</View>

			<View style={styles.center}>
				<SOSButton onPress={triggerSOS} loading={loading} />
				<Text style={styles.tapText}>T A P   T O   A C T I V A T E</Text>
			</View>

			<View style={styles.bottom}>
				<View style={styles.contactsCard}>
					<Text style={styles.contactsCount}>{contactCount}</Text>
					<Text style={styles.contactsLabel}>Contacts Ready</Text>
				</View>

				<View
					style={[
						styles.statusCard,
						status === "sent" && styles.statusCardSent,
						status === "error" && styles.statusCardError,
					]}
				>
					<Text
						style={[
							styles.statusEmoji,
							status === "sent" && styles.statusEmojiSent,
							status === "error" && styles.statusEmojiError,
						]}
					>
						{status === "safe" ? "✓" : status === "sent" ? "✓" : "✗"}
					</Text>
					<Text
						style={[
							styles.statusText,
							status === "sent" && styles.statusTextSent,
							status === "error" && styles.statusTextError,
						]}
					>
						{status === "safe" ? "You are safe" : status === "sent" ? "SOS Sent!" : "Failed"}
					</Text>
					<Text
						style={[
							styles.statusSubtext,
							status === "sent" && styles.statusSubtextSent,
							status === "error" && styles.statusSubtextError,
						]}
					>
						{status === "safe"
							? "Last checked: Just now"
							: status === "sent"
							? "Contacts notified"
							: "Please try again"}
					</Text>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	header: {
		alignItems: "center",
		paddingTop: spacing.xl,
		paddingBottom: spacing.lg,
	},
	appName: {
		fontSize: 28,
		fontWeight: "bold",
		color: colors.textPrimary,
		letterSpacing: 1,
	},
	locationPill: {
		marginTop: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		backgroundColor: colors.card,
		borderRadius: borderRadius.full,
		borderWidth: 1,
		borderColor: colors.border,
	},
	locationText: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	tapText: {
		marginTop: spacing.lg,
		fontSize: 12,
		color: colors.textSecondary,
		letterSpacing: 3,
		fontWeight: "500",
	},
	bottom: {
		padding: spacing.lg,
		gap: spacing.md,
	},
	contactsCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.card,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		gap: spacing.sm,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	contactsCount: {
		fontSize: 24,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	contactsLabel: {
		fontSize: 16,
		color: colors.textSecondary,
	},
	statusCard: {
		alignItems: "center",
		backgroundColor: "#064E3B",
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		shadowColor: "#10B981",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	statusEmoji: {
		fontSize: 28,
		color: colors.success,
		marginBottom: spacing.xs,
	},
	statusText: {
		fontSize: 18,
		fontWeight: "600",
		color: colors.success,
	},
	statusSubtext: {
		fontSize: 12,
		color: "#6EE7B7",
		marginTop: spacing.xs,
	},
	statusCardSent: {
		backgroundColor: "#064E3B",
	},
	statusCardError: {
		backgroundColor: "#7F1D1D",
	},
	statusEmojiSent: {
		color: colors.success,
	},
	statusEmojiError: {
		color: colors.primary,
	},
	statusTextSent: {
		color: colors.success,
	},
	statusTextError: {
		color: colors.primary,
	},
	statusSubtextSent: {
		color: "#6EE7B7",
	},
	statusSubtextError: {
		color: "#FCA5A5",
	},
});
