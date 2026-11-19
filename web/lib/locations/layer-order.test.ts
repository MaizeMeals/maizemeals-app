import { describe, expect, it } from "vitest";
import { basemapLayersToLower, campusDetailBeforeId, type StackLayer } from "./layer-order";

const stack: StackLayer[] = [
  { id: "land", type: "background" },
  { id: "roads", type: "line", sourceType: "vector" },
  { id: "place-labels", type: "symbol", sourceType: "vector" },
  { id: "buildings", type: "fill", sourceType: "vector" },
  { id: "slot-campus-detail", type: "background" },
  { id: "fo-buildings", type: "fill", sourceType: "geojson" },
];

describe("campus map layer order", () => {
  it("anchors campus detail under the first basemap label", () => {
    expect(campusDetailBeforeId(stack)).toBe("place-labels");
  });

  it("lowers basemap fills that were painted above the labels", () => {
    expect(basemapLayersToLower(stack)).toEqual({
      ids: ["buildings"],
      beforeId: "place-labels",
    });
  });

  it("leaves the stack alone once those fills sit under the labels", () => {
    const ordered: StackLayer[] = [
      { id: "land", type: "background" },
      { id: "buildings", type: "fill", sourceType: "vector" },
      { id: "place-labels", type: "symbol", sourceType: "vector" },
    ];
    expect(basemapLayersToLower(ordered)).toBeNull();
  });
});
