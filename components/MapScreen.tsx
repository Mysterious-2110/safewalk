import { useEffect, useRef, useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { colors, spacing, borderRadius } from "@/theme";

type ZoneType = "critical" | "moderate";

interface Zone {
	id: string;
	lat: number;
	lng: number;
	radius: number;
	type: ZoneType;
	description: string;
}

const DEFAULT_RADIUS = 200;

export function MapScreen() {
	const webViewRef = useRef<WebView | null>(null);
	const [mapHtml, setMapHtml] = useState("");
	const [zones, setZones] = useState<Zone[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
	const [selectedType, setSelectedType] = useState<ZoneType>("critical");
	const [description, setDescription] = useState("");
	const [userLat, setUserLat] = useState(20);
	const [userLng, setUserLng] = useState(78);

	useEffect(() => {
		loadZones();
		getCurrentLocation();
	}, []);

	useEffect(() => {
		buildMapHtml();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [zones, userLat, userLng]);

	const getCurrentLocation = async () => {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") return;
		try {
			const loc = await Location.getCurrentPositionAsync({});
			setUserLat(loc.coords.latitude);
			setUserLng(loc.coords.longitude);
		} catch (error) {
			console.error("Failed to get location:", error);
		}
	};

	const loadZones = async () => {
		try {
			const snapshot = await getDocs(collection(db, "zones"));
			const loaded: Zone[] = [];
			snapshot.forEach((doc) => {
				const data = doc.data();
				loaded.push({ ...data, id: doc.id } as Zone);
			});
			setZones(loaded);
		} catch (error) {
			console.error("Failed to load zones:", error);
		}
	};

	const buildMapHtml = () => {
		const zonesJson = JSON.stringify(zones);
		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
	<style>
		body { margin: 0; padding: 0; }
		html, body, #map { height: 100%; width: 100%; }
		.leaflet-control-attribution { display: none; }
		.leaflet-control-zoom a { background: #1E293B !important; color: #fff !important; border: none !important; }
		.legend {
			position: absolute; bottom: 100px; left: 16px; z-index: 1000;
			background: rgba(30, 41, 59, 0.9); padding: 8px 12px;
			border-radius: 8px; color: #fff; font-size: 13px;
		}
		.legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
		.legend-dot { width: 12px; height: 12px; border-radius: 6px; }
	</style>
</head>
<body>
	<div id="map"></div>
	<div class="legend">
		<div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div>Critical</div>
		<div class="legend-item"><div class="legend-dot" style="background:#F59E0B"></div>Moderate</div>
	</div>
	<script>
		const map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${userLat}, ${userLng}], 14);
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			maxZoom: 19
		}).addTo(map);

		const zones = ${zonesJson};
		const circleMarkers = [];

		zones.forEach((z) => {
			const color = z.type === 'critical' ? '#EF4444' : '#F59E0B';
			const circle = L.circle([z.lat, z.lng], {
				radius: z.radius,
				color: color,
				fillColor: color,
				fillOpacity: 0.3,
				weight: 2
			}).addTo(map);
			circle.bindPopup('<b>' + z.type.toUpperCase() + '</b><br>' + (z.description || 'No description'));
			circleMarkers.push(circle);
		});

		map.on('contextmenu', (e) => {
			window.ReactNativeWebView.postMessage(JSON.stringify({
				type: 'longPress',
				lat: e.latlng.lat,
				lng: e.latlng.lng
			}));
		});

		let touchStartTime;
		let touchStartPos;
		map.on('touchstart', (e) => {
			touchStartTime = Date.now();
			touchStartPos = e.containerPoint;
		});
		map.on('touchend', (e) => {
			const duration = Date.now() - touchStartTime;
			if (duration > 600) {
				window.ReactNativeWebView.postMessage(JSON.stringify({
					type: 'longPress',
					lat: e.latlng.lat,
					lng: e.latlng.lng
				}));
			}
		});

		window.updateUserLocation = function(lat, lng) {
			map.setView([lat, lng], map.getZoom());
		};

		window.updateZones = function(newZones) {
			circleMarkers.forEach(m => map.removeLayer(m));
			circleMarkers.length = 0;
			const parsed = JSON.parse(newZones);
			parsed.forEach((z) => {
				const color = z.type === 'critical' ? '#EF4444' : '#F59E0B';
				const circle = L.circle([z.lat, z.lng], {
					radius: z.radius,
					color: color,
					fillColor: color,
					fillOpacity: 0.3,
					weight: 2
				}).addTo(map);
				circle.bindPopup('<b>' + z.type.toUpperCase() + '</b><br>' + (z.description || 'No description'));
				circleMarkers.push(circle);
			});
		};
	</script>
</body>
</html>`;
		setMapHtml(html);
	};

	const handleMessage = (event: any) => {
		try {
			const data = JSON.parse(event.nativeEvent.data);
			if (data.type === "longPress") {
				setSelectedLocation({ lat: data.lat, lng: data.lng });
				setDescription("");
				setSelectedType("critical");
				setModalVisible(true);
			}
		} catch (error) {
			console.error("Message parse error:", error);
		}
	};

	const addZone = async () => {
		if (!selectedLocation) return;
		const user = auth.currentUser;
		if (!user) {
			Alert.alert("Error", "You must be logged in to report zones.");
			return;
		}
		try {
			await addDoc(collection(db, "zones"), {
				lat: selectedLocation.lat,
				lng: selectedLocation.lng,
				radius: DEFAULT_RADIUS,
				type: selectedType,
				description: description.trim(),
				userId: user.uid,
				createdAt: serverTimestamp(),
			});
			setModalVisible(false);
			loadZones();
			Alert.alert("Zone Reported", "Your report has been added to the map.");
		} catch (error) {
			console.error("Failed to add zone:", error);
			Alert.alert("Error", "Failed to report zone.");
		}
	};

	return (
		<View style={styles.container}>
			{mapHtml ? (
				<WebView
					ref={webViewRef}
					originWhitelist={["*"]}
					source={{ html: mapHtml }}
					onMessage={handleMessage}
					style={styles.map}
				/>
			) : null}

			<View style={styles.header}>
				<Text style={styles.title}>Safety Map</Text>
				<Text style={styles.subtitle}>Long-press to report a danger zone</Text>
			</View>

			<Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Report Danger Zone</Text>
						<Text style={styles.modalSubtitle}>Select severity level:</Text>
						<View style={styles.typeRow}>
							<TouchableOpacity
								style={[styles.typeBtn, selectedType === "critical" && styles.typeBtnCritical]}
								onPress={() => setSelectedType("critical")}
							>
								<Text style={[styles.typeBtnText, selectedType === "critical" && styles.typeBtnTextActive]}>
									🔴 Critical
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.typeBtn, selectedType === "moderate" && styles.typeBtnModerate]}
								onPress={() => setSelectedType("moderate")}
							>
								<Text style={[styles.typeBtnText, selectedType === "moderate" && styles.typeBtnTextActive]}>
									🟡 Moderate
								</Text>
							</TouchableOpacity>
						</View>
						<TextInput
							style={styles.input}
							placeholder="Describe the danger (optional)"
							placeholderTextColor={colors.textSecondary}
							value={description}
							onChangeText={setDescription}
							multiline
						/>
						<View style={styles.modalButtons}>
							<TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
								<Text style={styles.cancelText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.submitBtn} onPress={addZone}>
								<Text style={styles.submitText}>Report</Text>
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
	},
	map: {
		flex: 1,
	},
	header: {
		position: "absolute",
		top: 60,
		left: spacing.md,
		right: spacing.md,
		backgroundColor: "rgba(15, 23, 42, 0.9)",
		borderRadius: borderRadius.lg,
		padding: spacing.md,
	},
	title: {
		fontSize: 22,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	subtitle: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: spacing.xs,
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
		marginBottom: spacing.sm,
		textAlign: "center",
	},
	modalSubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: spacing.md,
		textAlign: "center",
	},
	typeRow: {
		flexDirection: "row",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	typeBtn: {
		flex: 1,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
	},
	typeBtnCritical: {
		backgroundColor: "rgba(239, 68, 68, 0.2)",
		borderColor: "#EF4444",
	},
	typeBtnModerate: {
		backgroundColor: "rgba(245, 158, 11, 0.2)",
		borderColor: "#F59E0B",
	},
	typeBtnText: {
		fontSize: 14,
		color: colors.textSecondary,
		fontWeight: "600",
	},
	typeBtnTextActive: {
		color: colors.textPrimary,
	},
	input: {
		backgroundColor: colors.background,
		borderRadius: borderRadius.md,
		padding: spacing.md,
		color: colors.textPrimary,
		fontSize: 14,
		borderWidth: 1,
		borderColor: colors.border,
		minHeight: 80,
		marginBottom: spacing.md,
	},
	modalButtons: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	cancelBtn: {
		flex: 1,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
	},
	cancelText: {
		fontSize: 16,
		color: colors.textSecondary,
	},
	submitBtn: {
		flex: 1,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		backgroundColor: "#EF4444",
		alignItems: "center",
	},
	submitText: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.textPrimary,
	},
});
