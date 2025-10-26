'use client';

import { useEffect, useState } from 'react';
import Taskbar from '@/components/Taskbar';
import BrandHeader from '@/components/BrandHeader';

interface InsightItem {
  Topic: string;
  Timeline: string;
  Mentions: number;
  FilterType?: string;
  FilterCriteria?: Record<string, unknown>;
}

interface InsightPayload {
  Subreddit: string;
  Raw_insights: InsightItem[];
  Filtered_Insights: InsightItem[];
}

const DEFAULT_SUBREDDIT = 'uberdrivers';
const INSIGHT_DOC_ID = '68fdbbf19ca49741df435ac6';

export default function InsightPage() {
  const [data, setData] = useState<InsightPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'raw' | 'filtered'>('raw');

  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      const cacheBuster = Date.now().toString();
  const url = `/api/insights?subreddit=${encodeURIComponent(DEFAULT_SUBREDDIT)}&id=${INSIGHT_DOC_ID}&ts=${cacheBuster}`;

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

  const renderContent = () => {
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

    if (!data) {
      return <div className="text-gray-400">No insight data available.</div>;
    }

  const activeItems = viewMode === 'raw' ? data.Raw_insights : data.Filtered_Insights;
  const items = activeItems.filter((item) => item.Mentions > 0);

    if (!items.length) {
      return <div className="text-gray-400">No raw insights available.</div>;
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${item.Topic}-${index}`} className="flex items-start justify-between border border-gray-800 bg-gray-900/40 px-4 py-3">
            <div className="pr-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold truncate">{item.Topic}</span>
                {viewMode === 'filtered' && item.FilterType ? (
                  <span className="shrink-0 text-xs uppercase tracking-wide text-emerald-300/80 border border-emerald-400/40 px-2 py-0.5">
                    {item.FilterType}
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-gray-400 mt-1">Timeline: {item.Timeline}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">{item.Mentions}</div>
              <div className="text-xs text-gray-500">mentions</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      <BrandHeader />

      <div className="border-b border-gray-800"></div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-white text-3xl font-bold">Insights Preview</h2>
              <p className="text-gray-400 mt-2">
                Top conversation topics from r/{data?.Subreddit ?? DEFAULT_SUBREDDIT} pulled directly from MongoDB.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('raw')}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700'
                }`}
              >
                Raw
              </button>
              <button
                onClick={() => setViewMode('filtered')}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${
                  viewMode === 'filtered'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700'
                }`}
              >
                Filtered
              </button>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>

      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>
    </div>
  );
}
