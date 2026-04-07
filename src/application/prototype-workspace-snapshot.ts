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
  ownerApproved?: boolean;
  operationSummary: {
    stage: "setup" | "voting" | "owner_review";
    label: string;
    detail: string;
  };
  description?: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  votingClosedManually?: boolean;
  canVote?: boolean;
  canOwnerSelectPhotos?: boolean;
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
  pagePlanner: {
    selectedPhotoIds: string[];
    coverPhotoId?: string;
    pageLayouts: Record<string, string>;
    pageNotes: Record<string, string>;
  };
  operationSummary: {
    stage: "blocked" | "ready_for_handoff";
    label: string;
    detail: string;
  };
  readinessSummary: {
    minimumSelectedPhotoCount: number;
    selectedPhotoCount: number;
    meetsMinimumPhotoCount: boolean;
    nextSuggestedStep: string;
  };
  reviewSummary: {
    draftPageCount: number;
    flaggedDraftPageCount: number;
    ownerApprovalRequired: boolean;
  };
  handoffSummary: {
    bookFormat: string;
    payloadSections: string[];
    note: string;
    coverCaption?: string;
    selectedPhotoCount: number;
    spreadCount: number;
    draftPayloadPageCount: number;
    plannerPages: Array<{
      pageId: string;
      title: string;
      layout: string;
      note: string;
      photoCount: number;
      photoCaptions: string[];
      warning: string | null;
    }>;
  };
};

export type GroupMemberSnapshot = {
  groupId: string;
  userId: string;
  displayName: string;
  role: string;
};

export type PendingInvitationSnapshot = {
  invitationId: string;
  groupId: string;
  groupName: string;
  invitedUserId?: string;
  invitedUserDisplayName?: string;
  invitedByDisplayName: string;
};

export type PrototypeWorkspaceSnapshot = {
  workspace: WorkspaceSnapshot;
  groupMembers?: GroupMemberSnapshot[];
  pendingInvitations?: PendingInvitationSnapshot[];
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
      ownerApproved: false,
      operationSummary: {
        stage: "voting",
        label: "Voting in progress",
        detail: "Collecting likes before the owner review opens.",
      },
      description: "Collect the best first birthday moments before the family vote closes.",
      votingStartsAt: "2026-04-01T09:00:00.000Z",
      votingEndsAt: "2026-04-14T09:00:00.000Z",
      votingClosedManually: false,
      canVote: true,
      canOwnerSelectPhotos: false,
      photoCount: 124,
    },
    {
      id: "event-holiday",
      name: "Winter holiday trip",
      groupName: "Park cousins",
      status: "draft",
      ownerApproved: false,
      operationSummary: {
        stage: "setup",
        label: "Setup in progress",
        detail: "Waiting for the voting window to open and more event setup to finish.",
      },
      description: "Prepare the holiday trip highlights before the cousins voting window opens.",
      votingStartsAt: "2026-04-20T09:00:00.000Z",
      votingEndsAt: "2026-04-30T09:00:00.000Z",
      votingClosedManually: false,
      canVote: false,
      canOwnerSelectPhotos: false,
      photoCount: 36,
    },
  ],
};

