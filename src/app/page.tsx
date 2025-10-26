'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Taskbar from '@/components/Taskbar';
import WordCloudChart, { WordData } from '@/components/WordCloudChart';
import BrandHeader from '@/components/BrandHeader';

interface Insight {
  Topic: string;
  Timeline: string;
  Mentions: number;
  FilterType?: string;
  FilterCriteria?: Record<string, unknown>;
}

interface InsightData {
  Subreddit: string;
  Raw_insights: Insight[];
  Filtered_Insights: Insight[];
}

interface DatasetConfig {
  key: string;
  label: string;
  subreddit: string;
  id: string;
}

type DateRange = '1D' | '3D' | '7D' | 'CUSTOM';

const WORD_CLOUD_LIMIT = 100;
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

export default function Home() {
  const [datasetCache, setDatasetCache] = useState<Record<string, InsightData>>({});
  const [activeDatasetKey, setActiveDatasetKey] = useState(DATASETS[0]?.key ?? '');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'raw' | 'filtered'>('raw');
  const [viewMode, setViewMode] = useState<'list' | 'wordcloud'>('list');
  const [dateRange, setDateRange] = useState<DateRange>('7D');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDataset =
    DATASETS.find((dataset) => dataset.key === activeDatasetKey) ?? DATASETS[0];
  const data = activeDataset ? datasetCache[activeDataset.key] ?? null : null;
  const isLoadingActiveDataset = loadingKey === activeDataset?.key;

  const parseDateValue = (value: string | Date | null | undefined) => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseTimelineRange = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'unknown date') {
      return null;
    }

    const rangeSeparator = ' - ';
    if (trimmed.includes(rangeSeparator)) {
      const [startRaw, endRaw] = trimmed.split(rangeSeparator);
      const start = parseDateValue(startRaw);
      const end = parseDateValue(endRaw);

      if (!start && !end) {
        return null;
      }

      return {
        start: start ?? end ?? null,
        end: end ?? start ?? null,
      } as const;
    }

    const singleDate = parseDateValue(trimmed);
    return singleDate ? ({ start: singleDate, end: singleDate } as const) : null;
  };

  const parseTimeline = (value: string | null | undefined) => {
    const range = parseTimelineRange(value);
    return range?.end ?? range?.start ?? null;
  };

  const formatTimeline = (value: string) => {
    const range = parseTimelineRange(value);
    if (!range?.start || !range?.end) {
      return 'Unknown date';
    }

    const startLabel = formatDate(range.start);
    const endLabel = formatDate(range.end);

    if (range.start.getTime() === range.end.getTime()) {
      return startLabel;
    }

    return `${startLabel} - ${endLabel}`;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  const getDisplayDateRange = () => {
    if (dateRange === 'CUSTOM' && customStartDate && customEndDate) {
      return `${formatTimeline(customStartDate)} - ${formatTimeline(customEndDate)}`;
    }

    const now = new Date();
    const cutoffDate = new Date(now);

    switch (dateRange) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '3D':
        cutoffDate.setDate(now.getDate() - 3);
        break;
      case '7D':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      default:
        return '';
    }

    return `${formatDate(cutoffDate)} - ${formatDate(now)}`;
  };

  const datasetLabel = useMemo(
    () => (activeView === 'raw' ? 'Raw insights' : 'Filtered insights'),
    [activeView]
  );
  const displayDateRange = getDisplayDateRange();

  useEffect(() => {
    let cancelled = false;
    const datasetKey = activeDataset?.key;

    if (!activeDataset || !datasetKey) {
      return;
    }

    if (datasetCache[datasetKey]) {
      return;
    }

    const controller = new AbortController();

    const loadData = async () => {
      const cacheBuster = Date.now().toString();
      const url = `/api/insights?subreddit=${encodeURIComponent(
        activeDataset.subreddit
      )}&id=${activeDataset.id}&ts=${cacheBuster}`;

      setLoadingKey(activeDataset.key);

      try {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload: InsightData = await res.json();
        if (!cancelled) {
          setDatasetCache((prev) => ({
            ...prev,
            [activeDataset.key]: payload,
          }));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Failed to load data', err);
          }
          setError('Failed to load data. Please refresh.');
        }
      } finally {
        if (!cancelled) {
          setLoadingKey((current) => (current === activeDataset.key ? null : current));
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeDataset, datasetCache]);

  useEffect(() => {
    setError(null);
  }, [activeDataset?.key]);

  const filterByDateRange = useCallback((insights: Insight[]) => {
    if (!insights.length) return [];

    if (dateRange === 'CUSTOM') {
      const start = parseTimeline(customStartDate);
      const end = parseTimeline(customEndDate);

      if (!start || !end || start > end) return [];

      return insights.filter((insight) => {
        const range = parseTimelineRange(insight.Timeline);
        if (!range?.start || !range?.end) {
          return false;
        }

        return range.start <= end && range.end >= start;
      });
    }

    const now = new Date();
    const cutoffDate = new Date(now);

    switch (dateRange) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '3D':
        cutoffDate.setDate(now.getDate() - 3);
        break;
      case '7D':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      default:
        return insights.filter((insight) => Boolean(parseTimelineRange(insight.Timeline)));
    }

    return insights.filter((insight) => {
      const range = parseTimelineRange(insight.Timeline);
      if (!range?.end) {
        return false;
      }

      return range.end >= cutoffDate;
    });
  }, [customEndDate, customStartDate, dateRange]);

  const handleCustomDateApply = () => {
    setDateRange('CUSTOM');
    setShowCustomDialog(false);
  };

  const normaliseInsights = useCallback((list: Insight[]) => {
    return list
      .filter((item) => item.Mentions > 0)
      .sort((a, b) => b.Mentions - a.Mentions);
  }, []);

  const filteredRawInsights = useMemo(
    () => (data ? filterByDateRange(data.Raw_insights ?? []) : []),
    [data, filterByDateRange]
  );
  const filteredFilteredInsights = useMemo(
    () => (data ? filterByDateRange(data.Filtered_Insights ?? []) : []),
    [data, filterByDateRange]
  );

  const normalisedRawInsights = useMemo(
    () => normaliseInsights(filteredRawInsights),
    [filteredRawInsights, normaliseInsights]
  );
  const normalisedFilteredInsights = useMemo(
    () => normaliseInsights(filteredFilteredInsights),
    [filteredFilteredInsights, normaliseInsights]
  );

  const insights = activeView === 'raw' ? normalisedRawInsights : normalisedFilteredInsights;
  const listViewKey = useMemo(
    () => `${activeView}-${dateRange}-${customStartDate || 'na'}-${customEndDate || 'na'}`,
    [activeView, customEndDate, customStartDate, dateRange]
  );
  const wordCloudData: WordData[] = useMemo(() => {
    if (!insights.length) {
      return [];
    }

    const aggregated = insights.reduce<Record<string, number>>((acc, insight) => {
      const topic = insight.Topic?.trim();
      if (!topic) {
        return acc;
      }

      const mentions = Number.isFinite(insight.Mentions) ? insight.Mentions : 0;
      if (mentions <= 0) {
        return acc;
      }

      acc[topic] = (acc[topic] ?? 0) + mentions;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(aggregated)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, WORD_CLOUD_LIMIT);
  }, [insights]);
  
  
  if (error && !isLoadingActiveDataset) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <BrandHeader />
        <div className="border-b border-gray-800"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-400">{error}</div>
        </div>
        <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
          <Taskbar />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <BrandHeader />
        <div className="border-b border-gray-800"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/80">
            <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <span className="text-sm tracking-wide uppercase">
              Loading {activeDataset?.label ?? 'dataset'}…
            </span>
          </div>
        </div>
        <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
          <Taskbar />
        </div>
      </div>
    );
  }


  const isFilteredView = activeView === 'filtered';

  const dashboardButtonBase = 'px-5 py-2 font-medium transition-colors';
  const insightToggleButtonBase = `${dashboardButtonBase} text-base`;

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Top left logo */}
      <BrandHeader />
      
      {/* Separator */}
      <div className="border-b border-gray-800"></div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col pt-4">
        {/* Dataset selector and view toggles */}
        <div className="mb-3 px-6 flex flex-wrap items-center justify-between gap-4 w-full">
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
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`${insightToggleButtonBase} ${
                viewMode === 'list'
                  ? 'bg-white text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('wordcloud')}
              className={`${insightToggleButtonBase} ${
                viewMode === 'wordcloud'
                  ? 'bg-white text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              Word Cloud
            </button>
            <div className="h-6 w-px bg-gray-700 mx-3" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('raw')}
              className={`${insightToggleButtonBase} ${
                activeView === 'raw'
                  ? 'bg-white text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              Raw Insights
            </button>
            <button
              onClick={() => setActiveView('filtered')}
              className={`${insightToggleButtonBase} ${
                activeView === 'filtered'
                  ? 'bg-white text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              Filtered Insights
            </button>
          </div>
        </div>
        
        {/* Full Width Separator */}
        <div className="border-b border-gray-800 mb-4"></div>

        {/* List View or Word Cloud */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 w-full">
          {viewMode === 'list' ? (
            <div key={listViewKey} className="flex-1 overflow-y-auto w-full">
              <div className="grid grid-cols-[60px_1fr_120px_160px] gap-4 px-6 py-3 text-gray-400 text-sm uppercase tracking-wide border-b border-gray-800 sticky top-0 bg-black">
                <span>#</span>
                <span>Topic</span>
                <span className="text-right">Mentions</span>
                <span className="text-right">Latest Timeline</span>
              </div>
              {insights.length ? (
                <ul className="divide-y divide-gray-800">
                  {insights.map((insight, index) => (
                    <li
                      key={`${insight.Topic}-${insight.Timeline}-${index}`}
                      className="grid grid-cols-[60px_1fr_120px_160px] gap-4 items-center px-6 py-4 hover:bg-gray-900/60"
                    >
                      <span className="text-gray-400">{index + 1}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white font-semibold truncate">{insight.Topic}</span>
                        {isFilteredView && insight.FilterType ? (
                          <span className="shrink-0 text-xs uppercase tracking-wide text-emerald-300/80 border border-emerald-400/40 px-2 py-0.5">
                            {insight.FilterType}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-right text-white font-semibold">{insight.Mentions}</span>
                      <span className="text-right text-gray-300">
                        {formatTimeline(insight.Timeline)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center text-gray-400">
                  No {datasetLabel.toLowerCase()} available for this range.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col pb-6 gap-4 w-full">
              <div className="flex-1 min-h-0 w-full px-6">
                <WordCloudChart data={wordCloudData} />
              </div>
              {wordCloudData.length ? (
                <div className="relative w-full">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="flex gap-3 min-w-max pb-2 px-6">
                      {wordCloudData.map((word) => (
                        <div
                          key={word.text}
                          className="flex items-center gap-2 bg-gray-900/60 px-4 py-2 border border-gray-800 text-white"
                        >
                          <span className="font-semibold uppercase tracking-tight">{word.text}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{word.value} mentions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-black via-black/70 to-transparent" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-black via-black/70 to-transparent" />
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400">
                  No topics available for the selected filters.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Date Range Selector */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-full mx-auto w-full px-6 py-4 relative">
          <div className="flex items-center justify-center">
            <div className="flex gap-3 items-center">
              {(['1D', '3D', '7D'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                  }}
                  className={`px-5 py-2 font-medium transition-colors border ${
                    dateRange === range
                      ? 'bg-white text-black border-white'
                      : 'bg-gray-800 text-white hover:bg-gray-700 border-gray-800'
                  }`}
                >
                  {range}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCustomDialog(true);
                }}
                className={`px-5 py-2 font-medium transition-colors border ${
                  dateRange === 'CUSTOM'
                    ? 'bg-white text-black border-white'
                    : 'bg-gray-800 text-white hover:bg-gray-700 border-gray-800'
                }`}
              >
                CUSTOM
              </button>
            </div>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
            {displayDateRange}
          </div>
        </div>
      </div>

      {/* Bottom taskbar */}
      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>

      {/* Custom Date Dialog - Rendered at top level to avoid clipping */}
      {showCustomDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-white text-xl font-bold mb-4">Custom Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black text-white border border-gray-700"
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black text-white border border-gray-700"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCustomDateApply}
                  className={`flex-1 ${dashboardButtonBase} font-semibold bg-white text-black hover:bg-gray-200`}
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowCustomDialog(false)}
                  className={`flex-1 ${dashboardButtonBase} font-semibold bg-gray-800 text-white hover:bg-gray-700`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
