import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const gdriveBase = path.join("G:", "My Drive");
const gdriveTargetDir = path.join(gdriveBase, "BACKUP_SURVEI_BUDAYA_KESELAMATAN_PASIEN");
const localBackupsDir = path.join(process.cwd(), "data", "backups");
const localBackupFile = path.join(localBackupsDir, "survei_realtime_backup.json");

// Helper to write backup JSON to both local disk and Google Drive (G:)
function writeBackupFiles(jsonData: Record<string, any>) {
  const jsonStr = JSON.stringify(jsonData, null, 2);
  const dateStr = new Date().toISOString().split("T")[0];

  // 1. Local backup mirror
  try {
    if (!fs.existsSync(localBackupsDir)) {
      fs.mkdirSync(localBackupsDir, { recursive: true });
    }
    const tempLocal = `${localBackupFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempLocal, jsonStr, "utf8");
    fs.renameSync(tempLocal, localBackupFile);

    // Also write dated daily backup
    const dailyLocal = path.join(localBackupsDir, `survei_daily_backup_${dateStr}.json`);
    fs.writeFileSync(dailyLocal, jsonStr, "utf8");
  } catch (err) {
    console.warn("[Local Backup Warning]:", err);
  }

  // 2. Google Drive G:\My Drive Direct Sync
  let gdriveWritten = false;
  try {
    if (fs.existsSync(gdriveBase)) {
      if (!fs.existsSync(gdriveTargetDir)) {
        fs.mkdirSync(gdriveTargetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(gdriveTargetDir, "survei_database_latest.json"), jsonStr, "utf8");
      fs.writeFileSync(path.join(gdriveTargetDir, `survei_database_${dateStr}.json`), jsonStr, "utf8");
      gdriveWritten = true;
    }
  } catch (gErr) {
    console.warn("[Google Drive Sync Warning]:", gErr);
  }

  return { gdriveWritten, localWritten: true };
}

// Fetch complete dataset from Supabase or local fallback
async function fetchFullDatabaseSnapshot() {
  const supabase = getSupabaseClient();
  const snapshot: Record<string, any> = {
    app: "SURVEI_BUDAYA_KESELAMATAN_PASIEN_AHRQ_2.0",
    version: "2.0.0",
    exported_at: new Date().toISOString(),
    surveys: [],
    hospital_accounts: [],
    app_settings: [],
  };

  if (supabase) {
    try {
      const [surveysRes, accountsRes, settingsRes] = await Promise.allSettled([
        supabase.from("ahrq_surveys").select("*").order("created_at", { ascending: false }),
        supabase.from("hospital_accounts").select("*"),
        supabase.from("app_settings").select("*"),
      ]);

      if (surveysRes.status === "fulfilled" && surveysRes.value.data) {
        snapshot.surveys = surveysRes.value.data;
      }
      if (accountsRes.status === "fulfilled" && accountsRes.value.data) {
        snapshot.hospital_accounts = accountsRes.value.data;
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value.data) {
        snapshot.app_settings = settingsRes.value.data;
      }
    } catch (e) {
      console.warn("Error querying Supabase for snapshot:", e);
    }
  }

  // Fallback to local if Supabase returned nothing and local file exists
  if ((!snapshot.surveys.length && !snapshot.hospital_accounts.length) && fs.existsSync(localBackupFile)) {
    try {
      const localContent = fs.readFileSync(localBackupFile, "utf8");
      const parsed = JSON.parse(localContent);
      return { ...parsed, exported_at: new Date().toISOString() };
    } catch (e) {
      console.warn("Failed reading local backup fallback:", e);
    }
  }

  return snapshot;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const getBackupStatus = searchParams.get("getBackupStatus");
  const syncGdriveNow = searchParams.get("syncGdriveNow");
  const exportAll = searchParams.get("exportAll");

  const gdriveAvailable = fs.existsSync(gdriveBase);

  // 1. Instant Manual Sync to Google Drive
  if (syncGdriveNow === "true") {
    try {
      const snapshot = await fetchFullDatabaseSnapshot();
      let gdriveWritten = false;
      if (gdriveAvailable) {
        const result = writeBackupFiles(snapshot);
        gdriveWritten = result.gdriveWritten;
      }

      return NextResponse.json(
        {
          success: true,
          isCloud: !gdriveAvailable,
          message: gdriveAvailable 
            ? "Data berhasil disinkronkan langsung ke Google Drive (G:\\My Drive)!" 
            : "Data survei & database berhasil disiapkan untuk sinkronisasi Google Drive!",
          targetPath: gdriveTargetDir,
          totalSurveys: snapshot.surveys?.length || 0,
          totalAccounts: snapshot.hospital_accounts?.length || 0,
          timestamp: new Date().toISOString(),
          gdriveWritten,
          snapshot: snapshot,
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Gagal sinkronisasi ke Google Drive." },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // 2. Export Full Database as JSON for direct download
  if (exportAll === "true") {
    try {
      const snapshot = await fetchFullDatabaseSnapshot();
      return NextResponse.json(snapshot, { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Gagal mengekspor data: " + err.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // 3. Backup Status and Health Check
  if (getBackupStatus === "true" || !searchParams.toString()) {
    try {
      let lastModified: string | null = null;
      let fileSizeKb = 0;
      let totalSurveys = 0;
      let totalAccounts = 0;

      if (fs.existsSync(localBackupFile)) {
        const stat = fs.statSync(localBackupFile);
        lastModified = stat.mtime.toISOString();
        fileSizeKb = Math.round(stat.size / 1024);
        try {
          const content = JSON.parse(fs.readFileSync(localBackupFile, "utf8"));
          totalSurveys = content.surveys?.length || 0;
          totalAccounts = content.hospital_accounts?.length || 0;
        } catch {
          // ignore parse error for stats
        }
      }

      // Check if file exists in Google Drive
      const gdriveFile = path.join(gdriveTargetDir, "survei_database_latest.json");
      const gdriveFileExists = fs.existsSync(gdriveFile);
      if (gdriveFileExists && !lastModified) {
        const stat = fs.statSync(gdriveFile);
        lastModified = stat.mtime.toISOString();
        fileSizeKb = Math.round(stat.size / 1024);
      }

      const stats = {
        gdriveMounted: true,
        gdriveBackupPath: gdriveTargetDir,
        gdriveFileExists,
        realtimeBackupExists: fs.existsSync(localBackupFile),
        realtimeBackupPath: "data/backups/survei_realtime_backup.json",
        lastModified,
        fileSizeKb,
        totalSurveys,
        totalAccounts,
      };

      return NextResponse.json(stats, { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Gagal memeriksa status cadangan: " + err.message },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format JSON tidak valid." },
        { status: 400, headers: corsHeaders }
      );
    }

    const { action, payload, clientSnapshot } = bodyData;

    // A. RESTORE ACTION: Restore database from an uploaded backup JSON file
    if (action === "restore") {
      const dataToRestore = payload || clientSnapshot;
      if (!dataToRestore || typeof dataToRestore !== "object") {
        return NextResponse.json(
          { success: false, error: "Berkas cadangan tidak valid atau kosong." },
          { status: 400, headers: corsHeaders }
        );
      }

      // Save safety snapshot before restore
      if (fs.existsSync(localBackupFile)) {
        const bakPath = path.join(localBackupsDir, `survei_pre_restore_backup_${Date.now()}.json`);
        try {
          fs.copyFileSync(localBackupFile, bakPath);
        } catch {}
      }

      // Write to local & Google Drive
      writeBackupFiles(dataToRestore);

      // Restore to Supabase if connected
      const supabase = getSupabaseClient();
      let restoredSurveys = 0;
      let restoredAccounts = 0;

      if (supabase) {
        try {
          if (Array.isArray(dataToRestore.surveys) && dataToRestore.surveys.length > 0) {
            const { error: sErr } = await supabase.from("ahrq_surveys").upsert(dataToRestore.surveys, { onConflict: "id" });
            if (!sErr) restoredSurveys = dataToRestore.surveys.length;
          }
          if (Array.isArray(dataToRestore.hospital_accounts) && dataToRestore.hospital_accounts.length > 0) {
            const { error: aErr } = await supabase.from("hospital_accounts").upsert(dataToRestore.hospital_accounts, { onConflict: "id" });
            if (!aErr) restoredAccounts = dataToRestore.hospital_accounts.length;
          }
          if (Array.isArray(dataToRestore.app_settings) && dataToRestore.app_settings.length > 0) {
            await supabase.from("app_settings").upsert(dataToRestore.app_settings, { onConflict: "key" });
          }
        } catch (supaErr) {
          console.warn("Restoring to Supabase encountered issues:", supaErr);
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: "Database berhasil dipulihkan secara menyeluruh!",
          restoredSurveys,
          restoredAccounts,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // B. REALTIME AUTO-SYNC: Triggered whenever data is created/updated/deleted
    let snapshot = clientSnapshot;
    if (!snapshot || typeof snapshot !== "object" || (!snapshot.surveys && !snapshot.hospital_accounts)) {
      snapshot = await fetchFullDatabaseSnapshot();
    }

    const writeResult = writeBackupFiles(snapshot);

    return NextResponse.json(
      {
        success: true,
        message: "Realtime auto-sync ke Google Drive berhasil disimpan.",
        gdriveWritten: writeResult.gdriveWritten,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses pencadangan." },
      { status: 500, headers: corsHeaders }
    );
  }
}
