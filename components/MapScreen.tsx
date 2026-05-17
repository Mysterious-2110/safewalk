import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

interface EmergencyPlace {
	lat: number;
	lng: number;
	name: string;
	type: "hospital" | "police" | "fire_station" | "pharmacy";
}

const DEFAULT_RADIUS = 200;

const PLACE_ICONS: Record<string, { icon: string; label: string; color: string }> = {
	police: { icon: "P", label: "Police", color: "#3B82F6" },
	fire_station: { icon: "F", label: "Fire Station", color: "#F97316" },
	pharmacy: { icon: "💊", label: "Pharmacy", color: "#10B981" },
};

function buildMapHtml(
	userLat: number,
	userLng: number,
	zones: Zone[],
	places: EmergencyPlace[],
): string {
	const zonesJson = JSON.stringify(zones);
	const placesJson = JSON.stringify(places);
	const placeIconsJson = JSON.stringify(PLACE_ICONS);

	return `<!DOCTYPE html>
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
		.leaflet-control-zoom { border: none !important; }

		.user-pin {
			width: 24px; height: 24px; border-radius: 50%;
			background: #3B82F6; border: 3px solid #fff;
			box-shadow: 0 0 12px rgba(59,130,246,0.6);
		}
		.user-pulse {
			width: 48px; height: 48px; border-radius: 50%;
			background: rgba(59,130,246,0.25); border: 2px solid rgba(59,130,246,0.4);
			position: absolute; top: -12px; left: -12px;
			animation: pulse 2s ease-in-out infinite;
		}
		@keyframes pulse {
			0% { transform: scale(0.8); opacity: 0.6; }
			50% { transform: scale(1.3); opacity: 0.2; }
			100% { transform: scale(0.8); opacity: 0.6; }
		}

		.place-marker {
			width: 28px; height: 28px; border-radius: 6px;
			display: flex; align-items: center; justify-content: center;
			font-size: 14px; font-weight: bold; color: #fff;
			border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
			cursor: pointer;
		}

		.legend {
			position: absolute; bottom: 100px; left: 16px; z-index: 1000;
			background: rgba(15, 23, 42, 0.92);
			padding: 10px 14px; border-radius: 10px;
			color: #fff; font-size: 12px;
			min-width: 150px;
			backdrop-filter: blur(8px);
			border: 1px solid rgba(255,255,255,0.08);
		}
		.legend-title {
			font-size: 13px; font-weight: 700; margin-bottom: 6px;
			color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;
		}
		.legend-section { margin-bottom: 6px; }
		.legend-section-title {
			font-size: 10px; font-weight: 600; color: #64748B;
			text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;
		}
		.legend-item { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
		.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
		.legend-place-marker {
			width: 18px; height: 18px; border-radius: 4px;
			display: flex; align-items: center; justify-content: center;
			font-size: 10px; font-weight: bold; color: #fff; flex-shrink: 0;
		}
	</style>
</head>
<body>
	<div id="map"></div>
	<div class="legend">
		<div class="legend-title">Map Legend</div>
		<div class="legend-section">
			<div class="legend-section-title">You</div>
			<div class="legend-item"><div class="legend-dot" style="background:#3B82F6;box-shadow:0 0 6px rgba(59,130,246,0.6)"></div>Your Location</div>
		</div>
		<div class="legend-section">
			<div class="legend-section-title">Emergency Services</div>
			<div class="legend-item"><div class="legend-place-marker" style="background:#3B82F6">P</div>Police</div>
			<div class="legend-item"><div class="legend-place-marker" style="background:#F97316">F</div>Fire Station</div>
			<div class="legend-item"><div class="legend-place-marker" style="background:#10B981">💊</div>Pharmacy</div>
		</div>
		<div class="legend-section">
			<div class="legend-section-title">Danger Zones</div>
			<div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div>Critical</div>
			<div class="legend-item"><div class="legend-dot" style="background:#F59E0B"></div>Moderate</div>
		</div>
	</div>
	<script>
		const map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${userLat}, ${userLng}], 14);
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			maxZoom: 19
		}).addTo(map);

		const userIcon = L.divIcon({
			className: '',
			html: '<div class="user-pulse"></div><div class="user-pin"></div>',
			iconSize: [24, 24],
			iconAnchor: [12, 12],
		});
		L.marker([${userLat}, ${userLng}], { icon: userIcon, zIndexOffset: 1000 })
			.addTo(map)
			.bindPopup('<b>You are here</b><br>Current location');

		const placeIcons = ${placeIconsJson};
		const places = ${placesJson};
		places.forEach((p) => {
			const cfg = placeIcons[p.type] || { icon: '?', label: 'Unknown', color: '#666' };
			const icon = L.divIcon({
				className: '',
				html: '<div class="place-marker" style="background:' + cfg.color + '">' + cfg.icon + '</div>',
				iconSize: [28, 28],
				iconAnchor: [14, 14],
			});
			const marker = L.marker([p.lat, p.lng], { icon: icon })
				.addTo(map)
				.bindPopup('<b>' + cfg.label + '</b><br>' + (p.name || 'Unknown'));
		});

		const zones = ${zonesJson};
		const circleMarkers = [];
		zones.forEach((z) => {
			const color = z.type === 'critical' ? '#EF4444' : '#F59E0B';
			const circle = L.circle([z.lat, z.lng], {
				radius: z.radius, color: color,
				fillColor: color, fillOpacity: 0.3, weight: 2
			}).addTo(map);
			circle.bindPopup('<b>' + z.type.toUpperCase() + '</b><br>' + (z.description || 'No description'));
			circleMarkers.push(circle);
		});

		map.on('contextmenu', (e) => {
			window.ReactNativeWebView.postMessage(JSON.stringify({
				type: 'longPress', lat: e.latlng.lat, lng: e.latlng.lng
			}));
		});

		let touchStartTime;
		map.on('touchstart', () => { touchStartTime = Date.now(); });
		map.on('touchend', (e) => {
			if (Date.now() - touchStartTime > 600) {
				window.ReactNativeWebView.postMessage(JSON.stringify({
					type: 'longPress', lat: e.latlng.lat, lng: e.latlng.lng
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
					radius: z.radius, color: color,
					fillColor: color, fillOpacity: 0.3, weight: 2
				}).addTo(map);
				circle.bindPopup('<b>' + z.type.toUpperCase() + '</b><br>' + (z.description || 'No description'));
				circleMarkers.push(circle);
			});
		};
	</script>
</body>
</html>`;
}

