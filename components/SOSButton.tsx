import * as Location from "expo-location";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function SOSButton() {
	const [location, setLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);

	const triggerSOS = async () => {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Denied",
				"Location permission is required for SOS.",
			);
			return;
		}

		const loc = await Location.getCurrentPositionAsync({});
		setLocation({
			latitude: loc.coords.latitude,
			longitude: loc.coords.longitude,
		});

		try {
			const payload = { lat: loc.coords.latitude, lng: loc.coords.longitude };
			console.log("[FRONTEND] Before fetch - Request payload:", JSON.stringify(payload));
			const response = await fetch("http://192.168.1.4:3000/send-sos", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			console.log("[FRONTEND] Response status:", response.status);
			const responseData = await response.json();
			console.log("[FRONTEND] Response data:", JSON.stringify(responseData));

			if (response.ok) {
				Alert.alert("Success", "SOS sent successfully");
			} else {
				Alert.alert("Error", `Failed to send SOS: ${response.status}`);
			}
		} catch (error) {
			console.log("[FRONTEND] Fetch error:", error);
			Alert.alert("Error", "Failed to send SOS");
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.button}
				onPress={triggerSOS}
				activeOpacity={0.7}
			>
				<Text style={styles.text}>SOS</Text>
			</TouchableOpacity>
			{location && (
				<View style={styles.locationContainer}>
					<Text style={styles.locationText}>
						Latitude: {location.latitude.toFixed(6)}
					</Text>
					<Text style={styles.locationText}>
						Longitude: {location.longitude.toFixed(6)}
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 20,
	},
	button: {
		width: 180,
		height: 180,
		borderRadius: 90,
		backgroundColor: "#ef4444",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	text: {
		fontSize: 36,
		fontWeight: "bold",
		color: "#fff",
	},
	locationContainer: {
		alignItems: "center",
		padding: 16,
		backgroundColor: "#f3f4f6",
		borderRadius: 12,
	},
	locationText: {
		fontSize: 16,
		color: "#374151",
	},
});
