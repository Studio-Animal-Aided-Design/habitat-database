import { describe, expect, it } from "vitest";
import { parseImportForm, requiredImportFiles } from "./files";

function completeForm(): FormData {
  const form = new FormData();
  for (const path of requiredImportFiles) form.append(`file:${path}`, new File(["header\n"], path.split("/").at(-1)!, { type: "text/csv" }));
  form.append("file:data/species-portraits/portraits/import/out/attributes/Test_attributes.csv", new File(["header\n"], "Test_attributes.csv"));
  form.append("file:data/plants/import/out/relations/Test_species_plant_relationship.csv", new File(["header\n"], "Test_species_plant_relationship.csv"));
  return form;
}

describe("import upload validation", () => {
  it("accepts the complete canonical CSV set", () => {
    const parsed = parseImportForm(completeForm(), 20, 10_000);
    expect(parsed.mode).toBe("merge");
    expect(parsed.files).toHaveLength(10);
  });

  it("rejects path traversal and unexpected files", () => {
    const form = completeForm();
    form.append("file:../../secret.csv", new File(["secret"], "secret.csv"));
    expect(() => parseImportForm(form, 20, 10_000)).toThrow(/nicht erlaubt/);
  });

  it("enforces the total CSV byte limit", () => {
    expect(() => parseImportForm(completeForm(), 20, 2)).toThrow(/höchstens/);
  });
});
