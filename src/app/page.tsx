'use client';

import Taskbar from '@/components/Taskbar';
import WordHeatMap from '@/components/WordHeatMap';

export default function Home() {
  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Top left logo */}
      <div className="px-6 py-4">
        <h1 className="text-white text-lg">BLACK SWAN</h1>
      </div>
      
      {/* Separator */}
      <div className="border-b border-gray-800"></div>

      {/* Main content area with heat map */}
      <div className="flex-1 overflow-hidden">
        <WordHeatMap />
      </div>

      {/* Bottom taskbar */}
      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>
    </div>
  );
}
