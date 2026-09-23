import { getSupabaseClient, getAppSetting, setAppSetting, deleteAppSetting } from './supabase';

export interface WallpaperData {
  url: string;
  type: 'image' | 'video';
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

// Compress Base64 wallpaper image to maximum 1920px width/height to optimize storage & loading speed
export function compressWallpaperImageBase64(base64Str: string, maxDimension: number = 1920): Promise<string> {
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
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      } catch (e) {
        console.warn("Gagal mengompresi wallpaper, gunakan aslinya:", e);
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export async function getWallpaper(): Promise<WallpaperData | null> {
  // 1. Try to fetch from Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const val = await getAppSetting<WallpaperData>(supabase, 'wallpaper');
      if (val && val.url) {
        const result: WallpaperData = {
          url: val.url,
          type: val.type || 'image'
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('active_wallpaper_url', result.url);
            localStorage.setItem('active_wallpaper_type', result.type);
          } catch {
            // Ignore quota issues
          }
        }
        return result;
      }
    } catch (e) {
      console.warn("Gagal mengambil wallpaper dari database Supabase:", e);
    }
  }

  // 2. Fallback to Local Storage
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem('active_wallpaper_url');
    const type = localStorage.getItem('active_wallpaper_type') as 'image' | 'video' | null;
    if (url) {
      return { url, type: type || 'image' };
    }
  }

  return null;
}

export async function saveWallpaper(
  fileDataUrl: string, // Base64 Data URL or direct HTTP/HTTPS URL
  fileType: 'image' | 'video',
  fileName: string
): Promise<WallpaperData> {
  let finalUrl = fileDataUrl;

  // Step 0: Compress image if it is a Base64 string
  if (fileType === 'image' && fileDataUrl.startsWith('data:image/')) {
    try {
      finalUrl = await compressWallpaperImageBase64(fileDataUrl, 1920);
    } catch (e) {
      console.warn("Gagal mengompresi gambar wallpaper:", e);
    }
  }

  const supabase = getSupabaseClient();
  const isDataUrl = finalUrl.startsWith('data:');

  if (supabase) {
    if (isDataUrl) {
      // Step 1: Attempt to upload to Supabase Storage Bucket 'wallpapers'
      try {
        const mimeType = finalUrl.substring(finalUrl.indexOf(":") + 1, finalUrl.indexOf(";")) || (fileType === 'video' ? 'video/mp4' : 'image/jpeg');
        const blob = base64ToBlob(finalUrl, mimeType);
        const rawExt = fileName.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg');
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || (fileType === 'video' ? 'mp4' : 'jpg');
        const storagePath = `custom_wallpaper_${Date.now()}.${fileExt}`;

        // Attempt to create bucket if allowed
        try {
          await supabase.storage.createBucket('wallpapers', { public: true });
        } catch {
          // Ignore
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('wallpapers')
          .upload(storagePath, blob, {
            contentType: mimeType,
            cacheControl: '31536000, immutable',
            upsert: false
          });

        if (uploadError) {
          console.warn("Unggah wallpaper ke Storage dilewati (akan disimpan langsung ke database):", uploadError.message);
          // If video is very large (> 10MB data URL) and storage upload failed, warn
          if (fileType === 'video' && finalUrl.length > 10 * 1024 * 1024) {
            throw new Error(`Unggah video ke Storage gagal (${uploadError.message}). Harap buat bucket 'wallpapers' di Supabase atau gunakan video di bawah 8MB.`);
          }
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('wallpapers')
            .getPublicUrl(storagePath);
          
          if (urlData?.publicUrl) {
            finalUrl = urlData.publicUrl;
            console.log("Berhasil mengunggah wallpaper ke Supabase Storage:", finalUrl);
          }
        }
      } catch (storageErr: any) {
        if (fileType === 'video' && finalUrl.length > 10 * 1024 * 1024) {
          throw storageErr;
        }
        console.warn("Storage upload warning (fallback to direct database storage):", storageErr);
      }
    }

    // Step 2: Save to database table 'app_settings'
    try {
      await setAppSetting(supabase, 'wallpaper', {
        url: finalUrl,
        type: fileType
      });
    } catch (dbErr: any) {
      console.error("Gagal menyimpan wallpaper ke database Supabase:", dbErr);
      // Even if DB fails, update localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('active_wallpaper_url', finalUrl);
          localStorage.setItem('active_wallpaper_type', fileType);
        } catch (e) {
          console.warn("Gagal menyimpan wallpaper ke localStorage:", e);
        }
      }
      throw new Error(`Gagal menyimpan konfigurasi wallpaper ke database: ${dbErr?.message || dbErr}`);
    }
  }

  // Always update localStorage as instant cache & fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('active_wallpaper_url', finalUrl);
      localStorage.setItem('active_wallpaper_type', fileType);
    } catch (e) {
      console.warn("Gagal menyimpan wallpaper ke localStorage (quota exceeded):", e);
    }
  }

  return { url: finalUrl, type: fileType };
}

export async function clearWallpaper(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await deleteAppSetting(supabase, 'wallpaper');
    } catch (e: any) {
      console.warn("Gagal menghapus wallpaper dari Supabase:", e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('active_wallpaper_url');
    localStorage.removeItem('active_wallpaper_type');
  }
}

