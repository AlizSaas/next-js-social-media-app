/**
 * Sends an image file to the server-side /api/compress-image endpoint
 * which uses sharp to compress and resize it. Non-image files are
 * returned unchanged.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/compress-image", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.warn("Image compression failed, using original file.");
    return file;
  }

  const blob = await res.blob();
  const baseName =
    file.name.lastIndexOf(".") !== -1
      ? file.name.substring(0, file.name.lastIndexOf("."))
      : file.name;
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
