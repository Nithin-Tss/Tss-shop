import { describe, expect, it } from "vitest";
import { IMAGE_MAX_BYTES, NOT_SUPPORTED, TOO_BIG, checkImageFile } from "@/lib/imageUpload";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const file = (bytes, name, type) => new File([new Uint8Array(bytes)], name, { type });

describe("checkImageFile", () => {
  it("accepts real JPG, PNG and WEBP files", async () => {
    expect(await checkImageFile(file(JPG, "a.jpg", "image/jpeg"))).toBe("");
    expect(await checkImageFile(file(PNG, "a.png", "image/png"))).toBe("");
    expect(await checkImageFile(file(WEBP, "a.webp", "image/webp"))).toBe("");
  });

  it("falls back to the extension when the browser gives no type", async () => {
    expect(await checkImageFile(file(PNG, "a.PNG", ""))).toBe("");
    expect(await checkImageFile(file(PNG, "a.exe", ""))).toBe(NOT_SUPPORTED);
  });

  it("refuses a file renamed to look like a picture", async () => {
    const script = file(
      Array.from("<script>alert(1)</script>", (c) => c.charCodeAt(0)),
      "a.png",
      "image/png"
    );
    expect(await checkImageFile(script)).toBe(NOT_SUPPORTED);
  });

  it("refuses SVG, GIF, empty and missing files", async () => {
    expect(await checkImageFile(file(PNG, "a.svg", "image/svg+xml"))).toBe(NOT_SUPPORTED);
    expect(await checkImageFile(file(PNG, "a.gif", "image/gif"))).toBe(NOT_SUPPORTED);
    expect(await checkImageFile(file([], "a.png", "image/png"))).toBe(NOT_SUPPORTED);
    expect(await checkImageFile(null)).toBe(NOT_SUPPORTED);
  });

  it("refuses a file over 1MB", async () => {
    const big = file([...PNG, ...new Array(IMAGE_MAX_BYTES)], "big.png", "image/png");
    expect(await checkImageFile(big)).toBe(TOO_BIG);
  });
});
