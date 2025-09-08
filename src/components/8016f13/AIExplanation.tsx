import * as React from "react";

export const AIExplanation: React.FC = () => {
  return (
    <div className="flex flex-col justify-center mt-8 w-full font-medium">
      <div className="flex gap-10 justify-between items-center w-full text-sm text-gray-500">
        <span className="text-gray-500">AI 智能解释</span>
        <span className="text-gray-500">API设置</span>
      </div>

      <div className="flex flex-col justify-center p-4 mt-2 w-full bg-white rounded-3xl border border-solid">
        <div className="flex gap-2 items-start w-full">
          <div className="flex gap-2.5 justify-center items-center px-3 py-1 text-xs leading-none text-gray-500 whitespace-nowrap bg-gray-100 border border-solid rounded-[99px]">
            <span className="text-gray-500">语境解释</span>
          </div>
          <p className="flex-1 shrink text-sm leading-5 text-gray-900 basis-6">
            "name" 在当前这句话的语境中的意思是名字名称
          </p>
        </div>

        <div className="flex gap-2 items-start mt-6 w-full whitespace-nowrap">
          <div className="flex gap-2.5 justify-center items-center px-3 py-1 text-xs leading-none text-gray-500 bg-gray-100 border border-solid rounded-[99px]">
            <span className="text-gray-500">整句翻译</span>
          </div>
          <p className="text-sm text-gray-900 w-[252px]">
            我的名字叫马可，我叫艾丽卡
          </p>
        </div>
      </div>
    </div>
  );
};
