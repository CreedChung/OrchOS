export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
}

export interface ObjectStorageAdapter {
  write(key: string, data: File | Blob | string, options?: { type?: string }): Promise<void>;
  read(key: string): Promise<StoredObject | null>;
  getUrl(key: string): string;
}

function toStorageBody(data: File | Blob | string): ReadableStream<Uint8Array> | string {
  if (typeof data === "string") return data;
  return data.stream() as ReadableStream<Uint8Array>;
}

export function createR2ObjectStorage(
  bucket: R2Bucket,
  scope: "avatars" | "artifacts",
): ObjectStorageAdapter {
  return {
    async write(key, data, options) {
      await bucket.put(key, toStorageBody(data), {
        httpMetadata: { contentType: options?.type },
      });
    },
    async read(key) {
      const object = await bucket.get(key);
      if (!object?.body) return null;

      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType,
      };
    },
    getUrl(key) {
      return `/api/storage/${scope}/${key}`;
    },
  };
}
