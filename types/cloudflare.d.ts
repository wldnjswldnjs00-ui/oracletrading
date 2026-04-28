// Minimal KVNamespace type for Cloudflare Workers
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(): Promise<{ keys: Array<{ name: string }> }>;
  delete(key: string): Promise<void>;
}
