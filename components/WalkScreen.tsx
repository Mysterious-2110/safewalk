import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { colors, spacing, borderRadius } from "@/theme";

interface Contact {
	id: string;
	name: string;
	phone: string;
	active: boolean;
	notifyVia: "sms" | "whatsapp" | "both";
}

const STORAGE_KEY = "@sos_contacts";

export function WalkScreen() {
	const [isTracking, setIsTracking] = useState(false);
	const [walkId, setWalkId] = useState<string | null>(null);
	const [latitude, setLatitude] = useState<number | null>(null);
	const [longitude, setLongitude] = useState<number | null>(null);
	const [duration, setDuration] = useState(0);
	const [distance, setDistance] = useState(0);
	const locationSubscription = useRef<Location.LocationSubscription | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startLocation = useRef<{ lat: number; lng: number } | null>(null);
	const lastLocation = useRef<{ lat: number; lng: number } | null>(null);

	useEffect(() => {
		return () => {
			stopTracking();
		};
	}, []);

	const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
		const R = 6371e3;
		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;
		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;
		const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	};

	const formatDuration = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m ${s}s`;
	};

	const formatDistance = (meters: number) => {
		if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
		return `${Math.round(meters)} m`;
	};

	const startTracking = async () => {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Permission Denied", "Location permission is required for walk tracking.");
			return;
		}

		const user = auth.currentUser;
		if (!user) {
			Alert.alert("Error", "You must be logged in to start a walk.");
			return;
		}

		const stored = await AsyncStorage.getItem(STORAGE_KEY);
		const contacts: Contact[] = stored ? JSON.parse(stored) : [];
		const activeContacts = contacts.filter((c) => c.active);

		if (activeContacts.length === 0) {
			Alert.alert("No active contacts", "Add emergency contacts first.");
			return;
		}

		try {
			const id = `${user.uid}_${Date.now()}`;
			const loc = await Location.getCurrentPositionAsync({});
			const lat = loc.coords.latitude;
			const lng = loc.coords.longitude;

			await setDoc(doc(db, "walks", id), {
				userId: user.uid,
				userName: user.displayName || user.email,
				status: "active",
				startedAt: serverTimestamp(),
				currentLocation: { lat, lng },
				contacts: activeContacts.map((c) => ({
					phone: c.phone,
					name: c.name,
					notifyVia: c.notifyVia || "sms",
				})),
			});

			setWalkId(id);
			setIsTracking(true);
			setLatitude(lat);
			setLongitude(lng);
			setDuration(0);
			setDistance(0);
			startLocation.current = { lat, lng };
			lastLocation.current = { lat, lng };

			const sub = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 },
				(loc) => {
					const newLat = loc.coords.latitude;
					const newLng = loc.coords.longitude;
					setLatitude(newLat);
					setLongitude(newLng);

					if (lastLocation.current) {
						const d = haversineDistance(lastLocation.current.lat, lastLocation.current.lng, newLat, newLng);
						setDistance((prev) => prev + d);
					}
					lastLocation.current = { lat: newLat, lng: newLng };

					setDoc(doc(db, "walks", id), {
						currentLocation: { lat: newLat, lng: newLng },
					}, { merge: true });
				}
			);
			locationSubscription.current = sub;

			timerRef.current = setInterval(() => {
				setDuration((prev) => prev + 1);
			}, 1000);

			shareWalkLink(id, activeContacts, lat, lng);
		} catch (error) {
			console.error("Failed to start walk:", error);
			Alert.alert("Error", "Failed to start walk tracking.");
		}
	};

	const shareWalkLink = async (id: string, contacts: Contact[], lat: number, lng: number) => {
		const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
		const message = `🚶 Live Walk Tracking\n\nI'm sharing my live location with you.\n\n📍 My location:\n${mapsLink}\n\nFollow along in the SafeWalk app.`;

		const smsContacts = contacts.filter((c) => !c.notifyVia || c.notifyVia === "sms" || c.notifyVia === "both");
		const whatsappContacts = contacts.filter((c) => c.notifyVia === "whatsapp" || c.notifyVia === "both");

		if (smsContacts.length > 0) {
			try {
				await fetch("https://fizzier-lizeth-unfilially.ngrok-free.dev/send-sos", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						lat,
						lng,
						contacts: smsContacts.map((c) => c.phone),
						message: `🚶 I'm sharing my live walk location.\n\nMy location:\n${mapsLink}\n\nFollow along in the SafeWalk app.`,
					}),
				});
			} catch (error) {
				console.error("Failed to send SMS:", error);
			}
		}

		for (const contact of whatsappContacts) {
			const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
			const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
			await Linking.openURL(waUrl);
		}
	};

	const stopTracking = async () => {
		if (locationSubscription.current) {
			locationSubscription.current.remove();
			locationSubscription.current = null;
		}
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (walkId) {
			try {
				await setDoc(doc(db, "walks", walkId), {
					status: "completed",
					endedAt: serverTimestamp(),
					finalLocation: latitude && longitude ? { lat: latitude, lng: longitude } : null,
					totalDistance: distance,
					totalDuration: duration,
				}, { merge: true });
			} catch (error) {
				console.error("Failed to end walk:", error);
			}
		}
		setIsTracking(false);
		setWalkId(null);
		setLatitude(null);
		setLongitude(null);
		setDuration(0);
		setDistance(0);
		startLocation.current = null;
		lastLocation.current = null;
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Walk Tracker</Text>

			<View style={styles.infoCard}>
				<Text style={styles.infoTitle}>Share Your Journey</Text>
				<Text style={styles.infoText}>
					Start tracking to share your live location with your emergency contacts. They'll receive a link to follow your walk in real-time.
				</Text>
			</View>

			{isTracking ? (
				<View style={styles.trackingSection}>
					<View style={styles.liveIndicator}>
						<View style={styles.liveDot} />
						<Text style={styles.liveText}>LIVE</Text>
					</View>

					<View style={styles.statsGrid}>
						<View style={styles.statCard}>
							<Text style={styles.statValue}>{formatDuration(duration)}</Text>
							<Text style={styles.statLabel}>Duration</Text>
						</View>
						<View style={styles.statCard}>
							<Text style={styles.statValue}>{formatDistance(distance)}</Text>
							<Text style={styles.statLabel}>Distance</Text>
						</View>
					</View>

					<View style={styles.locationCard}>
						<Text style={styles.locationLabel}>Current Location</Text>
						<Text style={styles.locationCoords}>
							{latitude !== null && longitude !== null
								? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
								: "Acquiring..."}
						</Text>
						{latitude !== null && longitude !== null && (
							<TouchableOpacity
								style={styles.mapLink}
								onPress={() =>
									Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`)
								}
							>
								<Text style={styles.mapLinkText}>Open in Maps</Text>
							</TouchableOpacity>
						)}
					</View>

					<TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
						<Text style={styles.stopButtonText}>End Walk</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.idleSection}>
					<View style={styles.mapPlaceholder}>
						<Text style={styles.mapPlaceholderIcon}>📍</Text>
						<Text style={styles.mapPlaceholderText}>Start a walk to share your live location</Text>
					</View>

					<TouchableOpacity style={styles.startButton} onPress={startTracking}>
						<Text style={styles.startButtonText}>Start Walk</Text>
					</TouchableOpacity>
				</View>
			)}
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
	trackingSection: {
		flex: 1,
		justifyContent: "space-between",
	},
	liveIndicator: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
	},
	liveDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.primary,
	},
	liveText: {
		fontSize: 18,
		fontWeight: "bold",
		color: colors.primary,
		letterSpacing: 2,
	},
	statsGrid: {
		flexDirection: "row",
		gap: spacing.md,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.card,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		alignItems: "center",
	},
	statValue: {
		fontSize: 22,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	statLabel: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: spacing.xs,
	},
	locationCard: {
		backgroundColor: colors.card,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
	},
	locationLabel: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: spacing.sm,
	},
	locationCoords: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.textPrimary,
	},
	mapLink: {
		marginTop: spacing.md,
		padding: spacing.sm,
		backgroundColor: colors.primary,
		borderRadius: borderRadius.md,
		alignItems: "center",
	},
	mapLinkText: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.textPrimary,
	},
	stopButton: {
		backgroundColor: colors.primary,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		alignItems: "center",
	},
	stopButtonText: {
		fontSize: 18,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	idleSection: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	mapPlaceholder: {
		alignItems: "center",
		marginBottom: spacing.xl,
	},
	mapPlaceholderIcon: {
		fontSize: 64,
		marginBottom: spacing.md,
	},
	mapPlaceholderText: {
		fontSize: 16,
		color: colors.textSecondary,
		textAlign: "center",
	},
	startButton: {
		backgroundColor: colors.success,
		borderRadius: borderRadius.lg,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
	},
	startButtonText: {
		fontSize: 18,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
});
