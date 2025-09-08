import * as React from "react";
import { WordDefinitions } from "./WordDefinitions";
import { AIExplanation } from "./AIExplanation";
import { MemoryHistory } from "./MemoryHistory";

export const WordLookupPanel: React.FC = () => {
  return (
    <aside className="flex flex-col justify-center mt-2 max-md:mt-10">
      <div className="flex flex-col justify-center w-full">
        <header className="flex gap-10 justify-between items-center w-full">
          <div className="flex flex-col justify-center whitespace-nowrap w-[87px]">
            <h3 className="text-2xl font-medium text-gray-900">name</h3>
            <div className="flex gap-2 justify-center items-center mt-1 w-full text-xs leading-none text-gray-500">
              <div className="flex gap-2.5 justify-center items-center px-2 py-1 bg-white border border-solid rounded-[999px]">
                <span className="text-gray-500">美式</span>
              </div>
              <span className="text-gray-500">/neɪm/</span>
            </div>
          </div>

          <div className="w-5">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/6a6bc9ce125087a746e54f4260a190184cc22da7?placeholderIfAbsent=true&apiKey=7f4fd55f6a5a46ecad117eb635b26fd2"
              alt="Audio pronunciation"
              className="object-contain w-5 aspect-square"
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/7225697812bb1901148bd46b893e56da836f73e1?placeholderIfAbsent=true&apiKey=7f4fd55f6a5a46ecad117eb635b26fd2"
              alt="Additional options"
              className="object-contain mt-2 w-5 aspect-square"
            />
          </div>
        </header>

        <WordDefinitions />
      </div>

      <AIExplanation />
      <MemoryHistory />
    </aside>
  );
};
