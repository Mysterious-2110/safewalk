import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { CommonActions } from "@react-navigation/native";
import { colors, spacing, borderRadius } from "@/theme";

interface ProfileScreenProps {
	navigation: {
		getParent: () => any;
	};
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
		});
		return unsubscribe;
	}, []);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigation.getParent().dispatch(
				CommonActions.reset({
					index: 0,
					routes: [{ name: "Login" }],
				})
			);
		} catch {
			Alert.alert("Error", "Failed to logout");
		}
	};

	const getInitials = (email: string) => {
		if (!email) return "?";
		const parts = email.split("@")[0].split(".");
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return parts[0].slice(0, 2).toUpperCase();
	};

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<View style={styles.avatar}>
					<Text style={styles.avatarText}>
						{getInitials(user?.email || "")}
					</Text>
				</View>
				<Text style={styles.label}>Email</Text>
				<Text style={styles.email}>{user?.email || "Not logged in"}</Text>
			</View>

			<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
				<Text style={styles.logoutText}>Logout</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.lg,
		backgroundColor: colors.background,
	},
	card: {
		width: "100%",
		backgroundColor: colors.card,
		borderRadius: borderRadius.xl,
		padding: spacing.xl,
		alignItems: "center",
		marginBottom: spacing.xl,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 5,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: colors.primary,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: spacing.md,
	},
	avatarText: {
		fontSize: 28,
		fontWeight: "bold",
		color: colors.textPrimary,
	},
	label: {
		fontSize: 13,
		color: colors.textSecondary,
		marginBottom: spacing.xs,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	email: {
		fontSize: 17,
		fontWeight: "500",
		color: colors.textPrimary,
	},
	logoutButton: {
		backgroundColor: colors.primary,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl * 2,
		borderRadius: borderRadius.md,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.textPrimary,
	},
});
