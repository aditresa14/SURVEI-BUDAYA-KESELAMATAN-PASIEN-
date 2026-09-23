import { createClient } from '@supabase/supabase-js';

// Lazy-loaded Supabase client to prevent application crashes when keys are missing.
const globalForSupabase = globalThis as unknown as {
  supabaseInstance: any;
};

export function getSupabaseClient() {
  if (globalForSupabase.supabaseInstance) return globalForSupabase.supabaseInstance;

  // Read from environment variables (supports Next.js client prefix & Vercel / server-side standard envs)
  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (url && anonKey) {
    // Robustly sanitize URL to extract only the origin (protocol + host + port),
    // discarding any appended paths (like '/rest/v1/' or trailing slashes) that users might configure.
    try {
      const parsed = new URL(url);
      url = parsed.origin;
    } catch (e) {
      // Fallback to removing trailing slashes if URL parsing fails
      while (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
    }
    try {
      globalForSupabase.supabaseInstance = createClient(url, anonKey);
      return globalForSupabase.supabaseInstance;
    } catch (e) {
      console.error("Gagal menginisialisasi client Supabase:", e);
      return null;
    }
  }

  return null;
}

export function resetSupabaseClient() {
  globalForSupabase.supabaseInstance = null;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tableMissing: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: "Klien Supabase belum dikonfigurasi (URL/Anon Key kosong).", tableMissing: false };
  }
  try {
    const { error } = await supabase.from('app_settings').select('key').limit(1);
    if (error) {
      // 42P01 is Postgres error code for 'relation "app_settings" does not exist'
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { success: true, message: "Koneksi Supabase berhasil! Namun, tabel 'app_settings' belum dibuat di database Anda.", tableMissing: true };
      }
      return { success: false, message: `Kesalahan API Supabase: ${error.message} (Kode: ${error.code})`, tableMissing: false };
    }
    return { success: true, message: "Koneksi Supabase Sukses! Database terhubung dengan benar dan tabel siap digunakan.", tableMissing: false };
  } catch (e: any) {
    return { success: false, message: `Kesalahan Jaringan / CORS: ${e.message || e}`, tableMissing: false };
  }
}

export function isSupabaseConnected(): boolean {
  return getSupabaseClient() !== null;
}

// In-memory cache for app_settings to prevent repeated heavy queries (e.g. Base64 wallpaper/banners)
const appSettingsCache = new Map<string, { value: any; expiry: number }>();
const APP_SETTINGS_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export function clearAppSettingsCache(key?: string) {
  if (key) {
    appSettingsCache.delete(key);
  } else {
    appSettingsCache.clear();
  }
}

export async function getAppSetting<T = any>(
  supabase: any,
  key: string
): Promise<T | null> {
  if (!supabase) return null;

  // Check in-memory cache first
  const cached = appSettingsCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value as T;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.value !== undefined && data.value !== null) {
      let val = data.value;
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch {
          // Plain string value
        }
      }
      // Store in memory cache
      appSettingsCache.set(key, { value: val, expiry: Date.now() + APP_SETTINGS_TTL_MS });
      return val as T;
    }
  } catch (e) {
    console.warn(`Gagal mengambil setting '${key}' dari Supabase:`, e);
  }
  return null;
}

export async function setAppSetting(
  supabase: any,
  key: string,
  value: any
): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();

  // Invalidate or update memory cache immediately
  appSettingsCache.set(key, { value, expiry: Date.now() + APP_SETTINGS_TTL_MS });

  // Step 1: Check if a record with this key already exists
  try {
    const { data: existing, error: selectErr } = await supabase
      .from('app_settings')
      .select('key')
      .eq('key', key)
      .limit(1);

    if (!selectErr && existing && existing.length > 0) {
      // Row exists: perform UPDATE. Does NOT depend on ON CONFLICT or unique constraint!
      const { error: updateErr } = await supabase
        .from('app_settings')
        .update({
          value,
          updated_at: now
        })
        .eq('key', key);

      if (!updateErr) {
        return;
      }
      console.warn(`Update app_settings for '${key}' failed, will try insert:`, updateErr);
    }
  } catch (err) {
    console.warn(`Select check on app_settings for '${key}' failed:`, err);
  }

  // Step 2: Row does not exist yet (or select check failed), attempt INSERT
  const { error: insertErr } = await supabase
    .from('app_settings')
    .insert({
      key,
      value,
      updated_at: now
    });

  if (!insertErr) {
    return;
  }

  // Step 3: If insert failed due to duplicate key or race condition, fallback to UPDATE
  const { error: fallbackUpdateErr } = await supabase
    .from('app_settings')
    .update({
      value,
      updated_at: now
    })
    .eq('key', key);

  if (!fallbackUpdateErr) {
    return;
  }

  // If table does not exist (42P01)
  if (insertErr?.code === '42P01' || fallbackUpdateErr?.code === '42P01' || insertErr?.message?.includes('does not exist')) {
    throw new Error("Tabel 'app_settings' belum dibuat di database Supabase Anda. Silakan jalankan skrip SQL di tab Pengaturan.");
  }

  console.error(`Gagal menyimpan app_setting '${key}':`, fallbackUpdateErr || insertErr);
  throw new Error(`Gagal menyimpan ke database Supabase: ${fallbackUpdateErr?.message || insertErr?.message}`);
}

export async function deleteAppSetting(
  supabase: any,
  key: string
): Promise<void> {
  if (!supabase) return;
  appSettingsCache.delete(key);
  try {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', key);
    if (error) throw error;
  } catch (e: any) {
    console.warn(`Gagal menghapus setting '${key}' dari Supabase:`, e);
    throw e;
  }
}

