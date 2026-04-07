import type { Pool } from "pg";

import {
  buildEventOperationSummary,
  buildOrderOperationSummary,
  buildOrderReadinessSummary,
  buildOrderReviewSummary,
  buildPrototypeWorkspaceSnapshot,
  getPrototypeWorkspaceSnapshot,
  type CandidateCardSnapshot,
  type CandidateReviewSnapshot,
  type EventCardSnapshot,
  type GroupMemberSnapshot,
  type GroupCardSnapshot,
  type OrderEntrySnapshot,
  type PagePreviewSnapshot,
  type PhotoCardSnapshot,
  type PhotoWorkflowSnapshot,
  type PrototypeWorkspaceSnapshot,
} from "../application/prototype-workspace-snapshot";
import {
  loadPrototypePhotoAsset,
  savePrototypePhotoAsset,
} from "./prototype-photo-local-file-store";

type GroupRow = {
  id: string;
  name: string;
  member_count: string;
  viewer_role: string;
  event_count: string;
};

type EventRow = {
  id: string;
  name: string;
  group_name: string;
  description: string;
  voting_starts_at: string;
  voting_ends_at: string;
  voting_closed_manually: boolean;
  owner_approved: boolean;
  photo_count: string;
};

type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: string;
};

type PendingInvitationRow = {
  invitation_id: string;
  group_id: string;
  group_name: string;
  invited_user_id: string;
  invited_by_user_id: string;
};

type PhotoWorkflowRow = {
  active_event_id: string;
  active_event_name: string;
  pending_count: string;
  uploaded_count: string;
  helper_text: string;
  photo_id: string;
  caption: string;
  uploaded_by: string;
  like_count: string;
  liked_by_viewer: boolean;
  original_file_name: string | null;
  media_type: string | null;
  storage_path: string | null;
};

type OrderEntryRow = {
  event_id: string;
  selected_candidate_count: string;
  book_format: string;
  note: string;
  selected_photo_ids_json: string | null;
  cover_photo_id: string | null;
  page_layouts_json: string | null;
  page_notes_json: string | null;
};

const PROTOTYPE_VIEWER_ID = "user-demo";
const PROTOTYPE_USER_DIRECTORY = [
  { userId: "user-demo", username: "demo", displayName: "SweetBook Demo User" },
  { userId: "user-mina", username: "mina", displayName: "Mina" },
  { userId: "user-joon", username: "joon", displayName: "Joon" },
  { userId: "user-ara", username: "ara", displayName: "Ara" },
  { userId: "user-soo", username: "soo", displayName: "Soo" },
  { userId: "user-yuri", username: "yuri", displayName: "Yuri" },
  { userId: "user-haru", username: "haru", displayName: "Haru" },
  { userId: "user-sena", username: "sena", displayName: "Sena" },
] as const;

