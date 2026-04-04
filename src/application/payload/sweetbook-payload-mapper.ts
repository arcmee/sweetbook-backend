export interface SelectedPhotoInput {
  photoId: string;
  likeCount: number;
}

export interface PageCandidateInput {
  pageNumber: number;
  photoIds: string[];
}

export interface SelectionInput {
  selectedPhotos: SelectedPhotoInput[];
  pageCandidates: PageCandidateInput[];
}

export interface MapSelectionToSweetBookPayloadInput {
  albumTitle: string;
  selection: SelectionInput;
}

export interface SweetBookPayload {
  albumTitle: string;
  selectedPhotos: SelectedPhotoInput[];
  pages: Array<{
    pageNumber: number;
    photoIds: string[];
  }>;
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
