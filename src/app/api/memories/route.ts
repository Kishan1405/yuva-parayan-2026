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

export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!apiKey || !folderId) {
    return NextResponse.json(
      {
        images: [],
        error:
          "Google Drive is not configured yet. Add GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_ID to .env.local.",
      },
      { status: 200 }
    );
  }

  try {
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
        return NextResponse.json(
          { images: [], error: `Google Drive API error: ${res.status} ${body}` },
          { status: 200 }
        );
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

    return NextResponse.json({ images, error: null });
  } catch (err) {
    return NextResponse.json(
      { images: [], error: err instanceof Error ? err.message : "Failed to load memories." },
      { status: 200 }
    );
  }
}
