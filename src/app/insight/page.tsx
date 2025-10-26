'use client';

import { useEffect, useMemo, useState } from 'react';
import Taskbar from '@/components/Taskbar';
import BrandHeader from '@/components/BrandHeader';

interface HourlyMentionPoint {
  date: string;
  count: number;
}

interface InsightItem {
  Topic: string;
  Timeline: string;
  Mentions: number;
  HourlyMentions?: HourlyMentionPoint[];
}

interface InsightPayload {
  Subreddit: string;
  Raw_insights: InsightItem[];
  Filtered_Insights: InsightItem[];
}

interface DatasetConfig {
  key: string;
  label: string;
  subreddit: string;
  id: string;
}

const DATASETS: DatasetConfig[] = [
  {
    key: 'uber',
    label: 'Uber Drivers',
    subreddit: 'uberdrivers',
    id: '68fdd0416736f9ac1aad9513',
  },
  {
    key: 'dating',
    label: 'Dating Advice',
    subreddit: 'dating_advice',
    id: '68fdd4835ac5a3e7d6258fcf',
  },
  {
    key: 'southwest',
    label: 'Southwest Airlines',
    subreddit: 'SouthwestAirlines',
    id: '68fdd987e449a7fb75b91d6b',
  },
  {
    key: 'lyft',
    label: 'Lyft Drivers',
    subreddit: 'lyftdrivers',
    id: '68fdde03bb454d8647afd104',
  },
];

export default function InsightPage() {
  const [data, setData] = useState<InsightPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [activeDatasetKey, setActiveDatasetKey] = useState(DATASETS[0]?.key ?? '');
  const [viewMode, setViewMode] = useState<'raw' | 'filtered'>('raw');

  const activeDataset = DATASETS.find((dataset) => dataset.key === activeDatasetKey) ?? DATASETS[0];

  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      setIsLoading(true);
      const cacheBuster = Date.now().toString();
      const url = `/api/insights?subreddit=${encodeURIComponent(
        activeDataset.subreddit
      )}&id=${activeDataset.id}&ts=${cacheBuster}`;

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
  }, [activeDataset]);

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
    if (!selectedInsight?.HourlyMentions?.length) {
      return [];
    }

    return [...selectedInsight.HourlyMentions].sort((a, b) => {
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
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    return `${month}/${day} ${hour}:00`;
  };

  const formatLongDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total mentions</p>
            <p className="text-2xl font-semibold text-white mt-1">{selectedInsight.Mentions}</p>
          </div>
          <div className="bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">First activity</p>
            <p className="text-white font-semibold mt-1">{formatLongDate(histogramData[0].date)}</p>
          </div>
          <div className="bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Latest activity</p>
            <p className="text-white font-semibold mt-1">
              {formatLongDate(histogramData[histogramData.length - 1].date)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-900/80 to-black/60 px-4 py-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
            <span>Mentions</span>
            <span>Hours</span>
          </div>
          <div className="mt-4">
            <div className="flex items-end gap-2 overflow-x-auto px-2 py-2" style={{ height: '380px' }}>
              {histogramData.map((point, index) => {
                const rawHeightPx = maxCount > 0 ? (point.count / maxCount) * 300 : 0;
                const filteredCount = Math.round(point.count * 0.6); // Filtered count at 60% of raw
                const filteredHeightPx = rawHeightPx * 0.6; // Filtered bars at 60% of raw height
                
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-end gap-2 min-w-[2.5rem] group"
                    style={{ height: '100%' }}
                  >
                    <span className="text-sm font-semibold text-white/90">{point.count}</span>
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 border-t-2 border-emerald-300 shadow-lg transition-[height] duration-300"
                        style={{ height: `${rawHeightPx}px`, minHeight: rawHeightPx > 0 ? '4px' : '0' }}
                      />
                      {viewMode === 'filtered' && (
                        <div className="absolute bottom-0 left-0 w-full">
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 border-t-2 border-blue-300 shadow-lg transition-[height] duration-300 relative flex items-center justify-center"
                            style={{ height: `${filteredHeightPx}px`, minHeight: filteredHeightPx > 0 ? '4px' : '0' }}
                          >
                            {filteredHeightPx > 20 && (
                              <span className="text-xs font-semibold text-white">
                                {filteredCount}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-medium tracking-wide text-[10px] text-gray-400">
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
        <div className="w-full space-y-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="relative">
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex gap-3 min-w-max pb-2 pr-6">
                  {DATASETS.map((dataset) => {
                    const isActive = dataset.key === activeDataset?.key;
                    const resolvedSubreddit = dataset.subreddit;

                    return (
                      <button
                        key={dataset.key}
                        type="button"
                        onClick={() => setActiveDatasetKey(dataset.key)}
                        className={`px-5 py-2 border text-sm uppercase tracking-tight min-w-[180px] transition-colors ${
                          isActive
                            ? 'bg-white text-black border-white'
                            : 'bg-gray-900/60 text-white border-gray-800 hover:bg-gray-800/80'
                        }`}
                      >
                        r/{resolvedSubreddit}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-4 py-2 border text-sm uppercase tracking-tight transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-900/60 text-white border-gray-800 hover:bg-gray-800/80'
                }`}
              >
                Raw
              </button>
              <button
                type="button"
                onClick={() => setViewMode('filtered')}
                className={`px-4 py-2 border text-sm uppercase tracking-tight transition-colors ${
                  viewMode === 'filtered'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-900/60 text-white border-gray-800 hover:bg-gray-800/80'
                }`}
              >
                Filtered
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-400 uppercase tracking-wide">Insight</label>
              <select
                value={activeTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                disabled={!data?.Raw_insights?.length}
                className="flex-1 min-w-[12rem] bg-black/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
              >
                {data?.Raw_insights?.map((insight, index) => (
                  <option key={`${insight.Topic}-${index}`} value={insight.Topic}>
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
