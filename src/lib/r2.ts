import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// ─── Cloudflare R2 (S3-compatible) ───────────────────────────────────────────
// Credentials come from the container env (/opt/openappo-admin/.env on the
// droplet, .env.local for local dev). Never hard-code them here.

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";

export const R2_BUCKET = process.env.R2_BUCKET || "openappo-website";

// Public base URL the website reads assets from (r2.dev URL or a custom domain
// like https://cdn.openappo.com). No trailing slash.
export const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");

export const r2Configured = Boolean(
  ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && R2_PUBLIC_BASE
);

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint:
        process.env.R2_ENDPOINT ||
        `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export function publicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key.replace(/^\/+/, "")}`;
}

/** key -> the part after R2_PUBLIC_BASE, or null if the url isn't one of ours. */
export function keyFromPublicUrl(url: string): string | null {
  if (!url || !R2_PUBLIC_BASE) return null;
  if (!url.startsWith(R2_PUBLIC_BASE + "/")) return null;
  return url.slice(R2_PUBLIC_BASE.length + 1);
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: key.endsWith(".json")
        ? "public, max-age=60"
        : "public, max-age=31536000, immutable",
    })
  );
  return publicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );
}

export async function deletePrefix(prefix: string): Promise<void> {
  const listed = await client().send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix })
  );
  const objects = (listed.Contents || []).map((o) => ({ Key: o.Key! }));
  if (!objects.length) return;
  await client().send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: objects },
    })
  );
}
