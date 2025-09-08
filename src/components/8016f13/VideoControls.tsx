import * as React from "react";

export const VideoControls: React.FC = () => {
  return (
    <footer className="flex flex-wrap gap-10 justify-between items-center px-6 py-4 mt-16 w-full bg-white rounded-3xl border border-solid max-w-[1184px] max-md:px-5 max-md:mt-10 max-md:max-w-full">
      <div className="flex gap-3 justify-center items-center text-sm font-medium leading-5 text-gray-500 whitespace-nowrap min-w-60">
        <div className="flex shrink-0 w-12 h-12 rounded-xl bg-zinc-300" />
        <span className="text-gray-500 w-[194px]">
          Better.Call.Saul.S01E06.1080p.BluRay.x265-RARBG
        </span>
      </div>

      <div className="flex gap-10 justify-center items-center">
        <button aria-label="Previous">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/8232207d962621db992217de8a22a0439609864b?placeholderIfAbsent=true&apiKey=7f4fd55f6a5a46ecad117eb635b26fd2"
            alt="Previous"
            className="object-contain shrink-0 w-6 aspect-square"
          />
        </button>

        <button aria-label="Play/Pause">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/c900c25ef55651e28f5d07cbc83c2d418eac641a?placeholderIfAbsent=true&apiKey=7f4fd55f6a5a46ecad117eb635b26fd2"
            alt="Play/Pause"
            className="object-contain shrink-0 w-12 aspect-square"
          />
        </button>

        <button aria-label="Next">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/23058abae57aa4fae371736ec7bf9418c81bf6f4?placeholderIfAbsent=true&apiKey=7f4fd55f6a5a46ecad117eb635b26fd2"
            alt="Next"
            className="object-contain shrink-0 w-6 aspect-square"
          />
        </button>
      </div>

      <button className="text-sm font-medium text-right text-gray-500 w-[254px]">
        更多设置
      </button>
    </footer>
  );
};