export async function initializePrototypeWorkspaceStore(
  pool: Pick<Pool, "query">,
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_group_memberships (
      group_id TEXT NOT NULL REFERENCES prototype_groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_group_invitations (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES prototype_groups(id) ON DELETE CASCADE,
      invited_user_id TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (group_id, invited_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_events (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES prototype_groups(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      voting_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      voting_ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
      voting_closed_manually BOOLEAN NOT NULL DEFAULT FALSE,
      owner_approved BOOLEAN NOT NULL DEFAULT FALSE,
      photo_count INTEGER NOT NULL DEFAULT 0,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "ALTER TABLE prototype_events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''",
  );
  await pool.query(
    "ALTER TABLE prototype_events ADD COLUMN IF NOT EXISTS voting_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  );
  await pool.query(
    "ALTER TABLE prototype_events ADD COLUMN IF NOT EXISTS voting_ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'",
  );
  await pool.query(
    "ALTER TABLE prototype_events ADD COLUMN IF NOT EXISTS voting_closed_manually BOOLEAN NOT NULL DEFAULT FALSE",
  );
  await pool.query(
    "ALTER TABLE prototype_events ADD COLUMN IF NOT EXISTS owner_approved BOOLEAN NOT NULL DEFAULT FALSE",
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_photo_workflows (
      event_id TEXT PRIMARY KEY REFERENCES prototype_events(id) ON DELETE CASCADE,
      pending_count INTEGER NOT NULL DEFAULT 0,
      uploaded_count INTEGER NOT NULL DEFAULT 0,
      helper_text TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_photos (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES prototype_events(id) ON DELETE CASCADE,
      caption TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      like_count INTEGER NOT NULL DEFAULT 0,
      liked_by_viewer BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await pool.query(
    "ALTER TABLE prototype_photos ADD COLUMN IF NOT EXISTS original_file_name TEXT",
  );
  await pool.query(
    "ALTER TABLE prototype_photos ADD COLUMN IF NOT EXISTS media_type TEXT",
  );
  await pool.query(
    "ALTER TABLE prototype_photos ADD COLUMN IF NOT EXISTS storage_path TEXT",
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_photo_likes (
      photo_id TEXT NOT NULL REFERENCES prototype_photos(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      PRIMARY KEY (photo_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_candidate_reviews (
      event_id TEXT NOT NULL REFERENCES prototype_events(id) ON DELETE CASCADE,
      photo_id TEXT NOT NULL,
      caption TEXT NOT NULL,
      rank INTEGER NOT NULL,
      like_count INTEGER NOT NULL DEFAULT 0,
      why_selected TEXT NOT NULL,
      PRIMARY KEY (event_id, rank)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_page_previews (
      event_id TEXT NOT NULL REFERENCES prototype_events(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      photo_caption TEXT NOT NULL,
      caption_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (event_id, page_number, caption_order)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_order_entries (
      event_id TEXT PRIMARY KEY REFERENCES prototype_events(id) ON DELETE CASCADE,
      selected_candidate_count INTEGER NOT NULL DEFAULT 0,
      book_format TEXT NOT NULL,
      note TEXT NOT NULL,
      selected_photo_ids_json TEXT NOT NULL DEFAULT '[]',
      cover_photo_id TEXT,
      page_layouts_json TEXT NOT NULL DEFAULT '{}',
      page_notes_json TEXT NOT NULL DEFAULT '{}'
    )
  `);
  await pool.query(
    "ALTER TABLE prototype_order_entries ADD COLUMN IF NOT EXISTS selected_photo_ids_json TEXT NOT NULL DEFAULT '[]'",
  );
  await pool.query(
    "ALTER TABLE prototype_order_entries ADD COLUMN IF NOT EXISTS cover_photo_id TEXT",
  );
  await pool.query(
    "ALTER TABLE prototype_order_entries ADD COLUMN IF NOT EXISTS page_layouts_json TEXT NOT NULL DEFAULT '{}'",
  );
  await pool.query(
    "ALTER TABLE prototype_order_entries ADD COLUMN IF NOT EXISTS page_notes_json TEXT NOT NULL DEFAULT '{}'",
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_order_entry_sections (
      event_id TEXT NOT NULL REFERENCES prototype_order_entries(event_id) ON DELETE CASCADE,
      section_name TEXT NOT NULL,
      section_order INTEGER NOT NULL,
      PRIMARY KEY (event_id, section_order)
    )
  `);
}

export async function seedPrototypeWorkspaceStore(
  pool: Pick<Pool, "query">,
): Promise<void> {
  const seed = getPrototypeWorkspaceSnapshot();

  await pool.query(
    `
      INSERT INTO prototype_groups (id, name, owner_id)
      VALUES
        ($1, $2, $3),
        ($4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      "group-han",
      seed.workspace.groups[0]?.name ?? "Han family",
      PROTOTYPE_VIEWER_ID,
      "group-park",
      seed.workspace.groups[1]?.name ?? "Park cousins",
      "user-soo",
    ],
  );

  await pool.query(
    `
      INSERT INTO prototype_group_memberships (group_id, user_id, role)
      VALUES
        ('group-han', 'user-demo', 'Owner'),
        ('group-han', 'user-mina', 'Editor'),
        ('group-han', 'user-joon', 'Contributor'),
        ('group-han', 'user-ara', 'Contributor'),
        ('group-park', 'user-demo', 'Editor'),
        ('group-park', 'user-soo', 'Owner'),
        ('group-park', 'user-yuri', 'Contributor')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `,
  );

  await pool.query(
    `
      INSERT INTO prototype_events (
        id,
        group_id,
        title,
        status,
        description,
        voting_starts_at,
        voting_ends_at,
        voting_closed_manually,
        owner_approved,
        photo_count
      )
      VALUES
        (
          'event-birthday',
          'group-han',
          'First birthday album',
          'collecting',
          'Collect the best first birthday moments before the family vote closes.',
          '2026-04-01T09:00:00.000Z',
          '2026-04-14T09:00:00.000Z',
          FALSE,
          FALSE,
          124
        ),
        (
          'event-holiday',
          'group-park',
          'Winter holiday trip',
          'draft',
          'Prepare the holiday trip highlights before the cousins voting window opens.',
          '2026-04-20T09:00:00.000Z',
          '2026-04-30T09:00:00.000Z',
          FALSE,
          FALSE,
          36
        )
      ON CONFLICT (id) DO NOTHING
    `,
  );

  await pool.query(
    `
      INSERT INTO prototype_groups (id, name, owner_id)
      VALUES ('group-kim', 'Kim family moments', 'user-sena')
      ON CONFLICT (id) DO NOTHING
    `,
  );

  await pool.query(
    `
      INSERT INTO prototype_group_memberships (group_id, user_id, role)
      VALUES ('group-kim', 'user-sena', 'Owner')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `,
  );

  await pool.query(
    `
      INSERT INTO prototype_group_invitations (id, group_id, invited_user_id, invited_by_user_id)
      VALUES ('invite-kim', 'group-kim', 'user-demo', 'user-sena')
      ON CONFLICT (id) DO NOTHING
    `,
  );

  for (const workflow of seed.photoWorkflows) {
    await pool.query(
      `
        INSERT INTO prototype_photo_workflows (
          event_id,
          pending_count,
          uploaded_count,
          helper_text
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        workflow.activeEventId,
        workflow.uploadState.pendingCount,
        workflow.uploadState.uploadedCount,
        workflow.uploadState.helperText,
      ],
    );

    for (const photo of workflow.photos) {
      await pool.query(
        `
          INSERT INTO prototype_photos (
            id,
            event_id,
            caption,
            uploaded_by,
            like_count,
            liked_by_viewer,
            original_file_name,
            media_type,
            storage_path
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          photo.id,
          workflow.activeEventId,
          photo.caption,
          photo.uploadedBy,
          photo.likeCount,
          photo.likedByViewer,
          null,
          null,
          null,
        ],
      );

      if (photo.likedByViewer) {
        await pool.query(
          `
            INSERT INTO prototype_photo_likes (photo_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (photo_id, user_id) DO NOTHING
          `,
          [photo.id, PROTOTYPE_VIEWER_ID],
        );
      }
    }
  }

  for (const review of seed.candidateReviews) {
    for (const candidate of review.candidates) {
      await pool.query(
        `
          INSERT INTO prototype_candidate_reviews (
            event_id,
            photo_id,
            caption,
            rank,
            like_count,
            why_selected
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (event_id, rank) DO NOTHING
        `,
        [
          review.activeEventId,
          candidate.photoId,
          candidate.caption,
          candidate.rank,
          candidate.likeCount,
          candidate.whySelected,
        ],
      );
    }

    for (const page of review.pagePreview) {
      for (const [index, photoCaption] of page.photoCaptions.entries()) {
        await pool.query(
          `
            INSERT INTO prototype_page_previews (
              event_id,
              page_number,
              title,
              photo_caption,
              caption_order
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (event_id, page_number, caption_order) DO NOTHING
          `,
          [review.activeEventId, page.pageNumber, page.title, photoCaption, index],
        );
      }
    }
  }

  for (const orderEntry of seed.orderEntries) {
    await pool.query(
      `
        INSERT INTO prototype_order_entries (
          event_id,
          selected_candidate_count,
          book_format,
          note,
          selected_photo_ids_json,
          cover_photo_id,
          page_layouts_json,
          page_notes_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        orderEntry.activeEventId,
        orderEntry.selectedCandidateCount,
        orderEntry.handoffSummary.bookFormat,
        orderEntry.handoffSummary.note,
        JSON.stringify(orderEntry.pagePlanner.selectedPhotoIds),
        orderEntry.pagePlanner.coverPhotoId ?? null,
        JSON.stringify(orderEntry.pagePlanner.pageLayouts),
        JSON.stringify(orderEntry.pagePlanner.pageNotes),
      ],
    );

    for (const [index, sectionName] of orderEntry.handoffSummary.payloadSections.entries()) {
      await pool.query(
        `
          INSERT INTO prototype_order_entry_sections (
            event_id,
            section_name,
            section_order
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (event_id, section_order) DO NOTHING
        `,
        [orderEntry.activeEventId, sectionName, index],
      );
    }
  }
}

export function createPrototypeWorkspaceSnapshotLoader(
  pool: Pick<Pool, "query">,
): () => Promise<PrototypeWorkspaceSnapshot> {
  return async () => {
    const groupsResult = await pool.query<GroupRow>(
      `
        SELECT
          g.id,
          g.name,
          COUNT(DISTINCT m.user_id)::text AS member_count,
          COALESCE(MAX(CASE WHEN m.user_id = $1 THEN m.role END), 'Viewer') AS viewer_role,
          COUNT(DISTINCT e.id)::text AS event_count
        FROM prototype_groups g
        LEFT JOIN prototype_group_memberships m
          ON m.group_id = g.id
        LEFT JOIN prototype_events e
          ON e.group_id = g.id
        GROUP BY g.id, g.name
        ORDER BY g.name ASC
      `,
      [PROTOTYPE_VIEWER_ID],
    );

    const eventsResult = await pool.query<EventRow>(
      `
        SELECT
          e.id,
          e.title AS name,
          g.name AS group_name,
          e.description,
          e.voting_starts_at::text,
          e.voting_ends_at::text,
          e.voting_closed_manually,
          e.owner_approved,
          e.photo_count::text
        FROM prototype_events e
        INNER JOIN prototype_groups g
          ON g.id = e.group_id
        ORDER BY e.occurred_at ASC, e.title ASC
      `,
    );

    const membershipCountResult = await pool.query<{ total_memberships: string }>(
      `
        SELECT COUNT(*)::text AS total_memberships
        FROM prototype_group_memberships
      `,
    );
    const groupMembersResult = await pool.query<GroupMemberRow>(
      `
        SELECT group_id, user_id, role
        FROM prototype_group_memberships
        ORDER BY group_id ASC, user_id ASC
      `,
    );
    const pendingInvitationsResult = await pool.query<PendingInvitationRow>(
      `
        SELECT
          i.id AS invitation_id,
          i.group_id,
          g.name AS group_name,
          i.invited_user_id,
          i.invited_by_user_id
        FROM prototype_group_invitations i
        INNER JOIN prototype_groups g
          ON g.id = i.group_id
        WHERE i.invited_user_id = $1
        ORDER BY i.created_at ASC, i.id ASC
      `,
      [PROTOTYPE_VIEWER_ID],
    );

    const photoWorkflowRows = await pool.query<PhotoWorkflowRow>(
      `
        SELECT
          w.event_id AS active_event_id,
          e.title AS active_event_name,
          w.pending_count::text,
          w.uploaded_count::text,
          w.helper_text,
          p.id AS photo_id,
          p.caption,
          p.uploaded_by,
          p.like_count::text,
          p.liked_by_viewer,
          p.original_file_name,
          p.media_type,
          p.storage_path
        FROM prototype_photo_workflows w
        INNER JOIN prototype_events e
          ON e.id = w.event_id
        LEFT JOIN prototype_photos p
          ON p.event_id = w.event_id
        ORDER BY e.occurred_at ASC, p.id ASC
      `,
    );
    const orderEntryRows = await pool.query<OrderEntryRow>(
      `
        SELECT
          event_id,
          selected_candidate_count::text,
          book_format,
          note,
          selected_photo_ids_json,
          cover_photo_id,
          page_layouts_json,
          page_notes_json
        FROM prototype_order_entries
        ORDER BY event_id ASC
      `,
    );

    const groups: GroupCardSnapshot[] = groupsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      memberCount: Number.parseInt(row.member_count, 10),
      role: row.viewer_role,
      eventCount: Number.parseInt(row.event_count, 10),
    }));

    const events: EventCardSnapshot[] = eventsResult.rows.map((row) => ({
      ...buildVotingFields({
        votingStartsAt: row.voting_starts_at,
        votingEndsAt: row.voting_ends_at,
        votingClosedManually: row.voting_closed_manually,
      }),
      id: row.id,
      name: row.name,
      groupName: row.group_name,
      ownerApproved: row.owner_approved,
      description: row.description,
      photoCount: Number.parseInt(row.photo_count, 10),
    }));

    const photoWorkflowMap = new Map<string, PhotoWorkflowSnapshot>();
    const orderEntryRowMap = new Map<string, OrderEntryRow>(
      orderEntryRows.rows.map((row) => [row.event_id, row]),
    );
    for (const row of photoWorkflowRows.rows) {
      const existing = photoWorkflowMap.get(row.active_event_id);
      if (!existing) {
        photoWorkflowMap.set(row.active_event_id, {
          activeEventId: row.active_event_id,
          activeEventName: row.active_event_name,
          uploadState: {
            pendingCount: Number.parseInt(row.pending_count, 10),
            uploadedCount: Number.parseInt(row.uploaded_count, 10),
            helperText: row.helper_text,
          },
          photos: row.photo_id
            ? [
                {
                  id: row.photo_id,
                  caption: row.caption,
                  uploadedBy: row.uploaded_by,
                  likeCount: Number.parseInt(row.like_count, 10),
                  likedByViewer: row.liked_by_viewer,
                  assetUrl: row.storage_path
                    ? `/api/prototype/photos/${row.photo_id}/asset`
                    : undefined,
                  assetFileName: row.original_file_name ?? undefined,
                  mediaType: row.media_type ?? undefined,
                },
              ]
            : [],
        });
        continue;
      }

      if (row.photo_id) {
        existing.photos.push({
          id: row.photo_id,
          caption: row.caption,
          uploadedBy: row.uploaded_by,
          likeCount: Number.parseInt(row.like_count, 10),
          likedByViewer: row.liked_by_viewer,
          assetUrl: row.storage_path
            ? `/api/prototype/photos/${row.photo_id}/asset`
            : undefined,
          assetFileName: row.original_file_name ?? undefined,
          mediaType: row.media_type ?? undefined,
        });
      }
    }

    const candidateReviews = events.map((event) =>
      buildCandidateReviewSnapshot(
        event,
        photoWorkflowMap.get(event.id)?.photos ?? [],
      ),
    );
    const orderEntries = candidateReviews.map((review) =>
      buildOrderEntrySnapshot(
        review,
        events.find((event) => event.id === review.activeEventId),
        photoWorkflowMap.get(review.activeEventId)?.photos ?? [],
        orderEntryRowMap.get(review.activeEventId),
      ),
    );
    const groupMembers: GroupMemberSnapshot[] = groupMembersResult.rows.map((row) => ({
      groupId: row.group_id,
      userId: row.user_id,
      displayName: getPrototypeDisplayName(row.user_id),
      role: row.role,
    }));
    const pendingInvitations = pendingInvitationsResult.rows.map((row) => ({
      invitationId: row.invitation_id,
      groupId: row.group_id,
      groupName: row.group_name,
      invitedUserId: row.invited_user_id,
      invitedUserDisplayName: getPrototypeDisplayName(row.invited_user_id),
      invitedByDisplayName: getPrototypeDisplayName(row.invited_by_user_id),
    }));

    return {
      ...buildPrototypeWorkspaceSnapshot({
        groupSummary: {
          totalGroups: groups.length,
          totalMembers: Number.parseInt(
            membershipCountResult.rows[0]?.total_memberships ?? "0",
            10,
          ),
        },
        groups,
        events,
      }),
      groupMembers,
      pendingInvitations,
      photoWorkflows: [...photoWorkflowMap.values()],
      candidateReviews,
      orderEntries,
    };
  };
}

export function createPrototypeGroupCreator(
  pool: Pick<Pool, "query">,
): (input: { name: string }) => Promise<void> {
  return async (input) => {
    const groupName = input.name.trim();
    if (!groupName) {
      throw new Error("Prototype group name is required");
    }

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM prototype_groups",
    );
    const nextCount = Number.parseInt(result.rows[0]?.count ?? "0", 10) + 1;
    const nextGroupId = `group-created-${nextCount}`;

    await pool.query(
      `
        INSERT INTO prototype_groups (id, name, owner_id)
        VALUES ($1, $2, $3)
      `,
      [nextGroupId, groupName, PROTOTYPE_VIEWER_ID],
    );

    await pool.query(
      `
        INSERT INTO prototype_group_memberships (group_id, user_id, role)
        VALUES ($1, $2, 'Owner')
      `,
      [nextGroupId, PROTOTYPE_VIEWER_ID],
    );
  };
}

export function createPrototypeEventCreator(
  pool: Pick<Pool, "query">,
): (input: {
  groupId: string;
  title: string;
  description: string;
  votingStartsAt: string;
  votingEndsAt: string;
}) => Promise<void> {
  return async (input) => {
    const groupId = input.groupId.trim();
    const title = input.title.trim();
    const description = input.description.trim();
    const votingStartsAt = input.votingStartsAt.trim();
    const votingEndsAt = input.votingEndsAt.trim();

    if (!groupId) {
      throw new Error("Prototype event group id is required");
    }

    if (!title) {
      throw new Error("Prototype event title is required");
    }

    if (!description) {
      throw new Error("Prototype event description is required");
    }

    if (!votingStartsAt || !votingEndsAt) {
      throw new Error("Prototype event voting period is required");
    }

    const votingStartsAtDate = new Date(votingStartsAt);
    const votingEndsAtDate = new Date(votingEndsAt);

    if (Number.isNaN(votingStartsAtDate.valueOf()) || Number.isNaN(votingEndsAtDate.valueOf())) {
      throw new Error("Prototype event voting period must use valid datetimes");
    }

    if (votingStartsAtDate >= votingEndsAtDate) {
      throw new Error("Prototype event voting end must be after the start");
    }

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM prototype_events",
    );
    const nextCount = Number.parseInt(result.rows[0]?.count ?? "0", 10) + 1;
    const nextEventId = `event-created-${nextCount}`;
    const initialStatus = resolveEventStatus({
      votingStartsAt: votingStartsAtDate.toISOString(),
      votingEndsAt: votingEndsAtDate.toISOString(),
      votingClosedManually: false,
    });

    await pool.query(
      `
        INSERT INTO prototype_events (
          id,
          group_id,
          title,
          status,
          description,
          voting_starts_at,
          voting_ends_at,
          voting_closed_manually,
          owner_approved,
          photo_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, 0)
      `,
      [
        nextEventId,
        groupId,
        title,
        initialStatus,
        description,
        votingStartsAtDate.toISOString(),
        votingEndsAtDate.toISOString(),
      ],
    );

    await pool.query(
      `
        INSERT INTO prototype_photo_workflows (
          event_id,
          pending_count,
          uploaded_count,
          helper_text
        )
        VALUES ($1, 0, 0, 'Upload queue is local-only until backend adapters land.')
      `,
      [nextEventId],
    );

    await pool.query(
      `
        INSERT INTO prototype_order_entries (
          event_id,
          selected_candidate_count,
          book_format,
          note,
          selected_photo_ids_json,
          cover_photo_id,
          page_layouts_json,
          page_notes_json
        )
        VALUES ($1, 0, $2, $3, '[]', NULL, '{}', '{}')
      `,
      [
        nextEventId,
        "Hardcover square",
        "Add more liked photos to prepare a stronger SweetBook handoff.",
      ],
    );
  };
}

export function createPrototypeEventVotingCloser(
  pool: Pick<Pool, "query">,
): (input: { eventId: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    if (!eventId) {
      throw new Error("Prototype event id is required");
    }

    const eventResult = await pool.query<{
      voting_starts_at: string;
      voting_ends_at: string;
    }>(
      `
        SELECT voting_starts_at::text, voting_ends_at::text
        FROM prototype_events
        WHERE id = $1
      `,
      [eventId],
    );
    const event = eventResult.rows[0];
    if (!event) {
      throw new Error("Prototype event was not found");
    }

    const nextStatus = resolveEventStatus({
      votingStartsAt: event.voting_starts_at,
      votingEndsAt: event.voting_ends_at,
      votingClosedManually: true,
    });

    await pool.query(
      `
        UPDATE prototype_events
        SET
          voting_closed_manually = TRUE,
          status = $2
        WHERE id = $1
      `,
      [eventId, nextStatus],
    );
  };
}

export function createPrototypeEventVotingExtender(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; votingEndsAt: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const votingEndsAt = input.votingEndsAt.trim();

    if (!eventId) {
      throw new Error("Prototype event id is required");
    }

    if (!votingEndsAt) {
      throw new Error("Prototype event voting end is required");
    }

    const votingEndsAtDate = new Date(votingEndsAt);
    if (Number.isNaN(votingEndsAtDate.valueOf())) {
      throw new Error("Prototype event voting end must use a valid datetime");
    }

    const eventResult = await pool.query<{
      voting_starts_at: string;
    }>(
      `
        SELECT voting_starts_at::text
        FROM prototype_events
        WHERE id = $1
      `,
      [eventId],
    );
    const event = eventResult.rows[0];
    if (!event) {
      throw new Error("Prototype event was not found");
    }

    const nextStatus = resolveEventStatus({
      votingStartsAt: event.voting_starts_at,
      votingEndsAt: votingEndsAtDate.toISOString(),
      votingClosedManually: false,
    });

    await pool.query(
      `
        UPDATE prototype_events
        SET
          voting_ends_at = $2,
          voting_closed_manually = FALSE,
          status = $3
        WHERE id = $1
      `,
      [eventId, votingEndsAtDate.toISOString(), nextStatus],
    );
  };
}

export function createPrototypeEventOwnerApprovalUpdater(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; ownerApproved: boolean }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();

    if (!eventId) {
      throw new Error("Prototype event id is required");
    }

    const result = await pool.query(
      `
        UPDATE prototype_events
        SET owner_approved = $2
        WHERE id = $1
      `,
      [eventId, input.ownerApproved],
    );

    if ((result as { rowCount?: number }).rowCount === 0) {
      throw new Error("Prototype event was not found");
    }
  };
}

export function createPrototypeOrderSelectionUpdater(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; selectedPhotoIds: string[] }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    if (!eventId) {
      throw new Error("Prototype event id is required");
    }

    const selectedPhotoIds = [...new Set(input.selectedPhotoIds.map((id) => id.trim()).filter(Boolean))];
    const currentResult = await pool.query<{ cover_photo_id: string | null }>(
      `
        SELECT cover_photo_id
        FROM prototype_order_entries
        WHERE event_id = $1
      `,
      [eventId],
    );
    const currentCoverPhotoId = currentResult.rows[0]?.cover_photo_id ?? null;
    const nextCoverPhotoId =
      currentCoverPhotoId && selectedPhotoIds.includes(currentCoverPhotoId)
        ? currentCoverPhotoId
        : (selectedPhotoIds[0] ?? null);

    await pool.query(
      `
        INSERT INTO prototype_order_entries (
          event_id,
          selected_candidate_count,
          book_format,
          note,
          selected_photo_ids_json,
          cover_photo_id,
          page_layouts_json,
          page_notes_json
        )
        VALUES ($1, $2, 'Hardcover square', $3, $4, $5, '{}', '{}')
        ON CONFLICT (event_id) DO UPDATE
        SET
          selected_candidate_count = EXCLUDED.selected_candidate_count,
          selected_photo_ids_json = EXCLUDED.selected_photo_ids_json,
          cover_photo_id = EXCLUDED.cover_photo_id
      `,
      [
        eventId,
        selectedPhotoIds.length,
        selectedPhotoIds.length > 0
          ? "Review this summary before backend submission is wired."
          : "Add more liked photos to prepare a stronger SweetBook handoff.",
        JSON.stringify(selectedPhotoIds),
        nextCoverPhotoId,
      ],
    );
  };
}

export function createPrototypeOrderCoverUpdater(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; coverPhotoId: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const coverPhotoId = input.coverPhotoId.trim();
    if (!eventId || !coverPhotoId) {
      throw new Error("Prototype cover update requires event and photo ids");
    }

    const result = await pool.query<{ selected_photo_ids_json: string | null }>(
      `
        SELECT selected_photo_ids_json
        FROM prototype_order_entries
        WHERE event_id = $1
      `,
      [eventId],
    );
    const selectedPhotoIds = parseStringArray(result.rows[0]?.selected_photo_ids_json);
    if (!selectedPhotoIds.includes(coverPhotoId)) {
      throw new Error("Cover photo must already be selected for the draft");
    }

    await pool.query(
      `
        UPDATE prototype_order_entries
        SET cover_photo_id = $2
        WHERE event_id = $1
      `,
      [eventId, coverPhotoId],
    );
  };
}

export function createPrototypeOrderPageLayoutUpdater(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; pageId: string; layout: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const pageId = input.pageId.trim();
    const layout = input.layout.trim();
    if (!eventId || !pageId || !layout) {
      throw new Error("Prototype page layout update requires event, page, and layout");
    }

    const result = await pool.query<{ page_layouts_json: string | null }>(
      `
        SELECT page_layouts_json
        FROM prototype_order_entries
        WHERE event_id = $1
      `,
      [eventId],
    );
    const nextLayouts = {
      ...parseStringRecord(result.rows[0]?.page_layouts_json),
      [pageId]: layout,
    };

    await pool.query(
      `
        UPDATE prototype_order_entries
        SET page_layouts_json = $2
        WHERE event_id = $1
      `,
      [eventId, JSON.stringify(nextLayouts)],
    );
  };
}

export function createPrototypeOrderPageNoteUpdater(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; pageId: string; note: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const pageId = input.pageId.trim();
    if (!eventId || !pageId) {
      throw new Error("Prototype page note update requires event and page ids");
    }

    const result = await pool.query<{ page_notes_json: string | null }>(
      `
        SELECT page_notes_json
        FROM prototype_order_entries
        WHERE event_id = $1
      `,
      [eventId],
    );
    const nextNotes = {
      ...parseStringRecord(result.rows[0]?.page_notes_json),
      [pageId]: input.note,
    };

    await pool.query(
      `
        UPDATE prototype_order_entries
        SET page_notes_json = $2
        WHERE event_id = $1
      `,
      [eventId, JSON.stringify(nextNotes)],
    );
  };
}

export function createPrototypeUserSearch(): (input: {
  query: string;
}) => Promise<Array<{ userId: string; username: string; displayName: string }>> {
  return async (input) => {
    const normalizedQuery = input.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return PROTOTYPE_USER_DIRECTORY.filter(
      (user) =>
        user.userId.toLowerCase().includes(normalizedQuery) ||
        user.username.toLowerCase().includes(normalizedQuery) ||
        user.displayName.toLowerCase().includes(normalizedQuery),
    );
  };
}

export function createPrototypeGroupInviteCreator(
  pool: Pick<Pool, "query">,
): (input: { groupId: string; userId: string }) => Promise<void> {
  return async (input) => {
    const groupId = input.groupId.trim();
    const userId = input.userId.trim();

    if (!groupId || !userId) {
      throw new Error("Prototype group invite requires group and user ids");
    }

    if (!PROTOTYPE_USER_DIRECTORY.some((user) => user.userId === userId)) {
      throw new Error("Prototype user was not found");
    }

    const membershipResult = await pool.query<{ role: string }>(
      `
        SELECT role
        FROM prototype_group_memberships
        WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, userId],
    );
    if (membershipResult.rows.length > 0) {
      throw new Error("Prototype user already belongs to this group");
    }

    const inviteCountResult = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM prototype_group_invitations",
    );
    const nextCount = Number.parseInt(inviteCountResult.rows[0]?.count ?? "0", 10) + 1;
    const nextInvitationId = `invite-created-${nextCount}`;

    await pool.query(
      `
        INSERT INTO prototype_group_invitations (id, group_id, invited_user_id, invited_by_user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (group_id, invited_user_id) DO NOTHING
      `,
      [nextInvitationId, groupId, userId, PROTOTYPE_VIEWER_ID],
    );
  };
}

export function createPrototypeInvitationAcceptor(
  pool: Pick<Pool, "query">,
): (input: { invitationId: string; userId: string }) => Promise<void> {
  return async (input) => {
    const invitationId = input.invitationId.trim();
    const userId = input.userId.trim();

    if (!invitationId || !userId) {
      throw new Error("Prototype invitation accept requires invitation and user ids");
    }

    const invitationResult = await pool.query<{
      group_id: string;
      invited_user_id: string;
    }>(
      `
        SELECT group_id, invited_user_id
        FROM prototype_group_invitations
        WHERE id = $1
      `,
      [invitationId],
    );

    const invitation = invitationResult.rows[0];
    if (!invitation) {
      throw new Error("Prototype invitation was not found");
    }

    if (invitation.invited_user_id !== userId) {
      throw new Error("Prototype invitation does not belong to this user");
    }

    await pool.query(
      `
        INSERT INTO prototype_group_memberships (group_id, user_id, role)
        VALUES ($1, $2, 'Contributor')
        ON CONFLICT (group_id, user_id) DO NOTHING
      `,
      [invitation.group_id, userId],
    );

    await pool.query(
      `
        DELETE FROM prototype_group_invitations
        WHERE id = $1
      `,
      [invitationId],
    );
  };
}

export function createPrototypeInvitationDecliner(
  pool: Pick<Pool, "query">,
): (input: { invitationId: string; userId: string }) => Promise<void> {
  return async (input) => {
    const invitationId = input.invitationId.trim();
    const userId = input.userId.trim();

    if (!invitationId || !userId) {
      throw new Error("Prototype invitation decline requires invitation and user ids");
    }

    const result = await pool.query(
      `
        DELETE FROM prototype_group_invitations
        WHERE id = $1 AND invited_user_id = $2
      `,
      [invitationId, userId],
    );

    if ((result as { rowCount?: number }).rowCount === 0) {
      throw new Error("Prototype invitation was not found");
    }
  };
}

export function createPrototypeOwnerTransfer(
  pool: Pick<Pool, "query">,
): (input: { groupId: string; nextOwnerUserId: string }) => Promise<void> {
  return async (input) => {
    const groupId = input.groupId.trim();
    const nextOwnerUserId = input.nextOwnerUserId.trim();

    if (!groupId || !nextOwnerUserId) {
      throw new Error("Prototype owner transfer requires group and next owner ids");
    }

    await pool.query(
      `
        UPDATE prototype_group_memberships
        SET role = 'Editor'
        WHERE group_id = $1 AND role = 'Owner'
      `,
      [groupId],
    );

    const result = await pool.query(
      `
        UPDATE prototype_group_memberships
        SET role = 'Owner'
        WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, nextOwnerUserId],
    );

    if ((result as { rowCount?: number }).rowCount === 0) {
      throw new Error("Next owner must already belong to the group");
    }
  };
}

export function createPrototypeGroupLeaveAction(
  pool: Pick<Pool, "query">,
): (input: { groupId: string; userId: string }) => Promise<void> {
  return async (input) => {
    const groupId = input.groupId.trim();
    const userId = input.userId.trim();

    if (!groupId || !userId) {
      throw new Error("Prototype leave action requires group and user ids");
    }

    const membershipResult = await pool.query<{ role: string }>(
      `
        SELECT role
        FROM prototype_group_memberships
        WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, userId],
    );

    const membership = membershipResult.rows[0];
    if (!membership) {
      throw new Error("Prototype membership was not found");
    }

    if (membership.role === "Owner") {
      throw new Error("Group owners must transfer ownership before leaving");
    }

    await pool.query(
      `
        DELETE FROM prototype_group_memberships
        WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, userId],
    );
  };
}

function buildVotingFields(input: {
  votingStartsAt: string;
  votingEndsAt: string;
  votingClosedManually: boolean;
}): Pick<
  EventCardSnapshot,
  | "status"
  | "votingStartsAt"
  | "votingEndsAt"
  | "votingClosedManually"
  | "canVote"
  | "canOwnerSelectPhotos"
  | "operationSummary"
> {
  const status = resolveEventStatus(input);
  const canVote = status === "collecting";
  const canOwnerSelectPhotos = status === "ready";

  return {
    status,
    votingStartsAt: input.votingStartsAt,
    votingEndsAt: input.votingEndsAt,
    votingClosedManually: input.votingClosedManually,
    canVote,
    canOwnerSelectPhotos,
    operationSummary: buildEventOperationSummary({
      status,
      canVote,
      canOwnerSelectPhotos,
    }),
  };
}

function resolveEventStatus(input: {
  votingStartsAt: string;
  votingEndsAt: string;
  votingClosedManually: boolean;
}): EventCardSnapshot["status"] {
  if (input.votingClosedManually) {
    return "ready";
  }

  const now = Date.now();
  const votingStartsAt = new Date(input.votingStartsAt).valueOf();
  const votingEndsAt = new Date(input.votingEndsAt).valueOf();

  if (Number.isNaN(votingStartsAt) || Number.isNaN(votingEndsAt)) {
    return "draft";
  }

  if (now < votingStartsAt) {
    return "draft";
  }

  if (now > votingEndsAt) {
    return "ready";
  }

  return "collecting";
}

export function createPrototypePhotoCreator(
  pool: Pick<Pool, "query">,
): (input: { eventId: string; caption: string }) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const caption = input.caption.trim();

    if (!eventId) {
      throw new Error("Prototype photo event id is required");
    }

    if (!caption) {
      throw new Error("Prototype photo caption is required");
    }

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM prototype_photos",
    );
    const nextCount = Number.parseInt(result.rows[0]?.count ?? "0", 10) + 1;
    const nextPhotoId = `photo-created-${nextCount}`;

    await pool.query(
      `
        INSERT INTO prototype_photos (
          id,
          event_id,
          caption,
          uploaded_by,
          like_count,
          liked_by_viewer,
          original_file_name,
          media_type,
          storage_path
        )
        VALUES ($1, $2, $3, 'SweetBook Demo User', 0, FALSE, NULL, NULL, NULL)
      `,
      [nextPhotoId, eventId, caption],
    );

    await pool.query(
      `
        UPDATE prototype_photo_workflows
        SET uploaded_count = uploaded_count + 1
        WHERE event_id = $1
      `,
      [eventId],
    );

    await pool.query(
      `
        UPDATE prototype_events
        SET photo_count = photo_count + 1
        WHERE id = $1
      `,
      [eventId],
    );
  };
}

