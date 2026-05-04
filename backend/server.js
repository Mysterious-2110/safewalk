require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();

app.use(cors());
app.use(express.json());

const client = twilio(
	process.env.TWILIO_ACCOUNT_SID,
	process.env.TWILIO_AUTH_TOKEN,
);

app.post("/send-sos", async (req, res) => {
	console.log("[BACKEND] req.body:", JSON.stringify(req.body));

	const { lat, lng, contacts, message } = req.body;
	console.log("[BACKEND] lat:", lat, "lng:", lng, "contacts:", contacts);

	if (!lat || !lng) {
		console.log("[BACKEND] Validation failed: Missing lat/lng");
		return res.status(400).json({ error: "Latitude and longitude are required" });
	}

	if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
		console.log("[BACKEND] Validation failed: Empty contacts array");
		return res.status(400).json({ error: "Contacts array is required and cannot be empty" });
	}

	const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
	const defaultMessage = `🚨 EMERGENCY ALERT 🚨\nI need help!\n\nMy location:\n${mapsLink}`;
	const body = message || defaultMessage;

	const results = [];
	for (const phone of contacts) {
		try {
			console.log("[BACKEND] Sending SMS to:", phone);
			const response = await client.messages.create({
				body: body,
				from: process.env.TWILIO_PHONE_NUMBER,
				to: phone,
			});
			console.log("[BACKEND] SMS sent - SID:", response.sid);
			results.push({ phone, success: true, sid: response.sid });
		} catch (error) {
			console.log("[BACKEND] SMS ERROR for", phone, ":", error.message || error);
			results.push({ phone, success: false, error: error.message });
		}
	}

	const allSuccessful = results.every((r) => r.success);
	console.log("[BACKEND] Results:", JSON.stringify(results));

	if (allSuccessful) {
		return res.status(200).json({ success: true, results });
	} else {
		return res.status(207).json({ success: false, results });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
