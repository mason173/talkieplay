import * as React from "react";
import { VideoPlayer } from "./VideoPlayer";
import { SubtitleDisplay } from "./SubtitleDisplay";
import { WordLookupPanel } from "./WordLookupPanel";
import { VideoControls } from "./VideoControls";

export const VideoLearningInterface: React.FC = () => {
  return (
    <main className="overflow-hidden px-20 pt-20 pb-5 bg-white max-md:px-5">
      <div className="max-md:max-w-full">
        <div className="flex gap-5 max-md:flex-col">
          <div className="w-[77%] max-md:ml-0 max-md:w-full">
            <div className="grow max-md:mt-10 max-md:max-w-full">
              <VideoPlayer />
              <SubtitleDisplay />
            </div>
          </div>

          <div className="ml-5 w-[23%] max-md:ml-0 max-md:w-full">
            <WordLookupPanel />
          </div>
        </div>
      </div>

      <VideoControls />
    </main>
  );
};

export default VideoLearningInterface;
