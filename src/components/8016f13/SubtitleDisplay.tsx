"use client";
import * as React from "react";
import { Toggle } from "./Toggle";

export const SubtitleDisplay: React.FC = () => {
  const [bilingualEnabled, setBilingualEnabled] = React.useState(true);

  return (
    <div className="flex flex-col mt-5 w-full max-md:max-w-full">
      <div className="flex flex-wrap gap-10 justify-between items-center w-full max-md:max-w-full">
        <span className="text-sm font-medium text-gray-500">字幕显示</span>
        <Toggle
          enabled={bilingualEnabled}
          onChange={setBilingualEnabled}
          label="双语字幕"
        />
      </div>

      <div className="flex flex-col items-center self-center mt-5 font-medium text-gray-900">
        <div className="flex gap-1.5 justify-center items-center text-2xl">
          <span className="text-gray-900">my</span>
          <span className="flex gap-2.5 justify-center items-center px-1.5 text-white whitespace-nowrap bg-blue-600 rounded-xl">
            name
          </span>
          <span className="text-gray-900">is Marco and I'm Erica</span>
        </div>
        <p className="mt-5 text-base text-gray-900">
          我的名字叫马可，我叫艾丽卡
        </p>
      </div>
    </div>
  );
};
