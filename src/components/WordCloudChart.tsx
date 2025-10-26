'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WordCloud from 'react-d3-cloud';

export interface WordData {
  text: string;
  value: number;
}

interface WordCloudChartProps {
  data: WordData[];
}

/**
 * Responsive word cloud wrapper around react-d3-cloud.
 * Keeps the chart sized to its container and applies a simple color scale.
 */
function WordCloudChartComponent({ data }: WordCloudChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const preparedData = useMemo(() => {
    return data
      .map((entry) => ({
        text: entry.text?.trim() ?? '',
        value: Number.isFinite(entry.value) ? entry.value : 0,
      }))
      .filter((entry) => entry.text && entry.value > 0);
  }, [data]);

  const maxValue = useMemo(() => {
    return preparedData.reduce((max, entry) => Math.max(max, entry.value), 0);
  }, [preparedData]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      const nextWidth = Math.max(Math.floor(width), 200);
      const nextHeight = Math.max(Math.floor(height), 200);

      setDimensions((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const fontSize = useCallback(
    (word: WordData) => {
      if (!maxValue) return 0;
      const normalized = word.value / maxValue;
      const minSize = 14;
      const maxSize = 58;
      return minSize + normalized * (maxSize - minSize);
    },
    [maxValue]
  );

  const fill = useCallback(
    (word: WordData) => {
      if (!maxValue) return '#fca5a5';
      const normalized = word.value / maxValue;
      const hue = 0; // red
      const saturation = 80;
      const lightness = Math.round(85 - normalized * 45);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },
    [maxValue]
  );

  const rotate = useCallback(() => 0, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      {!preparedData.length && (
        <div className="flex h-full w-full items-center justify-center text-gray-500">
          No data available for this range.
        </div>
      )}

      {preparedData.length > 0 && dimensions.width > 0 && dimensions.height > 0 && (
        <WordCloud
          width={dimensions.width}
          height={dimensions.height}
          data={preparedData}
          fontSize={fontSize}
          rotate={rotate}
          padding={3}
          spiral="rectangular"
          random={Math.random}
          fill={fill}
        />
      )}

      {preparedData.length > 0 && (dimensions.width === 0 || dimensions.height === 0) && (
        <div className="flex h-full w-full items-center justify-center text-gray-500">
          Preparing word cloud...
        </div>
      )}
    </div>
  );
}

export default memo(WordCloudChartComponent);
