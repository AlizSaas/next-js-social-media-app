import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const compressed = await sharp(buffer)
      .rotate() // auto-orient based on EXIF data
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return new Response(compressed, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(compressed.byteLength),
      },
    });
  } catch (error) {
    console.error("Image compression failed:", error);
    return Response.json({ error: "Compression failed" }, { status: 500 });
  }
}
