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

function folderLabel(name: string, fallback: string): string {
  const trimmed = name.trim().slice(0, 200);
  return trimmed || fallback;
}

async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id',
  });
  if (!created.data.id) {
    throw new Error('Google Drive did not return a folder id');
  }
  return created.data.id;
}

async function liveFolder(
  drive: drive_v3.Drive,
  folderId: string
): Promise<{ id: string; parents: string[] } | null> {
  try {
    const existing = await drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: 'id,trashed,parents',
    });
    if (existing.data.id && !existing.data.trashed) {
      return { id: existing.data.id, parents: existing.data.parents || [] };
    }
  } catch {
    // Folder was deleted in Drive.
  }
  return null;
}

export async function ensureProjectFolder(opts: {
  existingFolderId?: string | null;
  existingClientFolderId?: string | null;
  projectTitle: string;
  clientName: string;
}): Promise<{ projectFolderId: string; clientFolderId: string }> {
  const drive = driveClient();
  const driveId = sharedDriveId();
  const clientLabel = folderLabel(opts.clientName, 'Client');
  const projectLabel = folderLabel(opts.projectTitle, 'Project');

  let clientFolderId: string | null = null;
  if (opts.existingClientFolderId) {
    const clientFolder = await liveFolder(drive, opts.existingClientFolderId);
    clientFolderId = clientFolder?.id || null;
  }
  if (!clientFolderId) {
    clientFolderId = await createFolder(drive, clientLabel, driveId);
  }

  let projectFolder: { id: string; parents: string[] } | null = null;
  if (opts.existingFolderId) {
    projectFolder = await liveFolder(drive, opts.existingFolderId);
  }

  let projectFolderId: string;
  if (!projectFolder) {
    projectFolderId = await createFolder(drive, projectLabel, clientFolderId);
  } else if (projectFolder.parents.includes(clientFolderId)) {
    projectFolderId = projectFolder.id;
  } else {
    await drive.files.update({
      fileId: projectFolder.id,
      supportsAllDrives: true,
      addParents: clientFolderId,
      removeParents: projectFolder.parents.join(',') || undefined,
      fields: 'id',
    });
    projectFolderId = projectFolder.id;
  }

  return { projectFolderId, clientFolderId };
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
