export type GroupCardSnapshot = {
  id: string;
  name: string;
  memberCount: number;
  role: string;
  eventCount: number;
};

export type EventCardSnapshot = {
  id: string;
  name: string;
  groupName: string;
  status: "draft" | "collecting" | "ready";
  photoCount: number;
};

export type WorkspaceSnapshot = {
  groupSummary: {
    totalGroups: number;
    totalMembers: number;
  };
  groups: GroupCardSnapshot[];
  events: EventCardSnapshot[];
};

export type PhotoCardSnapshot = {
  id: string;
  caption: string;
  uploadedBy: string;
  likeCount: number;
  likedByViewer: boolean;
  assetUrl?: string;
  assetFileName?: string;
  mediaType?: string;
};

export type PhotoWorkflowSnapshot = {
  activeEventId: string;
  activeEventName: string;
  uploadState: {
    pendingCount: number;
    uploadedCount: number;
    helperText: string;
  };
  photos: PhotoCardSnapshot[];
};

export type CandidateCardSnapshot = {
  photoId: string;
  caption: string;
  rank: number;
  likeCount: number;
  whySelected: string;
};

export type PagePreviewSnapshot = {
  pageNumber: number;
  title: string;
  photoCaptions: string[];
};

export type CandidateReviewSnapshot = {
  activeEventId: string;
  activeEventName: string;
  candidates: CandidateCardSnapshot[];
  pagePreview: PagePreviewSnapshot[];
};

export type OrderEntrySnapshot = {
  activeEventId: string;
  activeEventName: string;
  selectedCandidateCount: number;
  handoffSummary: {
    bookFormat: string;
    payloadSections: string[];
    note: string;
  };
};

export type PrototypeWorkspaceSnapshot = {
  workspace: WorkspaceSnapshot;
  photoWorkflows: PhotoWorkflowSnapshot[];
  candidateReviews: CandidateReviewSnapshot[];
  orderEntries: OrderEntrySnapshot[];
};

const prototypeWorkspace: WorkspaceSnapshot = {
  groupSummary: {
    totalGroups: 2,
    totalMembers: 7,
  },
  groups: [
    {
      id: "group-han",
      name: "Han family",
      memberCount: 4,
      role: "Owner",
      eventCount: 2,
    },
    {
      id: "group-park",
      name: "Park cousins",
      memberCount: 3,
      role: "Editor",
      eventCount: 1,
    },
  ],
  events: [
    {
      id: "event-birthday",
      name: "First birthday album",
      groupName: "Han family",
      status: "collecting",
      photoCount: 124,
    },
    {
      id: "event-holiday",
      name: "Winter holiday trip",
      groupName: "Park cousins",
      status: "draft",
      photoCount: 36,
    },
  ],
};

const prototypeInteractionSnapshot = {
  photoWorkflows: [
    {
      activeEventId: "event-birthday",
      activeEventName: "First birthday album",
      uploadState: {
        pendingCount: 3,
        uploadedCount: 124,
        helperText: "Upload queue is local-only until backend adapters land.",
      },
      photos: [
        {
          id: "photo-cake",
          caption: "Cake table setup",
          uploadedBy: "Mina",
          likeCount: 12,
          likedByViewer: true,
          assetUrl: "/api/prototype/photos/photo-cake/asset",
          assetFileName: "cake-table-setup.jpg",
          mediaType: "image/jpeg",
        },
        {
          id: "photo-family",
          caption: "Family portrait",
          uploadedBy: "Joon",
          likeCount: 9,
          likedByViewer: false,
          assetUrl: "/api/prototype/photos/photo-family/asset",
          assetFileName: "family-portrait.jpg",
          mediaType: "image/jpeg",
        },
        {
          id: "photo-gift",
          caption: "Gift opening moment",
          uploadedBy: "Ara",
          likeCount: 7,
          likedByViewer: true,
          assetUrl: "/api/prototype/photos/photo-gift/asset",
          assetFileName: "gift-opening-moment.jpg",
          mediaType: "image/jpeg",
        },
      ],
    },
    {
      activeEventId: "event-holiday",
      activeEventName: "Winter holiday trip",
      uploadState: {
        pendingCount: 1,
        uploadedCount: 36,
        helperText: "Upload queue is local-only until backend adapters land.",
      },
      photos: [
        {
          id: "photo-cabin",
          caption: "Cabin arrival",
          uploadedBy: "Soo",
          likeCount: 4,
          likedByViewer: false,
          assetUrl: "/api/prototype/photos/photo-cabin/asset",
          assetFileName: "cabin-arrival.jpg",
          mediaType: "image/jpeg",
        },
      ],
    },
  ],
  candidateReviews: [
    {
      activeEventId: "event-birthday",
      activeEventName: "First birthday album",
      candidates: [
        {
          photoId: "photo-cake",
          caption: "Cake table setup",
          rank: 1,
          likeCount: 12,
          whySelected:
            "Selected because this photo combines strong likes with a clear milestone moment.",
        },
        {
          photoId: "photo-family",
          caption: "Family portrait",
          rank: 2,
          likeCount: 9,
          whySelected:
            "Selected because this photo balances group coverage with strong likes.",
        },
        {
          photoId: "photo-gift",
          caption: "Gift opening moment",
          rank: 3,
          likeCount: 7,
          whySelected:
            "Selected because this photo adds emotional variety to the album story.",
        },
      ],
      pagePreview: [
        {
          pageNumber: 1,
          title: "Cover preview",
          photoCaptions: ["Cake table setup"],
        },
        {
          pageNumber: 2,
          title: "Family spread",
          photoCaptions: ["Family portrait", "Gift opening moment"],
        },
      ],
    },
  ],
  orderEntries: [
    {
      activeEventId: "event-birthday",
      activeEventName: "First birthday album",
      selectedCandidateCount: 3,
      handoffSummary: {
        bookFormat: "Hardcover square",
        payloadSections: ["selected photos", "page preview", "event title"],
        note: "Review this summary before backend submission is wired.",
      },
    },
  ],
} satisfies Omit<PrototypeWorkspaceSnapshot, "workspace">;

export function buildPrototypeWorkspaceSnapshot(
  workspace: WorkspaceSnapshot,
): PrototypeWorkspaceSnapshot {
  return {
    workspace,
    photoWorkflows: prototypeInteractionSnapshot.photoWorkflows,
    candidateReviews: prototypeInteractionSnapshot.candidateReviews,
    orderEntries: prototypeInteractionSnapshot.orderEntries,
  };
}

export function getPrototypeWorkspaceSnapshot(): PrototypeWorkspaceSnapshot {
  return buildPrototypeWorkspaceSnapshot(prototypeWorkspace);
}

export function getPrototypeWorkspace(): WorkspaceSnapshot {
  return prototypeWorkspace;
}
