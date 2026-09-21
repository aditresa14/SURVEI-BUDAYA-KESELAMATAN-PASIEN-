import { getSupabaseClient, getAppSetting, setAppSetting, deleteAppSetting } from './supabase';

export interface HeaderImageData {
  url: string;
  position?: 'center' | 'center-right' | 'top-right' | 'bottom-right';
  updated_at?: string;
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

// Compress Base64 image to maximum 1200px width/height to reduce size while maintaining quality for banners
export function compressHeaderImageBase64(base64Str: string, maxDimension: number = 1200): Promise<string> {
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
        const compressed = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for banners to save space
        resolve(compressed);
      } catch (e) {
        console.warn("Gagal mengompresi gambar header, gunakan aslinya:", e);
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export async function getHeaderImage(): Promise<HeaderImageData | null> {
  // 1. Try to fetch from Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const val = await getAppSetting<HeaderImageData>(supabase, 'dashboard_header_image');
      if (val && val.url) {
        const result: HeaderImageData = {
          url: val.url,
          position: val.position || 'center-right',
          updated_at: val.updated_at
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('dashboard_header_image_url', result.url);
            localStorage.setItem('dashboard_header_image_pos', result.position || 'center-right');
          } catch {
            // Ignore quota issues
          }
        }
        return result;
      }
    } catch (e) {
      console.warn("Gagal mengambil gambar header dari database Supabase:", e);
    }
  }

  // 2. Fallback to Local Storage
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem('dashboard_header_image_url');
    const position = (localStorage.getItem('dashboard_header_image_pos') || 'center-right') as HeaderImageData['position'];
    if (url) {
      return { url, position };
    }
  }

  return null;
}

export async function saveHeaderImage(
  fileDataUrl: string, // Base64 Data URL or direct HTTP/HTTPS URL
  position: 'center' | 'center-right' | 'top-right' | 'bottom-right' = 'center-right',
  fileName?: string
): Promise<HeaderImageData> {
  let finalUrl = fileDataUrl;

  // Step 0: Compress image if it is a Base64 string to prevent payload size issues
  if (fileDataUrl.startsWith('data:image/')) {
    try {
      finalUrl = await compressHeaderImageBase64(fileDataUrl);
    } catch (e) {
      console.warn("Gagal mengompresi gambar header:", e);
    }
  }

  const supabase = getSupabaseClient();
  const isDataUrl = finalUrl.startsWith('data:');

  if (supabase) {
    if (isDataUrl) {
      try {
        const mimeType = finalUrl.substring(finalUrl.indexOf(":") + 1, finalUrl.indexOf(";")) || 'image/jpeg';
        const blob = base64ToBlob(finalUrl, mimeType);
        const rawExt = fileName?.split('.').pop() || 'png';
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
        const storagePath = `custom_header_${Date.now()}.${fileExt}`;

        try {
          await supabase.storage.createBucket('dashboard', { public: true });
        } catch (bucketErr) {
          // Ignore
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dashboard')
          .upload(storagePath, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.warn("Unggah header ke storage dilewati (akan disimpan langsung ke database):", uploadError.message);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('dashboard')
            .getPublicUrl(storagePath);
          
          if (urlData?.publicUrl) {
            finalUrl = urlData.publicUrl;
            console.log("Berhasil mengunggah header banner ke Supabase Storage:", finalUrl);
          }
        }
      } catch (storageErr: any) {
        console.warn("Storage upload warning (fallback to direct database storage):", storageErr);
      }
    }

    try {
      await setAppSetting(supabase, 'dashboard_header_image', {
        url: finalUrl,
        position,
        updated_at: new Date().toISOString()
      });
    } catch (dbErr: any) {
      console.error("Gagal menyimpan header image ke database Supabase:", dbErr);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dashboard_header_image_url', finalUrl);
          localStorage.setItem('dashboard_header_image_pos', position);
        } catch (e) {
          console.warn("Gagal menyimpan gambar header ke localStorage:", e);
        }
      }
      throw new Error(`Gagal menyimpan konfigurasi gambar header ke database: ${dbErr?.message || dbErr}`);
    }
  }

  // Always update localStorage as instant cache & fallback
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('dashboard_header_image_url', finalUrl);
      localStorage.setItem('dashboard_header_image_pos', position);
    } catch (e) {
      console.warn("Gagal menyimpan gambar header ke localStorage:", e);
    }
  }

  return { url: finalUrl, position, updated_at: new Date().toISOString() };
}

export async function clearHeaderImage(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await deleteAppSetting(supabase, 'dashboard_header_image');
    } catch (e) {
      console.warn("Gagal menghapus header image di database:", e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('dashboard_header_image_url');
    localStorage.removeItem('dashboard_header_image_pos');
  }
}