export function createPrototypePhotoUploader(
  pool: Pick<Pool, "query">,
  options: { uploadDirectory: string },
): (input: {
  eventId: string;
  caption: string;
  originalFileName: string;
  mediaType: string;
  fileBytes: Uint8Array;
}) => Promise<void> {
  return async (input) => {
    const eventId = input.eventId.trim();
    const caption = input.caption.trim();
    const originalFileName = input.originalFileName.trim();
    const mediaType = input.mediaType.trim();

    if (!eventId) {
      throw new Error("Prototype photo event id is required");
    }

    if (!caption) {
      throw new Error("Prototype photo caption is required");
    }

    if (!originalFileName) {
      throw new Error("Prototype photo file name is required");
    }

    if (!mediaType.startsWith("image/")) {
      throw new Error("Prototype photo uploads must be image files");
    }

    if (input.fileBytes.byteLength === 0) {
      throw new Error("Prototype photo file is empty");
    }

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM prototype_photos",
    );
    const nextCount = Number.parseInt(result.rows[0]?.count ?? "0", 10) + 1;
    const nextPhotoId = `photo-created-${nextCount}`;
    const storedAsset = await savePrototypePhotoAsset({
      uploadDirectory: options.uploadDirectory,
      photoId: nextPhotoId,
      originalFileName,
      mediaType,
      fileBytes: input.fileBytes,
    });

    await pool.query(
      `
        INSERT INTO prototype_photos (
          id,
          event_id,
          caption,
          uploaded_by,
          like_count,
          liked_by_viewer,
          original_file_name,
          media_type,
          storage_path
        )
        VALUES ($1, $2, $3, 'SweetBook Demo User', 0, FALSE, $4, $5, $6)
      `,
      [
        nextPhotoId,
        eventId,
        caption,
        storedAsset.originalFileName,
        storedAsset.mediaType,
        storedAsset.storagePath,
      ],
    );

    await pool.query(
      `
        UPDATE prototype_photo_workflows
        SET uploaded_count = uploaded_count + 1
        WHERE event_id = $1
      `,
      [eventId],
    );

    await pool.query(
      `
        UPDATE prototype_events
        SET photo_count = photo_count + 1
        WHERE id = $1
      `,
      [eventId],
    );
  };
}

