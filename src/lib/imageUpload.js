// Checks a picture before it is sent to the server, so a wrong file fails at once instead of after an upload.
// The server runs the real checks (decode, re-save without metadata) and stays the authority; these mirror its
// limits and messages (apps/media/images.py).

export const IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const NOT_SUPPORTED = "Not a supported image. Use JPG, PNG or WEBP.";
export const TOO_BIG = "Image is too large. Maximum size is 1MB per image.";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSION = /\.(jpe?g|png|webp)$/i;

// The kind of picture the first bytes say it is: "jpg", "png", "webp" or null
export function sniffImage(head) {
  const at = (i, bytes) => bytes.every((b, k) => head[i + k] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "webp";
  return null;
}

// -> "" when the file looks like a JPG, PNG or WEBP within the size limit, else the reason it is refused.
// Name, declared type and the file's own first bytes must all agree it is a picture.
export async function checkImageFile(file) {
  if (!file || !file.size) return NOT_SUPPORTED;
  // Some browsers leave file.type empty, so fall back to the extension
  if (file.type ? !ALLOWED_TYPES.includes(file.type) : !ALLOWED_EXTENSION.test(file.name || "")) {
    return NOT_SUPPORTED;
  }
  if (file.size > IMAGE_MAX_BYTES) return TOO_BIG;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!sniffImage(head)) return NOT_SUPPORTED;
  } catch {
    // The file can't be read here; the server still checks it
  }
  return "";
}
