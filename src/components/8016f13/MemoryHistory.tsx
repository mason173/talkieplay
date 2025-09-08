import * as React from "react";

export const MemoryHistory: React.FC = () => {
  return (
    <div className="flex flex-col justify-center mt-8 w-full">
      <div className="flex gap-2 items-center w-full text-sm font-medium text-gray-500 whitespace-nowrap">
        <span className="text-gray-500">记忆历史</span>
      </div>

      <div className="flex flex-col justify-center p-4 mt-2 w-full bg-white rounded-3xl border border-solid">
        <div className="flex gap-2 justify-center items-center w-full font-medium">
          <div className="flex gap-2.5 justify-center items-center px-3 py-1 text-xs leading-none text-gray-500 whitespace-nowrap bg-gray-100 border border-solid rounded-[99px]">
            <span className="text-gray-500">已查</span>
          </div>
          <span className="flex-1 shrink text-sm text-gray-900 basis-6">
            3 次
          </span>
        </div>

        <div className="flex gap-10 justify-between items-center mt-6 w-full">
          <div className="flex gap-2 items-start font-medium">
            <div className="flex gap-2.5 justify-center items-center px-3 py-1 text-xs leading-none text-gray-500 whitespace-nowrap bg-gray-100 border border-solid rounded-[99px]">
              <span className="text-gray-500">相识</span>
            </div>
            <span className="text-sm text-gray-900">28 天</span>
          </div>
          <time className="text-xs text-gray-500">2025-08-28</time>
        </div>
      </div>
    </div>
  );
};