export function createPrototypePhotoLikeAdder(
  pool: Pick<Pool, "query">,
): (input: { photoId: string; userId: string }) => Promise<void> {
  return async (input) => {
    const photoId = input.photoId.trim();
    const userId = input.userId.trim();

    if (!photoId) {
      throw new Error("Prototype photo id is required");
    }

    if (!userId) {
      throw new Error("Prototype like user id is required");
    }

    const insertResult = await pool.query<{ inserted: string }>(
      `
        INSERT INTO prototype_photo_likes (photo_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (photo_id, user_id) DO NOTHING
        RETURNING '1' AS inserted
      `,
      [photoId, userId],
    );

    if (insertResult.rows.length === 0) {
      return;
    }

    await pool.query(
      `
        UPDATE prototype_photos
        SET
          like_count = like_count + 1,
          liked_by_viewer = CASE WHEN $2 = $3 THEN TRUE ELSE liked_by_viewer END
        WHERE id = $1
      `,
      [photoId, userId, PROTOTYPE_VIEWER_ID],
    );
  };
}

export function createPrototypePhotoAssetLoader(
  pool: Pick<Pool, "query">,
): (photoId: string) => Promise<{ body: Uint8Array; mediaType: string } | null> {
  return async (photoId) => {
    const normalizedPhotoId = photoId.trim();
    if (!normalizedPhotoId) {
      return null;
    }

    const result = await pool.query<{
      media_type: string | null;
      storage_path: string | null;
    }>(
      `
        SELECT media_type, storage_path
        FROM prototype_photos
        WHERE id = $1
      `,
      [normalizedPhotoId],
    );

    const row = result.rows[0];
    if (!row?.storage_path || !row.media_type) {
      return null;
    }

    return {
      body: await loadPrototypePhotoAsset(row.storage_path),
      mediaType: row.media_type,
    };
  };
}

