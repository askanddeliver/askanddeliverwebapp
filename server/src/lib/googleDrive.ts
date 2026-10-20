import { google, drive_v3 } from 'googleapis';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_SHARED_DRIVE_ID?.trim()
  );
}

export function googleErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as {
      message?: string;
      response?: { data?: { error?: { message?: string } } };
    };
    const apiMessage = e.response?.data?.error?.message;
    if (apiMessage) return apiMessage;
    if (e.message) return e.message;
  }
  return 'Google Drive request failed';
}

function privateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  return raw.replace(/\\n/g, '\n');
}

function driveClient(): drive_v3.Drive {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = privateKey();
  if (!email || !key || !process.env.GOOGLE_SHARED_DRIVE_ID?.trim()) {
    throw new Error('Google Drive is not configured');
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [DRIVE_SCOPE],
  });
  return google.drive({ version: 'v3', auth });
}

function sharedDriveId(): string {
  const id = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();
  if (!id) throw new Error('Google Drive is not configured');
  return id;
}

export async function ensureProjectFolder(opts: {
  existingFolderId?: string | null;
  title: string;
}): Promise<string> {
  const drive = driveClient();
  if (opts.existingFolderId) {
    try {
      const existing = await drive.files.get({
        fileId: opts.existingFolderId,
        supportsAllDrives: true,
        fields: 'id,trashed',
      });
      if (existing.data.id && !existing.data.trashed) {
        return existing.data.id;
      }
    } catch {
      // Folder was deleted in Drive; create a new one.
    }
  }

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: opts.title.trim() || 'Project',
      mimeType: FOLDER_MIME,
      parents: [sharedDriveId()],
    },
    fields: 'id',
  });
  if (!created.data.id) {
    throw new Error('Google Drive did not return a folder id');
  }
  return created.data.id;
}

export async function createGoogleDoc(opts: {
  folderId: string;
  title: string;
}): Promise<{ id: string; webViewLink: string }> {
  const drive = driveClient();
  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: opts.title.trim() || 'Untitled document',
      mimeType: 'application/vnd.google-apps.document',
      parents: [opts.folderId],
    },
    fields: 'id,webViewLink',
  });
  if (!created.data.id) {
    throw new Error('Google Drive did not return a document id');
  }
  return {
    id: created.data.id,
    webViewLink:
      created.data.webViewLink ||
      `https://docs.google.com/document/d/${created.data.id}/edit`,
  };
}

export function googleDocWebViewLink(googleFileId: string): string {
  return `https://docs.google.com/document/d/${googleFileId}/edit`;
}

export async function grantFolderWriter(opts: {
  folderId: string;
  email: string;
}): Promise<string> {
  const drive = driveClient();
  try {
    const created = await drive.permissions.create({
      fileId: opts.folderId,
      supportsAllDrives: true,
      sendNotificationEmail: false,
      fields: 'id',
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: opts.email,
      },
    });
    if (!created.data.id) {
      throw new Error('Google Drive did not return a permission id');
    }
    return created.data.id;
  } catch (err) {
    const message = googleErrorMessage(err);
    if (!/already exists/i.test(message)) throw err;
    const listed = await drive.permissions.list({
      fileId: opts.folderId,
      supportsAllDrives: true,
      fields: 'permissions(id,emailAddress,role)',
    });
    const match = (listed.data.permissions || []).find(
      (p) => p.emailAddress?.toLowerCase() === opts.email.toLowerCase() && p.id
    );
    if (!match?.id) throw err;
    if (match.role !== 'writer') {
      await drive.permissions.update({
        fileId: opts.folderId,
        permissionId: match.id,
        supportsAllDrives: true,
        requestBody: { role: 'writer' },
      });
    }
    return match.id;
  }
}

export async function revokeFolderPermission(opts: {
  folderId: string;
  permissionId: string;
}): Promise<void> {
  const drive = driveClient();
  try {
    await drive.permissions.delete({
      fileId: opts.folderId,
      permissionId: opts.permissionId,
      supportsAllDrives: true,
    });
  } catch (err) {
    const status = (err as { code?: number; response?: { status?: number } }).response
      ?.status;
    const code = (err as { code?: number }).code;
    if (status === 404 || code === 404) return;
    throw err;
  }
}
