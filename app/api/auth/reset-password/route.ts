import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, setAppSetting, getAppSetting, deleteAppSetting } from "@/lib/supabase";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let cleaned = value.trim().replace(/^['"]|['"]$/g, '').trim();
  if (cleaned.toLowerCase() === 'smpt.gmail.com') {
    return 'smtp.gmail.com';
  }
  return cleaned;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

function extractRegisteredEmail(account: any): string {
  if (!account || typeof account !== 'object') return '';
  
  let email = (
    account.email_rs || 
    account.emailRs || 
    account.email || 
    account.email_kontak || 
    account.kontak_email || 
    account.email_pic || 
    account.email_admin || 
    ''
  ).toString().trim();

  if (!email || !email.includes('@')) {
    // Scan all string properties for valid email syntax
    for (const val of Object.values(account)) {
      if (typeof val === 'string' && val.includes('@')) {
        const match = val.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match && match[1]) {
          email = match[1].trim();
          break;
        }
      }
    }
  }

  return email;
}

function findMatchingAccount(accounts: any[], identifier: string): any | null {
  if (!accounts || accounts.length === 0) return null;
  const search = identifier.toLowerCase().trim();
  const cleanSearch = search.replace(/[\s\-_.]/g, '');

  // 1. Direct match
  const exact = accounts.find((a: any) => {
    const u = (a.username || '').toLowerCase().trim();
    const e = extractRegisteredEmail(a).toLowerCase().trim();
    const k = (a.kode_rs || a.kodeRs || '').toLowerCase().trim();
    const n = (a.nama_rs || a.namaRs || '').toLowerCase().trim();
    const id = (a.id || '').toLowerCase().trim();

    return u === search || e === search || k === search || n === search || id === search;
  });

  if (exact) return exact;

  // 2. Normalized match (without spaces, dots, dashes)
  if (cleanSearch.length >= 3) {
    const fuzzy = accounts.find((a: any) => {
      const u = (a.username || '').toLowerCase().replace(/[\s\-_.]/g, '');
      const e = extractRegisteredEmail(a).toLowerCase().replace(/[\s\-_.]/g, '');
      const k = (a.kode_rs || a.kodeRs || '').toLowerCase().replace(/[\s\-_.]/g, '');
      const n = (a.nama_rs || a.namaRs || '').toLowerCase().replace(/[\s\-_.]/g, '');

      return (
        u === cleanSearch ||
        e === cleanSearch ||
        k === cleanSearch ||
        n === cleanSearch ||
        (n.length > 5 && (n.includes(cleanSearch) || cleanSearch.includes(n)))
      );
    });
    if (fuzzy) return fuzzy;
  }

  return null;
}

async function sendResetEmail(to: string, hospitalName: string, username: string, token: string): Promise<boolean> {
  const host = cleanEnvValue(process.env.SMTP_HOST);
  const smtpPortRaw = cleanEnvValue(process.env.SMTP_PORT);
  const port = parseInt(smtpPortRaw || "587", 10);
  const user = cleanEnvValue(process.env.SMTP_USER);
  const pass = cleanEnvValue(process.env.SMTP_PASS);
  const fromName = cleanEnvValue(process.env.SMTP_FROM_NAME) || "Sistem Survei AHRQ SOPS 2.0";

  const subject = `[KODE OTP] Reset Password Akun ${hospitalName} - AHRQ SOPS 2.0`;
  const textBody = `Halo ${hospitalName},

Permintaan reset password telah diterima untuk akun dengan username: ${username}.

Berikut adalah Kode Verifikasi (OTP) Anda:
${token}

Kode ini berlaku selama 15 menit. 
Jika Anda tidak merasa meminta reset password, mohon abaikan email ini dan pastikan keamanan akun Anda.

Salam,
Tim Sistem Informasi Survei Budaya Keselamatan Pasien (AHRQ SOPS 2.0)`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #43B8BD 0%, #1E6F73 100%); color: #ffffff; padding: 24px 28px; text-align: center; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px; }
    .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 13.5px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .otp-box { background: #f0fdfa; border: 2px dashed #43B8BD; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }
    .otp-title { font-size: 11px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
    .otp-code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f766e; margin: 4px 0; }
    .otp-exp { font-size: 11px; color: #64748b; margin-top: 6px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12.5px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .details-table td.label { color: #64748b; width: 40%; font-weight: 500; }
    .details-table td.val { color: #1e293b; font-weight: 600; }
    .footer { background: #f8fafc; padding: 16px 28px; font-size: 11.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>AHRQ SOPS 2.0</h2>
      <p>Sistem Survei Budaya Keselamatan Pasien Rumah Sakit</p>
    </div>
    <div class="content">
      <div class="greeting">Halo ${hospitalName},</div>
      <div class="message">
        Kami menerima permintaan untuk mengatur ulang kata sandi (password) akun Anda. Gunakan kode verifikasi (OTP) berikut untuk melanjutkan:
      </div>
      
      <div class="otp-box">
        <div class="otp-title">Kode Verifikasi (OTP)</div>
        <div class="otp-code">${token}</div>
        <div class="otp-exp">⏳ Berlaku selama 15 menit dari sekarang</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Nama Rumah Sakit</td>
          <td class="val">${hospitalName}</td>
        </tr>
        <tr>
          <td class="label">Username Akun</td>
          <td class="val">${username}</td>
        </tr>
        <tr>
          <td class="label">Waktu Permintaan</td>
          <td class="val">${new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</td>
        </tr>
      </table>

      <div class="message" style="font-size: 12px; color: #64748b; margin-bottom: 0;">
        <strong>Perhatian Keamanan:</strong> Jangan pernah membagikan kode OTP ini kepada siapapun termasuk pihak yang mengatasnamakan administrator. Jika Anda tidak merasa melakukan permintaan ini, segera hubungi tim pengelola.
      </div>
    </div>
    <div class="footer">
      Email ini dikirim otomatis oleh Portal AHRQ SOPS 2.0. Harap tidak membalas email ini secara langsung.
    </div>
  </div>
</body>
</html>
  `;

  if (!host || !user || !pass) {
    console.log(`[SMTP Belum Dikonfigurasi] Penerima: ${to} | OTP: ${token} | Subjek: ${subject}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody
    });
    console.log(`[Email OTP Terkirim Sukses] Ke: ${to} (${hospitalName})`);
    return true;
  } catch (e) {
    console.error("Gagal mengirim email reset password via SMTP:", e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format request tidak valid (wajib JSON)." },
        { status: 400, headers: corsHeaders }
      );
    }

    const { action } = body;
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Koneksi database Supabase belum terkonfigurasi pada environment." },
        { status: 500, headers: corsHeaders }
      );
    }

    // ----------------------------------------------------
    // ACTION 1: REQUEST OTP
    // ----------------------------------------------------
    if (action === 'request_otp') {
      const identifier = (body.identifier || '').toString().trim();
      if (!identifier) {
        return NextResponse.json(
          { success: false, error: "Username atau Email Rumah Sakit wajib diisi." },
          { status: 400, headers: corsHeaders }
        );
      }

      // Fetch accounts to find matching record
      const { data: accounts, error: accError } = await supabase
        .from('hospital_accounts')
        .select('*');

      if (accError || !accounts || accounts.length === 0) {
        return NextResponse.json(
          { success: false, error: "Gagal mengakses data akun rumah sakit. Pastikan database terhubung." },
          { status: 500, headers: corsHeaders }
        );
      }

      const account = findMatchingAccount(accounts, identifier);

      if (!account) {
        return NextResponse.json(
          { success: false, error: "Akun dengan username, email, atau nama RS tersebut tidak ditemukan dalam sistem." },
          { status: 404, headers: corsHeaders }
        );
      }

      const registeredEmail = extractRegisteredEmail(account);
      if (!registeredEmail || !registeredEmail.includes('@')) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Akun "${account.nama_rs || account.username}" belum memiliki alamat email yang terdaftar di database. Silakan hubungi Administrator untuk mendaftarkan email profil akun Anda.` 
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Generate secure 6-digit OTP
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity
      const hospitalName = account.nama_rs || account.namaRs || 'Rumah Sakit';
      const username = account.username || '';

      const tokenPayload = {
        token,
        expiresAt,
        accountId: account.id,
        username: account.username,
        email: registeredEmail,
        createdAt: new Date().toISOString()
      };

      // 1. Store token in app_settings (robust key-value storage)
      try {
        await setAppSetting(supabase, `PWDRESET_${account.id}`, JSON.stringify(tokenPayload));
      } catch (err) {
        console.warn("Saving to app_settings error (fallback will be used):", err);
      }

      // 2. Also store token in ahrq_surveys as fallback
      try {
        await supabase.from('ahrq_surveys').upsert({
          id: `PWDRESET_${account.id}`,
          nama_rs: hospitalName,
          unit_kerja: 'PASSWORD_RESET',
          jumlah_responden: 0,
          tanggal_input: new Date().toISOString().split('T')[0],
          dimensi_scores: tokenPayload
        });
      } catch (err) {
        console.warn("Saving to ahrq_surveys error:", err);
      }

      // 3. Record in email_notifications table
      try {
        await supabase.from('email_notifications').insert([{
          id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          to_email: registeredEmail,
          subject: `[KODE OTP] Reset Password - ${hospitalName}`,
          body: `Kode OTP Anda: ${token} (Berlaku 15 menit). Username: ${username}`,
          type: 'password_reset',
          created_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn("Recording to email_notifications error:", err);
      }

      // 4. Send the real email via SMTP
      const emailSent = await sendResetEmail(registeredEmail, hospitalName, username, token);

      // Mask email for user privacy and security
      const [mailUser, mailDomain] = registeredEmail.split('@');
      const visibleCount = Math.min(3, Math.max(1, Math.floor(mailUser.length / 2)));
      const maskedEmail = `${mailUser.substring(0, visibleCount)}***@${mailDomain || ''}`;

      return NextResponse.json(
        {
          success: true,
          message: emailSent 
            ? `Kode verifikasi OTP 6 digit berhasil dikirim ke alamat email terdaftar (${maskedEmail}). Periksa folder Kotak Masuk (Inbox) atau Spam.`
            : `Kode verifikasi OTP telah dibuat untuk akun (${maskedEmail}). Silakan periksa email Anda atau hubungi Administrator jika email tidak masuk.`,
          emailHint: maskedEmail,
          emailDelivered: emailSent,
          accountId: account.id
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ----------------------------------------------------
    // ACTION 2: VERIFY OTP AND RESET PASSWORD
    // ----------------------------------------------------
    if (action === 'verify_and_reset') {
      const identifier = (body.identifier || '').toString().trim();
      const token = (body.token || '').toString().trim();
      const newPassword = (body.newPassword || '').toString();

      if (!identifier || !token || !newPassword) {
        return NextResponse.json(
          { success: false, error: "Identitas akun, kode verifikasi OTP, dan password baru wajib diisi." },
          { status: 400, headers: corsHeaders }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password baru minimal 8 karakter." },
          { status: 400, headers: corsHeaders }
        );
      }

      // Fetch accounts to find matching record
      const { data: accounts, error: accError } = await supabase
        .from('hospital_accounts')
        .select('*');

      if (accError || !accounts || accounts.length === 0) {
        return NextResponse.json(
          { success: false, error: "Gagal mengakses data akun rumah sakit." },
          { status: 500, headers: corsHeaders }
        );
      }

      const account = findMatchingAccount(accounts, identifier);

      if (!account) {
        return NextResponse.json(
          { success: false, error: "Akun rumah sakit tidak ditemukan." },
          { status: 404, headers: corsHeaders }
        );
      }

      // Check OTP in app_settings or ahrq_surveys
      let storedTokenData: any = null;

      // Try 1: app_settings
      try {
        const settingVal = await getAppSetting(supabase, `PWDRESET_${account.id}`);
        if (settingVal) {
          storedTokenData = typeof settingVal === 'string'
            ? JSON.parse(settingVal)
            : settingVal;
        }
      } catch (e) {
        console.warn("Read app_settings fallback:", e);
      }

      // Try 2: ahrq_surveys
      if (!storedTokenData) {
        try {
          const { data: surveyData } = await supabase
            .from('ahrq_surveys')
            .select('dimensi_scores')
            .eq('id', `PWDRESET_${account.id}`)
            .maybeSingle();

          if (surveyData && surveyData.dimensi_scores) {
            storedTokenData = typeof surveyData.dimensi_scores === 'string'
              ? JSON.parse(surveyData.dimensi_scores)
              : surveyData.dimensi_scores;
          }
        } catch (e) {
          console.warn("Read ahrq_surveys fallback:", e);
        }
      }

      if (!storedTokenData || !storedTokenData.token) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Kode OTP tidak ditemukan atau belum pernah diminta. Silakan minta kode verifikasi baru." 
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (storedTokenData.token.toString().trim() !== token) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Kode verifikasi OTP salah atau tidak cocok. Mohon periksa kembali 6 digit kode pada email Anda." 
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (Date.now() > storedTokenData.expiresAt) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Kode verifikasi OTP sudah kadaluarsa (melewati batas 15 menit). Silakan minta kode baru." 
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Hash new password securely
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in hospital_accounts table
      let updateError: any = null;
      const { error: err1 } = await supabase
        .from('hospital_accounts')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (err1) {
        // Fallback retry without updated_at column if missing in schema
        const { error: err2 } = await supabase
          .from('hospital_accounts')
          .update({
            password: hashedPassword
          })
          .eq('id', account.id);
        updateError = err2;
      }

      if (updateError) {
        console.error("Gagal memperbarui password di database:", updateError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Gagal memperbarui password di database: ${updateError.message}` 
          },
          { status: 500, headers: corsHeaders }
        );
      }

      // Cleanup used OTP tokens
      try {
        await deleteAppSetting(supabase, `PWDRESET_${account.id}`);
      } catch (e) {
        console.warn("Clean app_settings token:", e);
      }
      try {
        await supabase.from('ahrq_surveys').delete().eq('id', `PWDRESET_${account.id}`);
      } catch (e) {
        console.warn("Clean ahrq_surveys token:", e);
      }

      // Record audit log
      try {
        await supabase.from('account_audit_logs').insert([{
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          hospital_id: account.id,
          hospital_name: account.nama_rs || account.namaRs || 'Rumah Sakit',
          action: 'password_reset',
          action_label: 'Password Reset',
          performed_by: account.username || 'System Reset',
          timestamp: new Date().toISOString(),
          reason: 'Password direset menggunakan verifikasi kode OTP Email terdaftar'
        }]);
      } catch (e) {
        console.warn("Audit log insert warning:", e);
      }

      // Send confirmation email
      const registeredEmail = extractRegisteredEmail(account);
      if (registeredEmail && registeredEmail.includes('@')) {
        try {
          const host = cleanEnvValue(process.env.SMTP_HOST);
          const smtpPortRaw = cleanEnvValue(process.env.SMTP_PORT);
          const port = parseInt(smtpPortRaw || "587", 10);
          const user = cleanEnvValue(process.env.SMTP_USER);
          const pass = cleanEnvValue(process.env.SMTP_PASS);
          const fromName = cleanEnvValue(process.env.SMTP_FROM_NAME) || "Sistem Survei AHRQ SOPS 2.0";

          if (host && user && pass) {
            const transporter = nodemailer.createTransport({
              host,
              port,
              secure: port === 465,
              auth: { user, pass },
              tls: { rejectUnauthorized: false }
            });

            await transporter.sendMail({
              from: `"${fromName}" <${user}>`,
              to: registeredEmail,
              subject: `[BERHASIL] Kata Sandi Akun ${account.nama_rs || 'Rumah Sakit'} Telah Diperbarui`,
              text: `Halo ${account.nama_rs},\n\nKata sandi untuk akun username "${account.username}" telah berhasil diubah pada ${new Date().toLocaleString('id-ID')}.\n\nJika Anda tidak melakukan perubahan ini, segera hubungi Administrator.`,
              html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h3 style="color: #0d9488; margin-top: 0;">Password Berhasil Diperbarui</h3>
                  <p>Halo <strong>${account.nama_rs}</strong>,</p>
                  <p>Kata sandi untuk akun portal AHRQ SOPS (Username: <code>${account.username}</code>) telah berhasil diperbarui.</p>
                  <p style="color: #64748b; font-size: 12px;">Waktu pembaruan: ${new Date().toLocaleString('id-ID')}</p>
                </div>
              `
            });
          }
        } catch (mailErr) {
          console.warn("Confirmation email error:", mailErr);
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: "Password berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda."
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenali." },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Reset password API exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan internal pada server." },
      { status: 500, headers: corsHeaders }
    );
  }
}
