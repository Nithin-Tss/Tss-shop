import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE_ADMIN = "/api/v1/platform/blog/posts";
const BASE_PUBLIC = "/api/v1/blog";

/**
 * Platform Admin Blog CMS API
 */

export async function listAdminBlogPosts({ status, category, q, limit = 25, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (limit !== undefined) params.set("limit", limit);
  if (offset !== undefined) params.set("offset", offset);

  const query = params.toString();
  return apiGet(`${BASE_ADMIN}/${query ? `?${query}` : ""}`);
}

export async function getAdminBlogPost(id) {
  return apiGet(`${BASE_ADMIN}/${id}/`);
}

export async function createAdminBlogPost(data) {
  return apiPost(`${BASE_ADMIN}/`, data);
}

export async function updateAdminBlogPost(id, data) {
  return apiPatch(`${BASE_ADMIN}/${id}/`, data);
}

export async function deleteAdminBlogPost(id) {
  return apiDelete(`${BASE_ADMIN}/${id}/`);
}

export async function publishAdminBlogPost(id) {
  return apiPost(`${BASE_ADMIN}/${id}/publish/`, {});
}

export async function unpublishAdminBlogPost(id) {
  return apiPost(`${BASE_ADMIN}/${id}/unpublish/`, {});
}

/**
 * Public Blog API (read-only, published articles only)
 */

export async function fetchPublicBlogPosts({ category, q, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  if (q) params.set("q", q);
  if (limit !== undefined) params.set("limit", limit);
  if (offset !== undefined) params.set("offset", offset);

  const query = params.toString();
  return apiGet(`${BASE_PUBLIC}/${query ? `?${query}` : ""}`);
}

export async function fetchPublicBlogPostBySlug(slug) {
  return apiGet(`${BASE_PUBLIC}/${encodeURIComponent(slug)}/`);
}

export async function fetchPublicBlogCategories() {
  return apiGet(`${BASE_PUBLIC}/categories/`);
}