function buildCandidateReviewSnapshot(
  event: EventCardSnapshot,
  photos: PhotoCardSnapshot[],
): CandidateReviewSnapshot {
  const selectedPhotos = [...photos]
    .sort((left, right) => {
      if (right.likeCount !== left.likeCount) {
        return right.likeCount - left.likeCount;
      }

      if (left.likedByViewer !== right.likedByViewer) {
        return Number(right.likedByViewer) - Number(left.likedByViewer);
      }

      return left.caption.localeCompare(right.caption);
    })
    .slice(0, 3);

  const candidates: CandidateCardSnapshot[] = selectedPhotos.map((photo, index) => ({
    photoId: photo.id,
    caption: photo.caption,
    rank: index + 1,
    likeCount: photo.likeCount,
    whySelected: buildSelectionReason(photo, index + 1),
  }));

  const pagePreview: PagePreviewSnapshot[] = [];
  if (selectedPhotos[0]) {
    pagePreview.push({
      pageNumber: 1,
      title: "Cover preview",
      photoCaptions: [selectedPhotos[0].caption],
    });
  }

  if (selectedPhotos[1] || selectedPhotos[2]) {
    pagePreview.push({
      pageNumber: 2,
      title: "Story spread",
      photoCaptions: selectedPhotos.slice(1, 3).map((photo) => photo.caption),
    });
  }

  return {
    activeEventId: event.id,
    activeEventName: event.name,
    candidates,
    pagePreview,
  };
}

