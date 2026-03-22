import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/theme";

interface SOSButtonProps {
	onPress: () => void;
	loading?: boolean;
}

export function SOSButton({ onPress, loading = false }: SOSButtonProps) {
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const glowOpacityAnim = useRef(new Animated.Value(0.4)).current;
	const ringScaleAnim = useRef(new Animated.Value(1)).current;
	const ringOpacityAnim = useRef(new Animated.Value(0.6)).current;

	useEffect(() => {
		const pulseAnimation = Animated.loop(
			Animated.sequence([
				Animated.parallel([
					Animated.timing(pulseAnim, {
						toValue: 1.05,
						duration: 1500,
						useNativeDriver: true,
					}),
					Animated.timing(glowOpacityAnim, {
						toValue: 0.6,
						duration: 1500,
						useNativeDriver: true,
					}),
				]),
				Animated.parallel([
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 1500,
						useNativeDriver: true,
					}),
					Animated.timing(glowOpacityAnim, {
						toValue: 0.4,
						duration: 1500,
						useNativeDriver: true,
					}),
				]),
			])
		);

		const ringAnimation = Animated.loop(
			Animated.sequence([
				Animated.parallel([
					Animated.timing(ringScaleAnim, {
						toValue: 1.4,
						duration: 2000,
						useNativeDriver: true,
					}),
					Animated.timing(ringOpacityAnim, {
						toValue: 0,
						duration: 2000,
						useNativeDriver: true,
					}),
				]),
				Animated.parallel([
					Animated.timing(ringScaleAnim, {
						toValue: 1,
						duration: 0,
						useNativeDriver: true,
					}),
					Animated.timing(ringOpacityAnim, {
						toValue: 0.6,
						duration: 0,
						useNativeDriver: true,
					}),
				]),
			])
		);

		pulseAnimation.start();
		ringAnimation.start();

		return () => {
			pulseAnimation.stop();
			ringAnimation.stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handlePressIn = () => {
		Animated.spring(scaleAnim, {
			toValue: 0.95,
			useNativeDriver: true,
			friction: 8,
			tension: 40,
		}).start();
	};

	const handlePressOut = () => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			useNativeDriver: true,
			friction: 3,
			tension: 40,
		}).start();
	};

	return (
		<View style={styles.container}>
			<View style={styles.outerGlow} />
			<Animated.View
				style={[
					styles.ring,
					{
						transform: [{ scale: ringScaleAnim }],
						opacity: ringOpacityAnim,
					},
				]}
			/>
			<Animated.View
				style={[
					styles.innerContainer,
					{ transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }] },
				]}
			>
				<Animated.View
					style={[
						styles.glow,
						{ opacity: glowOpacityAnim },
					]}
				/>
				<TouchableOpacity
					style={styles.button}
					onPress={onPress}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					activeOpacity={1}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator size="large" color={colors.textPrimary} />
					) : (
						<Text style={styles.text}>SOS</Text>
					)}
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	outerGlow: {
		position: "absolute",
		width: 240,
		height: 240,
		borderRadius: 120,
		backgroundColor: colors.primary,
		opacity: 0.08,
	},
	innerContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	glow: {
		position: "absolute",
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: colors.primary,
	},
	ring: {
		position: "absolute",
		width: 180,
		height: 180,
		borderRadius: 90,
		borderWidth: 3,
		borderColor: colors.primary,
	},
	button: {
		width: 180,
		height: 180,
		borderRadius: 90,
		backgroundColor: colors.primary,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: colors.primary,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.6,
		shadowRadius: 24,
		elevation: 16,
	},
	text: {
		fontSize: 42,
		fontWeight: "bold",
		color: colors.textPrimary,
		letterSpacing: 2,
	},
});
