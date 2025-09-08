"use client";
import * as React from "react";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label }) => {
  return (
    <div className="flex gap-2 justify-center items-center">
      {label && (
        <span className="text-sm font-medium text-gray-500">{label}</span>
      )}
      <button
        className="flex items-center w-9 min-h-5 rounded-[50px]"
        onClick={() => onChange(!enabled)}
        role="switch"
        aria-checked={enabled}
      >
        <div
          className={`flex gap-2.5 items-center p-0.5 w-9 min-h-5 rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </button>
    </div>
  );
};