function buildOrderEntrySnapshot(
  review: CandidateReviewSnapshot,
  event?: Pick<EventCardSnapshot, "ownerApproved">,
  photos: PhotoCardSnapshot[] = [],
  persistedOrderEntry?: OrderEntryRow,
): OrderEntrySnapshot {
  const pagePlanner = buildPagePlannerSnapshot(review, photos, persistedOrderEntry);
  const pageDrafts = buildPlannerPageDrafts(photos, pagePlanner);
  const selectedPhotoCount = pagePlanner.selectedPhotoIds.length;
  const payloadSections =
    selectedPhotoCount > 0
      ? ["selected photos", "page preview", "event title"]
      : ["event title"];

  return {
    activeEventId: review.activeEventId,
    activeEventName: review.activeEventName,
    selectedCandidateCount: selectedPhotoCount,
    pagePlanner,
    operationSummary: buildOrderOperationSummary({
      selectedPhotoCount,
    }),
    readinessSummary: buildOrderReadinessSummary({
      selectedPhotoCount,
      ownerApproved: event?.ownerApproved,
    }),
    reviewSummary: buildOrderReviewSummary({
      draftPageCount: pageDrafts.length,
      flaggedDraftPageCount: pageDrafts.filter((page) => page.warning).length,
      ownerApproved: event?.ownerApproved,
    }),
    handoffSummary: {
      bookFormat: persistedOrderEntry?.book_format ?? "Hardcover square",
      payloadSections,
      note:
        persistedOrderEntry?.note ??
        (selectedPhotoCount > 0
          ? "Review this summary before backend submission is wired."
          : "Add more liked photos to prepare a stronger SweetBook handoff."),
    },
  };
}

