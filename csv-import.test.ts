import { describe, it, expect } from "vitest";

describe("CSV Import", () => {
  it("should parse CSV data correctly", () => {
    const csv = `phoneNumber,points
0812345678,500
0898765432,1000
0811111111,750`;

    const lines = csv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue;

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ phoneNumber: "0812345678", points: 500 });
    expect(data[1]).toEqual({ phoneNumber: "0898765432", points: 1000 });
    expect(data[2]).toEqual({ phoneNumber: "0811111111", points: 750 });
  });

  it("should validate CSV format and skip invalid rows", () => {
    const invalidCsv = `phoneNumber,points
0812345678,invalid
0898765432,1000
0811111111,`;

    const lines = invalidCsv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue; // Skip invalid rows

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(1); // Only valid row
    expect(data[0]).toEqual({ phoneNumber: "0898765432", points: 1000 });
  });

  it("should handle empty CSV", () => {
    const emptyCsv = `phoneNumber,points`;

    const lines = emptyCsv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue;

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(0);
  });

  it("should handle phone number validation", () => {
    const csv = `phoneNumber,points
0812345678,500
812345678,1000
0898765432,750`;

    const lines = csv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue;

      // Validate phone number format (10 digits)
      if (!/^\d{10}$/.test(phoneNumber)) continue;

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(2); // Skip invalid phone
    expect(data[0]).toEqual({ phoneNumber: "0812345678", points: 500 });
    expect(data[1]).toEqual({ phoneNumber: "0898765432", points: 750 });
  });

  it("should handle large point values", () => {
    const csv = `phoneNumber,points
0812345678,999999
0898765432,1000000`;

    const lines = csv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue;

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(2);
    expect(data[0].points).toBe(999999);
    expect(data[1].points).toBe(1000000);
  });

  it("should handle zero and negative points", () => {
    const csv = `phoneNumber,points
0812345678,0
0898765432,-100
0811111111,500`;

    const lines = csv.split("\n").filter((l) => l.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const [phoneNumber, pointsStr] = lines[i]
        .split(",")
        .map((s) => s.trim());
      if (!phoneNumber || !pointsStr) continue;

      const points = parseInt(pointsStr);
      if (isNaN(points)) continue;

      data.push({ phoneNumber, points });
    }

    expect(data).toHaveLength(3); // All parsed (including 0 and negative)
    expect(data[0].points).toBe(0);
    expect(data[1].points).toBe(-100);
  });
});
