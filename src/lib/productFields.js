import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { getSession } from "@/lib/auth";

// The ten free-text columns on every product. Keys match the API/database
// columns; labels are what the admin shows for them.
export const EXTRA_FIELDS = [
  { key: "allergens", label: "Allergens" },
  { key: "food_recommendations", label: "Food recommendations" },
  { key: "storage_suggestions", label: "Storage suggestions" },
  ...Array.from({ length: 7 }, (_, i) => ({ key: `column${i + 1}`, label: `Column ${i + 1}` })),
];

export const emptyExtraFields = () => Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, ""]));

// "Column 1".."Column 7" are generic: the store owner names them (e.g. "Ingredients")
export const isRenamable = (key) => /^column\d+$/.test(key);

// EXTRA_FIELDS with the store's own names applied
export const withLabels = (labels = {}) =>
  EXTRA_FIELDS.map((f) => ({ ...f, label: labels[f.key] || f.label }));

export async function fetchFieldLabels() {
  const storeId = getSession()?.storeId;
  if (!storeId) return {};
  const store = await apiGet(`/api/v1/stores/${storeId}/`);
  return store?.fieldLabels || {};
}

export async function saveFieldLabels(labels) {
  const storeId = getSession()?.storeId;
  const store = await apiPatch(`/api/v1/stores/${storeId}/`, { fieldLabels: labels });
  return store?.fieldLabels || {};
}

// The store's field names for the Additional details section (defaults until loaded)
export function useFieldLabels() {
  const [labels, setLabels] = useState({});
  useEffect(() => {
    fetchFieldLabels().then(setLabels).catch(() => {});
  }, []);
  return labels;
}
