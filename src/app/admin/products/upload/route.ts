import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin/auth";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/admin/products";

export const runtime = "nodejs";

/**
 * Product image upload. A route handler rather than a server action because
 * server actions cap request bodies at 1 MB by default and images may be 5 MB.
 * Files are written to public/uploads/<uuid>.<ext>.
 */
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received" }, { status: 400 });
  if (files.length > 10) return NextResponse.json({ error: "Upload up to 10 files at a time" }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const ext = ACCEPTED_IMAGE_TYPES[file.type];
    if (!ext) {
      errors.push(`${file.name}: only JPG, PNG, WebP or AVIF`);
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push(`${file.name}: larger than 5 MB`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(buf, ext)) {
      errors.push(`${file.name}: file contents don't match its type`);
      continue;
    }
    const name = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, name), buf);
    urls.push(`/uploads/${name}`);
  }
  return NextResponse.json({ urls, errors }, { status: urls.length ? 200 : 400 });
}

/** Magic-byte check so a renamed non-image can't be stored under public/. */
function looksLikeImage(b: Buffer, ext: string) {
  switch (ext) {
    case "jpg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "png":
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "webp":
      return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP";
    case "avif":
      return b.subarray(4, 8).toString("ascii") === "ftyp" && /avi[fs]/.test(b.subarray(8, 32).toString("ascii"));
    default:
      return false;
  }
}
