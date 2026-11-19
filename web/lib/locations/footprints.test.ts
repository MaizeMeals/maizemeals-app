import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assignVenueFootprints,
  indexFootprints,
  matchFootprint,
  nameMatchScore,
  parentForFootprint,
  recordForVenueGroup,
  type FootprintIndex,
} from "./footprints";

function square(name: string, record: string, west: number, south: number, east: number, north: number) {
  return {
    type: "Feature",
    properties: { ObjectName: name, loc_ObjectNum: record },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

/** A ring around a courtyard. The center of the hole is not inside the footprint. */
function courtyard(name: string, record: string) {
  return {
    type: "Feature",
    properties: { ObjectName: name, loc_ObjectNum: record },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-83.736, 42.272],
          [-83.734, 42.272],
          [-83.734, 42.274],
          [-83.736, 42.274],
          [-83.736, 42.272],
        ],
        [
          [-83.7354, 42.2728],
          [-83.7346, 42.2728],
          [-83.7346, 42.2734],
          [-83.7354, 42.2734],
          [-83.7354, 42.2728],
        ],
      ],
    },
  };
}

describe("building name matching", () => {
  it("treats dining-hall words as the same building", () => {
    expect(nameMatchScore("Bursley", ["Bursley Hall"])).toBe(3);
    expect(nameMatchScore("East Quad", ["East Quad"])).toBe(3);
    expect(nameMatchScore("Markley", ["Mary Markley"])).toBe(3);
    expect(nameMatchScore("North Quad", ["North Quad Complex"])).toBe(3);
  });

  it("does not treat a shared word as a full match", () => {
    expect(nameMatchScore("East Quad", ["West Quad"])).toBe(1);
    expect(nameMatchScore("Java Blu at Taubman", ["Taubman Health Sciences Library"])).toBe(1);
  });
});

describe("footprint matching", () => {
  const index: FootprintIndex = indexFootprints({
    features: [
      square("Bike Shed", "shed", -83.7352, 42.2729, -83.735, 42.2731),
      courtyard("East Quad", "east-quad"),
      square("Bursley Hall", "bursley", -83.722, 42.293, -83.72, 42.294),
      square("South Quad", "south-quad", -83.743, 42.2733, -83.741, 42.2741),
    ],
  });

  it("uses the footprint that contains the pin", () => {
    expect(matchFootprint(index, -83.742, 42.2737, "Somewhere")).toBe("south-quad");
  });

  it("outlines the hall around a courtyard pin", () => {
    expect(matchFootprint(index, -83.735, 42.2731, "East Quad")).toBe("east-quad");
  });

  it("prefers the named hall when the pin sits in a neighboring footprint", () => {
    expect(matchFootprint(index, -83.7351, 42.273, "East Quad")).toBe("east-quad");
  });

  it("ignores a pin that is nowhere near campus", () => {
    expect(matchFootprint(index, -83.8, 42.2, "Bursley")).toBeNull();
  });

  it("opens the location whose pin belongs to the clicked footprint", () => {
    const venues = assignVenueFootprints(
      [
        { parentId: "sq", venueId: "sq", name: "South Quad", lng: -83.742, lat: 42.2737 },
        { parentId: "eq", venueId: "eq", name: "East Quad", lng: -83.735, lat: 42.2731 },
        { parentId: "eq", venueId: "market", name: "East Quad Market", lng: -83.735, lat: 42.2731 },
      ],
      index,
    );
    expect(recordForVenueGroup(venues, "eq", "market")).toBe("east-quad");
    expect(parentForFootprint(venues, "south-quad", -83.742, 42.2737)).toBe("sq");
    expect(parentForFootprint(venues, "east-quad", -83.735, 42.2731)).toBe("eq");
  });
});

describe("U-M campus footprints", () => {
  const geojson = JSON.parse(
    readFileSync(path.join(process.cwd(), "public/campus-map/9-buildings.geojson"), "utf8"),
  );
  const index = indexFootprints(geojson);

  it("contains South Quad's center", () => {
    expect(matchFootprint(index, -83.742136, 42.273704, "South Quad")).toBe("1000063");
  });

  it("outlines East Quad from the middle of its courtyard", () => {
    expect(matchFootprint(index, -83.7351595, 42.273369, "East Quad")).toBe("1000054");
  });

  it("outlines North Quad from the middle of its courtyard", () => {
    expect(matchFootprint(index, -83.7398055, 42.280828, "North Quad")).toBe("1005177");
  });

  it("outlines Bursley Hall from inside the building", () => {
    expect(matchFootprint(index, -83.7209335, 42.2937425, "Bursley Dining Hall")).toBe("1000555");
  });
});
