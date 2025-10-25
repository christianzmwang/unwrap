'use client';

import Taskbar from '@/components/Taskbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top left logo */}
      <div className="p-6">
        <h1 className="text-white text-2xl font-bold">BLACK SWAN</h1>
      </div>

      {/* Main content area (empty) */}
      <div className="flex-1"></div>

      {/* Bottom taskbar */}
      <div className="border-t border-gray-800 bg-black/80 backdrop-blur">
        <Taskbar />
      </div>
    </div>
  );
}