function buildPagePlannerSnapshot(
  review: CandidateReviewSnapshot,
  photos: PhotoCardSnapshot[],
  persistedOrderEntry?: OrderEntryRow,
): OrderEntrySnapshot["pagePlanner"] {
  const availablePhotoIds = new Set(photos.map((photo) => photo.id));
  const fallbackSelectedPhotoIds = review.candidates.map((candidate) => candidate.photoId);
  const persistedSelectedPhotoIds = parseStringArray(
    persistedOrderEntry?.selected_photo_ids_json,
  ).filter((photoId) => availablePhotoIds.has(photoId));
  const selectedPhotoIds =
    persistedSelectedPhotoIds.length > 0 ? persistedSelectedPhotoIds : fallbackSelectedPhotoIds;
  const coverPhotoId =
    persistedOrderEntry?.cover_photo_id && selectedPhotoIds.includes(persistedOrderEntry.cover_photo_id)
      ? persistedOrderEntry.cover_photo_id
      : (selectedPhotoIds[0] ?? undefined);

  return {
    selectedPhotoIds,
    coverPhotoId,
    pageLayouts: parseStringRecord(persistedOrderEntry?.page_layouts_json),
    pageNotes: parseStringRecord(persistedOrderEntry?.page_notes_json),
  };
}