const prototypeInteractionSnapshot = {
  groupMembers: [
    {
      groupId: "group-han",
      userId: "user-demo",
      displayName: "SweetBook Demo User",
      role: "Owner",
    },
    {
      groupId: "group-han",
      userId: "user-mina",
      displayName: "Mina",
      role: "Editor",
    },
    {
      groupId: "group-han",
      userId: "user-joon",
      displayName: "Joon",
      role: "Contributor",
    },
    {
      groupId: "group-han",
      userId: "user-ara",
      displayName: "Ara",
      role: "Contributor",
    },
    {
      groupId: "group-park",
      userId: "user-soo",
      displayName: "Soo",
      role: "Owner",
    },
    {
      groupId: "group-park",
      userId: "user-demo",
      displayName: "SweetBook Demo User",
      role: "Editor",
    },
    {
      groupId: "group-park",
      userId: "user-yuri",
      displayName: "Yuri",
      role: "Contributor",
    },
  ],
  pendingInvitations: [
    {
      invitationId: "invite-kim",
      groupId: "group-kim",
      groupName: "Kim family moments",
      invitedUserId: "user-demo",
      invitedUserDisplayName: "SweetBook Demo User",
      invitedByDisplayName: "Sena",
    },
  ],
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
      pagePlanner: {
        selectedPhotoIds: ["photo-cake", "photo-family", "photo-gift"],
        coverPhotoId: "photo-cake",
        pageLayouts: {
          cover: "Full-bleed cover",
          "spread-1": "Balanced two-photo spread",
        },
        pageNotes: {
          cover: "Lead with the strongest event-defining moment on the cover.",
          "spread-1": "Use this spread to balance detail shots with group moments.",
        },
      },
      operationSummary: {
        stage: "ready_for_handoff",
        label: "Ready for handoff prep",
        detail: "Owner review can continue with a draft handoff summary.",
      },
      readinessSummary: {
        minimumSelectedPhotoCount: 3,
        selectedPhotoCount: 3,
        meetsMinimumPhotoCount: true,
        nextSuggestedStep: "Review page-level draft checks and record owner approval.",
      },
      reviewSummary: {
        draftPageCount: 2,
        flaggedDraftPageCount: 0,
        ownerApprovalRequired: true,
      },
      handoffSummary: {
        bookFormat: "Hardcover square",
        payloadSections: ["selected photos", "page preview", "event title"],
        note: "Review this summary before backend submission is wired.",
        coverCaption: "Cake table setup",
        selectedPhotoCount: 3,
        spreadCount: 1,
        draftPayloadPageCount: 2,
        plannerPages: [
          {
            pageId: "cover",
            title: "Cover handoff",
            layout: "Full-bleed cover",
            note: "Lead with the strongest event-defining moment on the cover.",
            photoCount: 1,
            photoCaptions: ["Cake table setup"],
            warning: null,
          },
          {
            pageId: "spread-1",
            title: "Spread 1",
            layout: "Balanced two-photo spread",
            note: "Use this spread to balance detail shots with group moments.",
            photoCount: 2,
            photoCaptions: ["Family portrait", "Gift opening moment"],
            warning: null,
          },
        ],
      },
    },
  ],
} satisfies Omit<PrototypeWorkspaceSnapshot, "workspace">;

export function buildPrototypeWorkspaceSnapshot(
  workspace: WorkspaceSnapshot,
): PrototypeWorkspaceSnapshot {
  return {
    workspace,
    groupMembers: prototypeInteractionSnapshot.groupMembers,
    pendingInvitations: prototypeInteractionSnapshot.pendingInvitations,
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

export function buildEventOperationSummary(
  event: Pick<EventCardSnapshot, "status" | "canVote" | "canOwnerSelectPhotos">,
): EventCardSnapshot["operationSummary"] {
  if (event.canOwnerSelectPhotos || event.status === "ready") {
    return {
      stage: "owner_review",
      label: "Owner review ready",
      detail: "Voting is closed and the SweetBook operation can move into owner review.",
    };
  }

  if (event.canVote || event.status === "collecting") {
    return {
      stage: "voting",
      label: "Voting in progress",
      detail: "Collecting likes before the owner review opens.",
    };
  }

  return {
    stage: "setup",
    label: "Setup in progress",
    detail: "Waiting for the voting window to open and more event setup to finish.",
  };
}

export function buildOrderOperationSummary(
  input: {
    selectedPhotoCount: number;
  },
): OrderEntrySnapshot["operationSummary"] {
  if (input.selectedPhotoCount > 0) {
    return {
      stage: "ready_for_handoff",
      label: "Ready for handoff prep",
      detail: "Owner review can continue with a draft handoff summary.",
    };
  }

  return {
    stage: "blocked",
    label: "Blocked before handoff",
    detail: "Add more liked photos before the SweetBook operation can continue.",
  };
}

export function buildOrderReadinessSummary(
  input: {
    selectedPhotoCount: number;
    ownerApproved?: boolean;
  },
): OrderEntrySnapshot["readinessSummary"] {
  const minimumSelectedPhotoCount = 3;
  const selectedPhotoCount = input.selectedPhotoCount;
  const meetsMinimumPhotoCount = selectedPhotoCount >= minimumSelectedPhotoCount;

  return {
    minimumSelectedPhotoCount,
    selectedPhotoCount,
    meetsMinimumPhotoCount,
    nextSuggestedStep: !meetsMinimumPhotoCount
      ? `Add at least ${minimumSelectedPhotoCount} liked photos before moving into SweetBook handoff.`
      : input.ownerApproved
        ? "Review page-level draft checks and finalize the SweetBook handoff."
        : "Review page-level draft checks and record owner approval.",
  };
}

export function buildOrderReviewSummary(
  input: {
    draftPageCount: number;
    flaggedDraftPageCount: number;
    ownerApproved?: boolean;
  },
): OrderEntrySnapshot["reviewSummary"] {
  return {
    draftPageCount: input.draftPageCount,
    flaggedDraftPageCount: input.flaggedDraftPageCount,
    ownerApprovalRequired: !input.ownerApproved,
  };
}
