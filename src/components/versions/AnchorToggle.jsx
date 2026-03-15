import React from 'react';
import { usePipeline, ANCHOR_VERSIONS } from '../../context/PipelineContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AnchorToggle = () => {
  const { anchorVersion, setAnchorVersion } = usePipeline();

  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-start">
      <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-tight">Anchor</span>
      <div className="flex bg-white rounded-md shadow-sm">
        {ANCHOR_VERSIONS.map((v) => (
          <button
            key={v}
            onClick={() => setAnchorVersion(v)}
            className={cn(
              "px-3 py-1 text-sm font-medium transition-all duration-200 first:rounded-l-md last:rounded-r-md",
              anchorVersion === v 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnchorToggle;