const PLACE_TYPES = [
	{ amenity: "police", label: "Police" },
	{ amenity: "fire_station", label: "Fire Station" },
	{ amenity: "pharmacy", label: "Pharmacy" },
];

async function fetchNearbyPlaces(lat: number, lng: number): Promise<EmergencyPlace[]> {
	const overpassQuery = `[out:json];(${PLACE_TYPES.map(
		(p) => `node["amenity"="${p.amenity}"](around:5000,${lat},${lng});`
	).join("")});out body;`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);

	try {
		const response = await fetch("https://overpass-api.de/api/interpreter", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": "SafeWalk/1.0 (community map feature)",
				"Accept": "application/json",
			},
			body: `data=${encodeURIComponent(overpassQuery)}`,
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`Overpass API returned ${response.status}: ${text.slice(0, 200)}`);
		}

		const data = await response.json();
		if (!data || !Array.isArray(data.elements)) {
			return [];
		}

		return data.elements.map((el: any) => ({
			lat: el.lat,
			lng: el.lon,
			name: el.tags?.name || el.tags?.operator || `Unnamed ${el.tags?.amenity || "place"}`,
			type: el.tags?.amenity as EmergencyPlace["type"],
		}));
	} catch (error: any) {
		clearTimeout(timeout);
		if (error.name === "AbortError") {
			throw new Error("Request timed out");
		}
		throw error;
	}
}

export function MapScreen() {
	const webViewRef = useRef<WebView | null>(null);
	const [mapHtml, setMapHtml] = useState("");
	const [zones, setZones] = useState<Zone[]>([]);
	const [places, setPlaces] = useState<EmergencyPlace[]>([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
	const [selectedType, setSelectedType] = useState<ZoneType>("critical");
	const [description, setDescription] = useState("");
	const [userLat, setUserLat] = useState(20);
	const [userLng, setUserLng] = useState(78);
	const [placesLoading, setPlacesLoading] = useState(false);
	const [placesError, setPlacesError] = useState<string | null>(null);

	useEffect(() => {
		loadZones();
		getCurrentLocation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setMapHtml(buildMapHtml(userLat, userLng, zones, places));
	}, [zones, places, userLat, userLng]);

	const getCurrentLocation = async () => {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") return;
		try {
			const loc = await Location.getCurrentPositionAsync({});
			setUserLat(loc.coords.latitude);
			setUserLng(loc.coords.longitude);
			loadPlaces(loc.coords.latitude, loc.coords.longitude);
		} catch (error) {
			console.error("Failed to get location:", error);
		}
	};

	const loadPlaces = useCallback(async (lat: number, lng: number) => {
		setPlacesLoading(true);
		setPlacesError(null);
		try {
			const results = await fetchNearbyPlaces(lat, lng);
			setPlaces(results);
		} catch (error: any) {
			console.error("Failed to fetch nearby places:", error);
			setPlacesError("Could not load emergency services");
		} finally {
			setPlacesLoading(false);
		}
	}, []);

	const handleRefreshPlaces = () => {
		loadPlaces(userLat, userLng);
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

	const placeCount = places.length;

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
				<View style={styles.headerTop}>
					<View style={styles.headerText}>
						<Text style={styles.title}>Safety Map</Text>
						<Text style={styles.subtitle}>Long-press to report a danger zone</Text>
					</View>
					<TouchableOpacity
						style={styles.refreshBtn}
						onPress={handleRefreshPlaces}
						disabled={placesLoading}
					>
						<Text style={styles.refreshBtnText}>{placesLoading ? "..." : "⟳"}</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.placeBar}>
					{placesLoading ? (
						<View style={styles.placeBarLoading}>
							<ActivityIndicator size="small" color={colors.primary} />
							<Text style={styles.placeBarText}>Loading nearby services...</Text>
						</View>
					) : placesError ? (
						<Text style={styles.placeBarError}>{placesError}</Text>
					) : (
						<View style={styles.placeBarRow}>
							<Text style={styles.placeBarText}>
								{placeCount > 0
									? `${placeCount} emergency ${placeCount === 1 ? "service" : "services"} near you`
									: "No emergency services found nearby"}
							</Text>
						</View>
					)}
				</View>
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
		zIndex: 10,
	},
	headerTop: {
		flexDirection: "row",
		backgroundColor: "rgba(15, 23, 42, 0.9)",
		borderRadius: borderRadius.lg,
		padding: spacing.md,
		alignItems: "center",
	},
	headerText: {
		flex: 1,
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
	refreshBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	refreshBtnText: {
		fontSize: 20,
		color: colors.primary,
	},
	placeBar: {
		marginTop: spacing.xs,
		backgroundColor: "rgba(15, 23, 42, 0.85)",
		borderRadius: borderRadius.md,
		padding: spacing.sm,
	},
	placeBarLoading: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	placeBarText: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	placeBarError: {
		fontSize: 12,
		color: colors.primary,
	},
	placeBarRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
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
