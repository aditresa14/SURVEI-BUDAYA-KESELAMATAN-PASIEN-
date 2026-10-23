import { getSupabaseClient, getAppSetting, setAppSetting, deleteAppSetting, readIdbMediaCache, writeIdbMediaCache, deleteIdbMediaCache } from './supabase';

export interface LogoData {
  url: string;
}

// Synchronous 0ms read from localStorage for instant initial render
export function getCachedLogoSync(): LogoData | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = localStorage.getItem('active_logo_url');
    if (url) {
      return { url };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

// Fast (~5ms) local read from localStorage + IndexedDB
export async function getCachedLogoAsync(): Promise<LogoData | null> {
  const syncCached = getCachedLogoSync();
  if (syncCached) return syncCached;
  return await readIdbMediaCache<LogoData>('logo');
}

function persistLogoLocally(data: LogoData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('active_logo_url', data.url);
  } catch {
    // Quota exceeded in localStorage; IndexedDB below will store it reliably
  }
  writeIdbMediaCache('logo', data).catch(() => null);
}

// Convert Base64 string to a Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64.split(',')[1] || base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Compress Base64 image to maximum 500px width/height to drastically reduce size for safe storage
export function compressImageBase64(base64Str: string, maxDimension: number = 500): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL('image/png');
        resolve(compressed);
      } catch (e) {
        console.warn("Gagal mengompresi logo, gunakan aslinya:", e);
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export async function getLogo(): Promise<LogoData | null> {
  // 1. Try to fetch from Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const val = await getAppSetting<LogoData>(supabase, 'logo');
      if (val && val.url) {
        const result = { url: val.url };
        persistLogoLocally(result);
        return result;
      }
    } catch (e) {
      console.warn("Gagal mengambil logo dari database Supabase:", e);
    }
  }

  // 2. Fallback to Local Storage / IndexedDB
  return await getCachedLogoAsync();
}

export async function saveLogo(
  fileDataUrl: string, // Base64 Data URL or direct HTTP/HTTPS URL
  fileName: string
): Promise<LogoData> {
  let finalUrl = fileDataUrl;

  // Step 0: Compress image if it is a Base64 string to prevent payload size issues
  if (fileDataUrl.startsWith('data:image/')) {
    try {
      finalUrl = await compressImageBase64(fileDataUrl, 500);
    } catch (e) {
      console.warn("Gagal mengompresi gambar logo:", e);
    }
  }

  const supabase = getSupabaseClient();
  const isDataUrl = finalUrl.startsWith('data:');

  if (supabase) {
    if (isDataUrl) {
      // Step 1: Attempt to upload to Supabase Storage Bucket 'logos'
      try {
        const mimeType = finalUrl.substring(finalUrl.indexOf(":") + 1, finalUrl.indexOf(";")) || 'image/png';
        const blob = base64ToBlob(finalUrl, mimeType);
        const rawExt = fileName.split('.').pop() || 'png';
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
        const storagePath = `custom_logo_${Date.now()}.${fileExt}`;

        // Try to create bucket if allowed
        try {
          await supabase.storage.createBucket('logos', { public: true });
        } catch {
          // Ignore if permission denied
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(storagePath, blob, {
            contentType: mimeType,
            cacheControl: '31536000, immutable',
            upsert: false
          });

        if (uploadError) {
          console.warn("Unggah logo ke Storage dilewati (akan disimpan langsung ke database):", uploadError.message);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl(storagePath);
          
          if (urlData?.publicUrl) {
            finalUrl = urlData.publicUrl;
            console.log("Berhasil mengunggah logo ke Supabase Storage:", finalUrl);
          }
        }
      } catch (storageErr: any) {
        console.warn("Storage upload warning (fallback to direct database storage):", storageErr);
      }
    }

    // Step 2: Save metadata to database table 'app_settings'
    try {
      await setAppSetting(supabase, 'logo', {
        url: finalUrl
      });
    } catch (dbErr: any) {
      console.error("Gagal menyimpan logo ke database Supabase:", dbErr);
      persistLogoLocally({ url: finalUrl });
      throw new Error(`Gagal menyimpan konfigurasi logo ke database: ${dbErr?.message || dbErr}`);
    }
  }

  // Always update localStorage + IndexedDB as instant cache & fallback
  persistLogoLocally({ url: finalUrl });

  return { url: finalUrl };
}

export async function clearLogo(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await deleteAppSetting(supabase, 'logo');
    } catch (e: any) {
      console.warn("Gagal menghapus logo dari Supabase:", e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('active_logo_url');
    await deleteIdbMediaCache('logo');
  }
}


