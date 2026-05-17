const request = require("supertest");

jest.mock("twilio", () => {
  const mockCreate = jest.fn();
  return jest.fn(() => ({
    messages: { create: mockCreate },
  }));
});

process.env.TWILIO_ACCOUNT_SID = "test_sid";
process.env.TWILIO_AUTH_TOKEN = "test_token";
process.env.TWILIO_PHONE_NUMBER = "+15551234567";

const app = require("./server");
const twilio = require("twilio");

describe("POST /send-sos", () => {
  beforeEach(() => {
    twilio().messages.create.mockReset();
  });

  it("returns 400 when lat/lng are missing", async () => {
    const res = await request(app)
      .post("/send-sos")
      .send({ contacts: ["+911"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Latitude and longitude");
  });

  it("returns 400 when contacts is missing", async () => {
    const res = await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Contacts array");
  });

  it("returns 400 when contacts is empty", async () => {
    const res = await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78, contacts: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when contacts is not an array", async () => {
    const res = await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78, contacts: "+911" });
    expect(res.status).toBe(400);
  });

  it("returns 207 when some SMS sends fail", async () => {
    twilio().messages.create
      .mockResolvedValueOnce({ sid: "SM1" })
      .mockRejectedValueOnce(new Error("Invalid phone"));

    const res = await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78, contacts: ["+911", "+912"] });

    expect(res.status).toBe(207);
    expect(res.body.success).toBe(false);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].success).toBe(true);
    expect(res.body.results[1].success).toBe(false);
  });

  it("returns 200 when all SMS sends succeed", async () => {
    twilio().messages.create.mockResolvedValue({ sid: "SM123" });

    const res = await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78, contacts: ["+911", "+912"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
  });

  it("uses a custom message when provided", async () => {
    twilio().messages.create.mockResolvedValue({ sid: "SM1" });

    await request(app)
      .post("/send-sos")
      .send({
        lat: 12.34,
        lng: 56.78,
        contacts: ["+911"],
        message: "Custom alert",
      });

    expect(twilio().messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Custom alert" })
    );
  });

  it("sets from number from env", async () => {
    twilio().messages.create.mockResolvedValue({ sid: "SM1" });

    await request(app)
      .post("/send-sos")
      .send({ lat: 12.34, lng: 56.78, contacts: ["+911"] });

    expect(twilio().messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ from: "+15551234567" })
    );
  });
});
