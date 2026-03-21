require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Twilio client
const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
);

// SOS endpoint
app.post("/send-sos", async (req, res) => {
	console.log("[BACKEND] req.body:", JSON.stringify(req.body));
	try {
		const { lat, lng } = req.body;
		console.log("[BACKEND] lat:", lat, "lng:", lng);

		if (!lat || !lng) {
			console.log("[BACKEND] Validation failed: Missing lat/lng");
			return res
				.status(400)
				.json({ error: "Latitude and longitude are required" });
		}

		// Generate Google Maps link
		const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

		// Create message
		const message = `🚨 EMERGENCY SOS 🚨 I need help! Location: ${mapsLink}`;

		try {
			console.log("[BACKEND] Triggering SMS to:", process.env.TO_PHONE_NUMBER);
			const response = await client.messages.create({
				body: message,
				from: process.env.TWILIO_PHONE_NUMBER,
				to: process.env.TO_PHONE_NUMBER,
			});

			console.log("[BACKEND] SMS sent successfully - SID:", response.sid);
			return res.status(200).json({ success: true });
		} catch (error) {
			console.log("[BACKEND] SMS ERROR:", error.message || error);
			return res.status(500).json({ success: false });
		}
	} catch (error) {
		console.error("[BACKEND] Unexpected error:", error.message || error);
		res.status(500).json({ error: "Failed to send SOS message" });
	}
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
