'use client';

import { useEffect, useState } from 'react';

interface Insight {
  Topic: string;
  Timeline: string;
  Mentions: number;
}

interface HeatMapData {
  Subreddit: string;
  Raw_insights: Insight[];
  Adjusted_Insights: Insight[];
}

type DateRange = '7D' | '1M' | '3M' | '6M' | '1Y' | 'CUSTOM';

export default function WordHeatMap() {
  const [data, setData] = useState<HeatMapData | null>(null);
  const [activeView, setActiveView] = useState<'raw' | 'adjusted'>('raw');
  const [dateRange, setDateRange] = useState<DateRange>('1M');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const parseTimeline = (value: string) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatTimeline = (value: string) => {
    const parsed = parseTimeline(value);
    return parsed ? parsed.toLocaleDateString() : 'Unknown date';
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const cacheBuster = Date.now().toString();
      const url = `/data/testdata.json?ts=${cacheBuster}`;

      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload: HeatMapData = await res.json();
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Failed to load heatmap data', err);
          }
          setError('Failed to load heatmap data. Please refresh.');
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filterByDateRange = (insights: Insight[]) => {
    if (!insights.length) {
      return [];
    }

    if (dateRange === 'CUSTOM') {
      const start = parseTimeline(customStartDate);
      const end = parseTimeline(customEndDate);

      if (!start || !end || start > end) {
        return [];
      }

      return insights.filter((insight) => {
        const timelineDate = parseTimeline(insight.Timeline);
        return timelineDate ? timelineDate >= start && timelineDate <= end : false;
      });
    }

    const now = new Date();
    const cutoffDate = new Date(now);

    switch (dateRange) {
      case '7D':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return insights.filter((insight) => parseTimeline(insight.Timeline));
    }

    return insights.filter((insight) => {
      const timelineDate = parseTimeline(insight.Timeline);
      return timelineDate ? timelineDate >= cutoffDate : false;
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!data || !mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const allInsights = activeView === 'raw' ? data.Raw_insights : data.Adjusted_Insights;
  const filteredInsights = filterByDateRange(allInsights);
  
  // Filter to only show words with significant mentions and cap at 30 words max
  const topMention = filteredInsights.length ? Math.max(...filteredInsights.map(i => i.Mentions)) : 0;
  const minMentions = filteredInsights.length ? Math.max(5, topMention * 0.3) : 0;
  const insights = filteredInsights
    .filter(i => i.Mentions >= (filteredInsights.length ? minMentions : 0))
    .sort((a, b) => b.Mentions - a.Mentions) // Sort by mentions descending
    .slice(0, 30); // Cap at 30 words maximum

  const handleCustomDateApply = () => {
    setDateRange('CUSTOM');
    setShowCustomDialog(false);
  };

  return (
    <div className="w-full h-full flex flex-col pt-4 pb-8">
      {/* Subreddit Section with Buttons */}
      <div className="mb-3 py-2 px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white text-lg">Subreddit:</span>
          <span className="text-white text-xl font-semibold">r/{data.Subreddit}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('raw')}
            className={`px-4 py-2 ${
              activeView === 'raw' 
                ? 'bg-white text-black' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Raw Insights
          </button>
          <button
            onClick={() => setActiveView('adjusted')}
            className={`px-4 py-2 ${
              activeView === 'adjusted' 
                ? 'bg-white text-black' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Adjusted Insights
          </button>
        </div>
      </div>
      
      {/* Full Width Separator */}
      <div className="border-b border-gray-800 mb-4"></div>

      {/* List View */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6">
        <div className="flex-1 overflow-y-auto border border-gray-800">
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
                  <span className="text-white font-semibold truncate">{insight.Topic}</span>
                  <span className="text-right text-white font-semibold">{insight.Mentions}</span>
                  <span className="text-right text-gray-300">
                    {formatTimeline(insight.Timeline)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center text-gray-400">
              No insights available for this range.
            </div>
          )}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="border-t border-gray-800 pt-6 px-6">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {(['7D', '1M', '3M', '6M', '1Y', 'CUSTOM'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => {
                if (range === 'CUSTOM') {
                  setShowCustomDialog(true);
                } else {
                  setDateRange(range);
                }
              }}
              className={`px-6 py-2 font-semibold transition-colors ${
                dateRange === range
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Custom Date Dialog */}
        {showCustomDialog && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 border border-gray-700 max-w-md w-full">
              <h3 className="text-white text-xl font-bold mb-4">Custom Date Range</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700"
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleCustomDateApply}
                    className="flex-1 px-4 py-2 bg-white text-black font-semibold hover:bg-gray-200"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowCustomDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white font-semibold hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
