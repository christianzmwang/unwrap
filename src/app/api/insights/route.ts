import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import type { IDataSchema } from '@/models/Insight';

const DEFAULT_SUBREDDIT = 'uberdrivers';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toMillis = (value: Date | number | string | undefined | null) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    // Values from Reddit are usually seconds since epoch.
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  return null;
};

const formatDateLabel = (value: Date | number | string | undefined | null) => {
  const millis = toMillis(value);
  if (millis == null) {
    return null;
  }

  const date = new Date(millis);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatHourLabel = (value: Date | number | string | undefined | null) => {
  const millis = toMillis(value);
  if (millis == null) {
    return null;
  }

  const date = new Date(millis);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:00:00Z`;
};

const formatTimeline = (value: Date | number | string | undefined | null) => {
  return formatDateLabel(value) ?? 'Unknown date';
};

const formatDateRangeLabel = (range: unknown) => {
  if (!Array.isArray(range)) {
    return null;
  }

  const [start, end] = range as Array<Date | number | string | undefined | null>;
  const startLabel = formatDateLabel(start);
  const endLabel = formatDateLabel(end);

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }

  return startLabel ?? endLabel ?? null;
};

const resolveTimeline = (insight: unknown) => {
  if (!insight || typeof insight !== 'object') {
    return 'Unknown date';
  }

  const withDate = insight as { date?: unknown; mentions?: unknown };
  if (withDate.date) {
    return formatTimeline(withDate.date as any);
  }

  const mentions = Array.isArray(withDate.mentions) ? withDate.mentions : [];
  const latest = mentions.reduce<number | null>((acc, mention) => {
    if (!mention || typeof mention !== 'object') {
      return acc;
    }

    const candidate = toMillis((mention as any).date_posted ?? (mention as any).data_posted);
    if (candidate == null) {
      return acc;
    }

    return acc == null || candidate > acc ? candidate : acc;
  }, null);

  return formatTimeline(latest);
};

const getMentionCount = (insight: any) => {
  if (typeof insight?.num_mentions === 'number' && insight.num_mentions >= 0) {
    return insight.num_mentions;
  }

  if (Array.isArray(insight?.mentions)) {
    return insight.mentions.length;
  }

  return 0;
};

const getHourlyMentions = (insight: any) => {
  const mentions = Array.isArray(insight?.mentions) ? insight.mentions : [];

  if (!mentions.length) {
    const fallbackDate =
      formatHourLabel(
        insight?.date ?? insight?.generated_at ?? insight?.updated_at ?? insight?.created_at
      ) ?? (() => {
        const timeline = resolveTimeline(insight);
        return timeline && timeline.toLowerCase() !== 'unknown date' ? formatHourLabel(timeline) : null;
      })();

    if (fallbackDate) {
      return [
        {
          date: fallbackDate,
          count: getMentionCount(insight),
        },
      ];
    }

    return [];
  }

  const counts = mentions.reduce<Record<string, number>>((acc, mention) => {
    if (!mention || typeof mention !== 'object') {
      return acc;
    }

    const label = formatHourLabel(
      (mention as any).date_posted ??
        (mention as any).data_posted ??
        (mention as any).date ??
        (mention as any).created_at ??
        (mention as any).timestamp
    );

    if (!label) {
      return acc;
    }

    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const aMillis = new Date(a.date).getTime();
      const bMillis = new Date(b.date).getTime();
      return aMillis - bMillis;
    });
};

const mapRawInsight = (insight: any) => ({
  Topic: insight?.insight ?? 'Unknown topic',
  Timeline: resolveTimeline(insight),
  Mentions: getMentionCount(insight),
  HourlyMentions: getHourlyMentions(insight),
});

const resolveFilteredTimeline = (insight: any) => {
  if (!insight || typeof insight !== 'object') {
    return 'Unknown date';
  }

  const directDate = formatDateLabel(
    insight.date ?? insight.filter_date ?? insight.filtered_at ?? insight.generated_at
  );
  if (directDate) {
    return directDate;
  }

  const criteria = insight.filter_criteria as { date_range?: unknown } | undefined;
  const criteriaRange = criteria?.date_range ? formatDateRangeLabel(criteria.date_range) : null;
  if (criteriaRange) {
    return criteriaRange;
  }

  const fallbackDate = formatDateLabel(insight.updated_at ?? insight.created_at);
  if (fallbackDate) {
    return fallbackDate;
  }

  return resolveTimeline(insight);
};

const mapFilteredInsight = (insight: any) => {
  const filterType = typeof insight?.filter_type === 'string' ? insight.filter_type : null;
  const filterCriteria = insight?.filter_criteria && typeof insight.filter_criteria === 'object'
    ? insight.filter_criteria
    : null;

  return {
    Topic: insight?.topic ?? insight?.insight ?? 'Unknown topic',
    Timeline: resolveFilteredTimeline(insight),
    Mentions: getMentionCount(insight),
    FilterType: filterType ?? undefined,
    FilterCriteria: filterCriteria ?? undefined,
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subreddit = searchParams.get('subreddit') ?? DEFAULT_SUBREDDIT;
  const idParam = searchParams.get('id');

  let targetId: mongoose.Types.ObjectId | null = null;
  let fallbackReason: 'missing-id' | 'invalid-id' | 'not-found' | 'subreddit-mismatch' | null = null;

  if (idParam) {
    try {
      targetId = new mongoose.Types.ObjectId(idParam);
    } catch (error) {
      console.warn('Invalid insight id provided, falling back to latest document:', idParam, error);
      fallbackReason = 'invalid-id';
    }
  } else {
    fallbackReason = 'missing-id';
  }

  try {
    await dbConnect();

    const database = mongoose.connection.db;
    if (!database) {
      throw new Error('Database connection not ready');
    }

    const collection = database.collection<IDataSchema>('insights');
    let doc: IDataSchema | null = null;

    const findLatestForSubreddit = async (value: string) => {
      if (!value) {
        return null;
      }

      const cursor = collection
        .find({ subreddit: value })
        .sort({ created_at: -1, _id: -1 })
        .limit(1);

      const exactMatch = await cursor.next();
      if (exactMatch) {
        return exactMatch;
      }

      const regex = new RegExp(`^${escapeRegex(value)}$`, 'i');
      const fallbackCursor = collection
        .find({ subreddit: regex })
        .sort({ created_at: -1, _id: -1 })
        .limit(1);

      return fallbackCursor.next();
    };

    if (targetId) {
      const docById = await collection.findOne({ _id: targetId });
      if (docById) {
        if (docById.subreddit !== subreddit) {
          fallbackReason = 'subreddit-mismatch';
        } else {
          doc = docById;
        }
      }
    }

    if (!doc) {
      const latestDoc = await findLatestForSubreddit(subreddit);

      if (!latestDoc) {
        const message = targetId
          ? `No insight data found for id ${targetId.toHexString()} (${subreddit}).`
          : `No insight data found for subreddit ${subreddit}.`;

        return NextResponse.json({ error: message }, { status: 404 });
      }

      if (!fallbackReason) {
        fallbackReason = targetId ? 'not-found' : null;
      }

      doc = latestDoc;
    }

    const rawInsights = Array.isArray(doc.raw_insights)
      ? doc.raw_insights.map(mapRawInsight)
      : [];

    const filteredInsights = Array.isArray(doc.filtered_insights)
      ? doc.filtered_insights.map(mapFilteredInsight)
      : [];

    const responseBody: Record<string, unknown> = {
      Subreddit: doc.subreddit,
      Raw_insights: rawInsights,
      Filtered_Insights: filteredInsights,
    };

    const resolvedId = (doc as { _id?: mongoose.Types.ObjectId })._id;
    if (resolvedId) {
      responseBody.Resolved_Id = resolvedId.toHexString();
    }

    if (fallbackReason) {
      responseBody.Fallback = {
        reason: fallbackReason,
        requestedId: idParam ?? undefined,
        requestedSubreddit: subreddit ?? undefined,
      };
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Failed to load insight data:', error);
    return NextResponse.json(
      { error: 'Failed to load insight data. Please try again later.' },
      { status: 500 }
    );
  }
}
