import * as React from "react";

export const VideoPlayer: React.FC = () => {
  return (
    <section className="px-0.5 w-full leading-none text-black whitespace-nowrap max-md:max-w-full">
      <div className="flex flex-col justify-center items-center px-20 py-80 bg-gray-100 rounded-[32px] max-md:px-5 max-md:py-24 max-md:max-w-full">
        <div className="flex flex-col justify-center mb-0 max-w-full w-[400px] max-md:mb-2.5">
          <h2 className="text-4xl text-center">视频显示区域</h2>
          <p className="mt-4 text-2xl">拖拽视频和字幕文件在此处即可加载</p>
        </div>
      </div>
    </section>
  );
};