function buildPlannerPageDrafts(
  photos: PhotoCardSnapshot[],
  pagePlanner: OrderEntrySnapshot["pagePlanner"],
): Array<{
  warning: string | null;
}> {
  const selectedPhotos = pagePlanner.selectedPhotoIds
    .map((photoId) => photos.find((photo) => photo.id === photoId))
    .filter((photo): photo is PhotoCardSnapshot => Boolean(photo));
  const coverPhoto =
    selectedPhotos.find((photo) => photo.id === pagePlanner.coverPhotoId) ?? selectedPhotos[0];
  const spreadPhotos = selectedPhotos.filter((photo) => photo.id !== coverPhoto?.id);
  const pages: Array<{
    warning: string | null;
  }> = [];

  if (coverPhoto) {
    const pageId = "cover";
    const recommendedNote =
      "Lead with the strongest event-defining moment on the cover.";
    const layout = pagePlanner.pageLayouts[pageId] ?? "Full-bleed cover";
    const note = pagePlanner.pageNotes[pageId] ?? recommendedNote;
    pages.push({
      warning: note.trim().length === 0 ? "Add a cover note before handoff." : null,
    });
  }

  for (let index = 0; index < spreadPhotos.length; index += 2) {
    const pageId = `spread-${index / 2 + 1}`;
    const pagePhotos = spreadPhotos.slice(index, index + 2);
    const recommendedLayout = getDefaultSpreadLayout(pagePhotos.length);
    const recommendedNote =
      pagePhotos.length > 1
        ? "Use this spread to balance detail shots with group moments."
        : "Single-photo spread can spotlight a key memory beat.";
    const layout = pagePlanner.pageLayouts[pageId] ?? recommendedLayout;
    const note = pagePlanner.pageNotes[pageId] ?? recommendedNote;
    pages.push({
      warning: getPageWarning(layout, pagePhotos.length, note),
    });
  }

  return pages;
}

function getDefaultSpreadLayout(photoCount: number): string {
  return photoCount > 1 ? "Balanced two-photo spread" : "Single-photo spotlight";
}

function getPageWarning(
  layout: string,
  photoCount: number,
  note: string,
): string | null {
  if (note.trim().length === 0) {
    return "Add an edit note before sending this page to SweetBook.";
  }

  if (layout === "Single-photo spotlight" && photoCount > 1) {
    return "Single-photo spotlight works best with one photo.";
  }

  if (layout === "Balanced two-photo spread" && photoCount < 2) {
    return "Balanced two-photo spread needs two photos to feel complete.";
  }

  if (layout === "Collage spread" && photoCount < 2) {
    return "Collage spread needs at least two photos.";
  }

  return null;
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseStringRecord(value: string | null | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function buildSelectionReason(photo: PhotoCardSnapshot, rank: number): string {
  if (rank === 1) {
    return `Selected because ${photo.caption} is leading with ${photo.likeCount} likes.`;
  }

  if (photo.likedByViewer) {
    return `Selected because ${photo.caption} has strong engagement and includes your like.`;
  }

  return `Selected because ${photo.caption} remains one of the strongest liked moments in this event.`;
}

function getPrototypeDisplayName(userId: string): string {
  return (
    PROTOTYPE_USER_DIRECTORY.find((user) => user.userId === userId)?.displayName ?? userId
  );
}
