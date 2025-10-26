'use client';

import { useEffect, useMemo, useState } from 'react';
import Taskbar from '@/components/Taskbar';
import BrandHeader from '@/components/BrandHeader';

interface DailyMentionPoint {
  date: string;
  count: number;
}

interface InsightItem {
  Topic: string;
  Timeline: string;
  Mentions: number;
  DailyMentions?: DailyMentionPoint[];
}

interface InsightPayload {
  Subreddit: string;
  Raw_insights: InsightItem[];
  Filtered_Insights: InsightItem[];
}

const DEFAULT_SUBREDDIT = 'uberdrivers';
const INSIGHT_DOC_ID = '68fdd0416736f9ac1aad9513';
const MIN_BAR_HEIGHT_PERCENT = 6;
const MIN_BAR_HEIGHT_PX = 18;

export default function InsightPage() {
  const [data, setData] = useState<InsightPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      const cacheBuster = Date.now().toString();
      const url = `/api/insights?subreddit=${encodeURIComponent(
        DEFAULT_SUBREDDIT
      )}&id=${INSIGHT_DOC_ID}&ts=${cacheBuster}`;

      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload: InsightPayload = await res.json();
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load insights. Please refresh.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchInsights();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeTopic = useMemo(() => {
    if (!data?.Raw_insights?.length) {
      return '';
    }

    const hasSelection = data.Raw_insights.some((insight) => insight.Topic === selectedTopic);
    if (selectedTopic && hasSelection) {
      return selectedTopic;
    }

    return data.Raw_insights[0].Topic;
  }, [data, selectedTopic]);

  const selectedInsight = useMemo(() => {
    if (!data?.Raw_insights?.length) {
      return null;
    }

    return data.Raw_insights.find((insight) => insight.Topic === activeTopic) ?? null;
  }, [data, activeTopic]);

  const histogramData = useMemo(() => {
    if (!selectedInsight?.DailyMentions?.length) {
      return [];
    }

    return [...selectedInsight.DailyMentions].sort((a, b) => {
      const aMillis = new Date(a.date).getTime();
      const bMillis = new Date(b.date).getTime();
      return aMillis - bMillis;
    });
  }, [selectedInsight]);

  const maxCount = useMemo(() => {
    if (!histogramData.length) {
      return 0;
    }
    return histogramData.reduce((max, point) => (point.count > max ? point.count : max), 0);
  }, [histogramData]);

  const formatShortDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatLongDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderHistogram = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center gap-3 text-white/80">
          <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span className="text-xs tracking-wide uppercase">Loading insights…</span>
        </div>
      );
    }

    if (error) {
      return <div className="text-red-400">{error}</div>;
    }

    if (!data?.Raw_insights?.length) {
      return <div className="text-gray-400">No insight data available.</div>;
    }

    if (!selectedInsight) {
      return <div className="text-gray-400">Select an insight to view mention activity.</div>;
    }

    if (!histogramData.length) {
      return (
        <div className="text-gray-400">
          This insight has no mention dates yet. Try another topic from the dropdown above.
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
          <div className="border border-white/10 bg-black/30 px-4 py-3 rounded-lg">
            <p className="text-xs uppercase tracking-wide text-gray-500">Topic</p>
            <p className="text-white font-semibold mt-1 line-clamp-2">{selectedInsight.Topic}</p>
          </div>
          <div className="border border-white/10 bg-black/30 px-4 py-3 rounded-lg">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total mentions</p>
            <p className="text-2xl font-semibold text-white mt-1">{selectedInsight.Mentions}</p>
          </div>
          <div className="border border-white/10 bg-black/30 px-4 py-3 rounded-lg">
            <p className="text-xs uppercase tracking-wide text-gray-500">First activity</p>
            <p className="text-white font-semibold mt-1">{formatLongDate(histogramData[0].date)}</p>
          </div>
          <div className="border border-white/10 bg-black/30 px-4 py-3 rounded-lg">
            <p className="text-xs uppercase tracking-wide text-gray-500">Latest activity</p>
            <p className="text-white font-semibold mt-1">
              {formatLongDate(histogramData[histogramData.length - 1].date)}
            </p>
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl bg-gradient-to-b from-gray-900/80 to-black/60 px-4 py-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
            <span>Mentions</span>
            <span>Days</span>
          </div>
          <div className="relative h-72 mt-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 0.5, 1].map((value) => (
                <div key={value} className="border-t border-white/5">
                  <span className="sr-only">grid line {value}</span>
                </div>
              ))}
            </div>
            <div className="relative h-full flex items-end gap-4 overflow-x-auto px-2">
              {histogramData.map((point) => {
                const heightPercent = maxCount ? (point.count / maxCount) * 100 : 0;
                const clampedPercent = Math.max(heightPercent, MIN_BAR_HEIGHT_PERCENT);
                return (
                  <div
                    key={`${point.date}-${point.count}`}
                    className="flex flex-col items-center gap-2 min-w-[3rem] text-xs text-gray-400"
                  >
                    <span className="text-sm font-semibold text-white/90">{point.count}</span>
                    <div
                      className="w-full rounded-t border border-emerald-300/40 bg-gradient-to-t from-emerald-500 via-emerald-400 to-emerald-200 shadow-[0_8px_18px_rgba(52,211,153,0.45)] transition-[height] duration-300"
                      style={{ height: `max(${clampedPercent.toFixed(1)}%, ${MIN_BAR_HEIGHT_PX}px)` }}
                    />
                    <span className="font-medium tracking-wide text-[11px] uppercase">
                      {formatShortDate(point.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      <BrandHeader />

      <div className="border-b border-gray-800" />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-white text-3xl font-bold">Insight Mentions Histogram</h2>
              <p className="text-gray-400 mt-2">
                Daily mention counts for r/{data?.Subreddit ?? DEFAULT_SUBREDDIT} raw insights.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Subreddit</p>
              <p className="text-white font-semibold mt-1">r/{data?.Subreddit ?? DEFAULT_SUBREDDIT}</p>
            </div>
          </div>

          <div className="border border-gray-800 bg-gray-900/40 rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-400 uppercase tracking-wide">Insight</label>
              <select
                value={activeTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                disabled={!data?.Raw_insights?.length}
                className="flex-1 min-w-[12rem] bg-black/60 border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
              >
                {data?.Raw_insights?.map((insight) => (
                  <option key={insight.Topic} value={insight.Topic}>
                    {insight.Topic}
                  </option>
                ))}
              </select>
            </div>

            {renderHistogram()}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>
    </div>
  );
}
