import { NextResponse } from "next/server";

export const revalidate = 300; // cache the Drive listing for 5 minutes

interface DriveFile {
  id: string;
  name: string;
}

export interface MemoryImage {
  id: string;
  name: string;
  thumbUrl: string;
  fullUrl: string;
}

// Fetches every image in one Drive folder (paginated, capped at 500 to
// bound worst-case response size).
async function listFolderImages(apiKey: string, folderId: string): Promise<MemoryImage[]> {
  const images: MemoryImage[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set(
      "q",
      `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`
    );
    url.searchParams.set("fields", "nextPageToken, files(id, name)");
    url.searchParams.set("pageSize", "200");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { next: { revalidate } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Drive API error for folder ${folderId}: ${res.status} ${body}`);
    }

    const data: { files: DriveFile[]; nextPageToken?: string } = await res.json();
    for (const file of data.files ?? []) {
      images.push({
        id: file.id,
        name: file.name,
        thumbUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w500`,
        fullUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken && images.length < 500);

  return images;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  // Comma-separated — supports pulling from multiple albums/years at once.
  const folderIds = (process.env.GOOGLE_DRIVE_FOLDER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!apiKey || folderIds.length === 0) {
    return NextResponse.json(
      {
        images: [],
        error:
          "Google Drive is not configured yet. Add GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_IDS to .env.local.",
      },
      { status: 200 }
    );
  }

  try {
    const perFolder = await Promise.all(folderIds.map((id) => listFolderImages(apiKey, id)));
    const images = perFolder.flat();
    return NextResponse.json({ images, error: null });
  } catch (err) {
    return NextResponse.json(
      { images: [], error: err instanceof Error ? err.message : "Failed to load memories." },
      { status: 200 }
    );
  }
}
