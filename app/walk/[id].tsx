import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Linking, Platform } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { colors, spacing, borderRadius } from "@/theme";
import { useLocalSearchParams } from "expo-router";

interface WalkData {
	status: "active" | "completed";
	userName: string;
	currentLocation?: { lat: number; lng: number };
	startedAt?: any;
	endedAt?: any;
	totalDistance?: number;
	totalDuration?: number;
}

export default function WalkViewer() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [walk, setWalk] = useState<WalkData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

	useEffect(() => {
		if (!id) {
			setError("Invalid walk link.");
			setLoading(false);
			return;
		}

		const unsub = onSnapshot(
			doc(db, "walks", id),
			(docSnap) => {
				if (docSnap.exists()) {
					setWalk(docSnap.data() as WalkData);
					setUpdatedAt(new Date());
					setLoading(false);
				} else {
					setError("Walk not found.");
					setLoading(false);
				}
			},
			(err) => {
				console.error("Firestore error:", err);
				setError("Failed to load walk data.");
				setLoading(false);
			}
		);

		return () => unsub();
	}, [id]);

	const formatDuration = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	};

	const formatDistance = (meters: number) => {
		if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
		return `${Math.round(meters)} m`;
	};

	const openMaps = () => {
		if (walk?.currentLocation) {
			const { lat, lng } = walk.currentLocation;
			const url = Platform.select({
				ios: `maps://?q=${lat},${lng}`,
				android: `geo:${lat},${lng}?q=${lat},${lng}`,
			}) || `https://maps.google.com/?q=${lat},${lng}`;
			Linking.openURL(url);
		}
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={styles.loadingText}>Loading walk...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.container}>
				<Text style={styles.errorIcon}>⚠️</Text>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}

	if (!walk) return null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>SafeWalk</Text>
				<View style={[styles.statusBadge, walk.status === "active" ? styles.statusActive : styles.statusCompleted]}>
					<View style={[styles.statusDot, walk.status === "active" ? styles.dotActive : styles.dotCompleted]} />
					<Text style={styles.statusText}>{walk.status === "active" ? "LIVE" : "COMPLETED"}</Text>
				</View>
			</View>

			<View style={styles.userInfo}>
				<Text style={styles.userName}>{walk.userName}</Text>
				<Text style={styles.userSubtitle}>
					{walk.status === "active" ? "is sharing their location" : "walk completed"}
				</Text>
			</View>

			{walk.currentLocation && (
				<View style={styles.locationCard}>
					<Text style={styles.locationLabel}>Current Location</Text>
					<Text style={styles.locationCoords}>
						{walk.currentLocation.lat.toFixed(5)}, {walk.currentLocation.lng.toFixed(5)}
					</Text>
					{updatedAt && (
						<Text style={styles.updatedText}>
							Updated at {updatedAt.toLocaleTimeString()}
						</Text>
					)}
				</View>
			)}

			{(walk.totalDistance || walk.totalDuration) && (
				<View style={styles.statsRow}>
					{walk.totalDistance ? (
						<View style={styles.statCard}>
							<Text style={styles.statValue}>{formatDistance(walk.totalDistance)}</Text>
							<Text style={styles.statLabel}>Distance</Text>
						</View>
					) : null}
					{walk.totalDuration ? (
						<View style={styles.statCard}>
							<Text style={styles.statValue}>{formatDuration(walk.totalDuration)}</Text>
							<Text style={styles.statLabel}>Duration</Text>
						</View>
					) : null}
				</View>
			)}

			{walk.currentLocation && (
				<View style={styles.mapButtonContainer}>
					<Text
						style={styles.mapButton}
						onPress={openMaps}
					>
						Open in Google Maps
					</Text>
				</View>
			)}

			<View style={styles.footer}>
				<Text style={styles.footerText}>Powered by SafeWalk</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		padding: spacing.md,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: spacing.lg,
		marginBottom: spacing.xl,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.full,
		gap: spacing.xs,
	},
	statusActive: {
		backgroundColor: "rgba(239, 68, 68, 0.2)",
	},
	statusCompleted: {
		backgroundColor: "rgba(16, 185, 129, 0.2)",
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	dotActive: {
		backgroundColor: colors.primary,
	},
	dotCompleted: {
		backgroundColor: colors.success,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "bold",
		color: colors.textPrimary,
		letterSpacing: 1,
	},
	userInfo: {
		marginBottom: spacing.lg,
	},
	userName: {
		fontSize: 22,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	userSubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: spacing.xs,
	},
	locationCard: {
		backgroundColor: colors.card,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		marginBottom: spacing.md,
	},
	locationLabel: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: spacing.sm,
	},
	locationCoords: {
		fontSize: 18,
		fontWeight: "600",
		color: colors.textPrimary,
	},
	updatedText: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: spacing.sm,
	},
	statsRow: {
		flexDirection: "row",
		gap: spacing.md,
		marginBottom: spacing.md,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.card,
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		alignItems: "center",
	},
	statValue: {
		fontSize: 20,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: spacing.xs,
	},
	mapButtonContainer: {
		alignItems: "center",
		marginTop: spacing.md,
	},
	mapButton: {
		backgroundColor: colors.primary,
		color: colors.textPrimary,
		fontSize: 16,
		fontWeight: "600",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
		borderRadius: borderRadius.lg,
		textAlign: "center",
	},
	footer: {
		flex: 1,
		justifyContent: "flex-end",
		alignItems: "center",
		paddingBottom: spacing.md,
	},
	footerText: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	loadingText: {
		color: colors.textSecondary,
		marginTop: spacing.md,
	},
	errorIcon: {
		fontSize: 48,
		marginBottom: spacing.md,
	},
	errorText: {
		fontSize: 16,
		color: colors.textSecondary,
		textAlign: "center",
	},
});
