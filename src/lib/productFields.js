// The ten free-text columns on every product. Keys match the API/database
// columns; labels are what the admin shows for them.
export const EXTRA_FIELDS = [
  { key: "allergens", label: "Allergens" },
  { key: "food_recommendations", label: "Food recommendations" },
  { key: "storage_suggestions", label: "Storage suggestions" },
  ...Array.from({ length: 7 }, (_, i) => ({ key: `column${i + 1}`, label: `Column ${i + 1}` })),
];

export const emptyExtraFields = () => Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, ""]));
