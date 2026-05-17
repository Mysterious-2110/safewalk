import {
  haversineDistance,
  formatDuration,
  formatDistance,
  getInitials,
  getNotifyLabel,
  getProfileInitials,
} from "./utils";

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });

  it("calculates distance between two known points (~111km per degree at equator)", () => {
    const dist = haversineDistance(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const a = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    const b = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  it("handles negative coordinates", () => {
    const dist = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(dist).toBeGreaterThan(700_000);
    expect(dist).toBeLessThan(800_000);
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0m 45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
  });

  it("returns 0m 0s for zero", () => {
    expect(formatDuration(0)).toBe("0m 0s");
  });
});

describe("formatDistance", () => {
  it("formats meters", () => {
    expect(formatDistance(500)).toBe("500 m");
  });

  it("formats kilometers", () => {
    expect(formatDistance(1500)).toBe("1.50 km");
  });

  it("rounds to nearest meter", () => {
    expect(formatDistance(99.7)).toBe("100 m");
  });

  it("handles zero", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
});

describe("getInitials", () => {
  it("returns first and last name initials", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("handles single name", () => {
    expect(getInitials("John")).toBe("JO");
  });

  it("handles multiple middle names", () => {
    expect(getInitials("John Michael Doe")).toBe("JD");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });
});

describe("getNotifyLabel", () => {
  it("returns SMS for sms", () => {
    expect(getNotifyLabel("sms")).toBe("SMS");
  });

  it("returns WhatsApp for whatsapp", () => {
    expect(getNotifyLabel("whatsapp")).toBe("WhatsApp");
  });

  it("returns both for both", () => {
    expect(getNotifyLabel("both")).toBe("SMS & WhatsApp");
  });
});

describe("getProfileInitials", () => {
  it("returns initials from email local part", () => {
    expect(getProfileInitials("john.doe@example.com")).toBe("JD");
  });

  it("handles single-part email", () => {
    expect(getProfileInitials("john@example.com")).toBe("JO");
  });

  it("returns ? for empty email", () => {
    expect(getProfileInitials("")).toBe("?");
  });
});
