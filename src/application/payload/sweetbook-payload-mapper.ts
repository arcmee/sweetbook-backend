export interface SelectedPhotoInput {
  photoId: string;
  likeCount: number;
}

export interface PlannerSelectedPhotoInput {
  photoId: string;
  caption: string;
  assetFileName?: string;
}

export interface PageCandidateInput {
  pageNumber: number;
  photoIds: string[];
}

export interface PlannerPageInput {
  pageId: string;
  layout: string;
  note: string;
  photoIds: string[];
}

export interface SelectionInput {
  selectedPhotos: SelectedPhotoInput[];
  pageCandidates: PageCandidateInput[];
}

export interface PlannerSelectionInput {
  selectedPhotos: PlannerSelectedPhotoInput[];
  coverPhotoId?: string;
  pageLayouts: Record<string, string>;
  pageNotes: Record<string, string>;
}

export interface MapSelectionToSweetBookPayloadInput {
  albumTitle: string;
  selection: SelectionInput;
}

export interface MapPlannerSelectionToSweetBookPayloadInput {
  albumTitle: string;
  selection: PlannerSelectionInput;
}

export interface SweetBookPayload {
  albumTitle: string;
  selectedPhotos: SelectedPhotoInput[];
  pages: Array<{
    pageNumber: number;
    photoIds: string[];
  }>;
}

export interface PlannerSweetBookPayload {
  albumTitle: string;
  coverPhotoId?: string;
  selectedPhotos: PlannerSelectedPhotoInput[];
  pages: PlannerPageInput[];
}

export function mapSelectionToSweetBookPayload(
  input: MapSelectionToSweetBookPayloadInput
): SweetBookPayload {
  return {
    albumTitle: input.albumTitle,
    selectedPhotos: input.selection.selectedPhotos.map((photo) => ({
      photoId: photo.photoId,
      likeCount: photo.likeCount
    })),
    pages: input.selection.pageCandidates.map((candidate) => ({
      pageNumber: candidate.pageNumber,
      photoIds: [...candidate.photoIds]
    }))
  };
}

export function mapPlannerSelectionToSweetBookPayload(
  input: MapPlannerSelectionToSweetBookPayloadInput
): PlannerSweetBookPayload {
  const selectedPhotos = input.selection.selectedPhotos.map((photo) => ({
    photoId: photo.photoId,
    caption: photo.caption,
    assetFileName: photo.assetFileName
  }));
  const selectedPhotoIds = selectedPhotos.map((photo) => photo.photoId);
  const coverPhotoId =
    input.selection.coverPhotoId &&
    selectedPhotoIds.includes(input.selection.coverPhotoId)
      ? input.selection.coverPhotoId
      : selectedPhotoIds[0];

  const spreadPhotoIds = selectedPhotoIds.filter((photoId) => photoId !== coverPhotoId);
  const pages: PlannerPageInput[] = [];

  if (coverPhotoId) {
    pages.push({
      pageId: "cover",
      layout: input.selection.pageLayouts.cover ?? "Full-bleed cover",
      note:
        input.selection.pageNotes.cover ??
        "Lead with the strongest event-defining moment on the cover.",
      photoIds: [coverPhotoId]
    });
  }

  for (let index = 0; index < spreadPhotoIds.length; index += 2) {
    const pageId = `spread-${index / 2 + 1}`;
    const pagePhotoIds = spreadPhotoIds.slice(index, index + 2);
    const defaultLayout =
      pagePhotoIds.length > 1 ? "Balanced two-photo spread" : "Single-photo spotlight";
    const defaultNote =
      pagePhotoIds.length > 1
        ? "Use this spread to balance detail shots with group moments."
        : "Single-photo spread can spotlight a key memory beat.";

    pages.push({
      pageId,
      layout: input.selection.pageLayouts[pageId] ?? defaultLayout,
      note: input.selection.pageNotes[pageId] ?? defaultNote,
      photoIds: pagePhotoIds
    });
  }

  return {
    albumTitle: input.albumTitle,
    coverPhotoId,
    selectedPhotos,
    pages
  };
}
