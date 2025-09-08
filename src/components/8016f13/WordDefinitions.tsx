import * as React from "react";

interface DefinitionItem {
  type: string;
  definition: string;
}

const definitions: DefinitionItem[] = [
  { type: "n.", definition: "名称；名字；名声；名誉" },
  { type: "v.", definition: "命名；任命；给…取名；说出…的名称" },
  { type: "adj.", definition: "著名的；(作品等)据以取名的" },
  { type: "web.", definition: "姓名；品名；产品名称；" },
];

export const WordDefinitions: React.FC = () => {
  return (
    <div className="flex flex-col justify-center p-4 mt-2 w-full font-medium whitespace-nowrap bg-white rounded-3xl border border-solid">
      {definitions.map((item, index) => (
        <div
          key={index}
          className={`flex gap-2 items-center w-full ${index > 0 ? "mt-6" : ""}`}
        >
          <div className="flex gap-2.5 justify-center items-center px-3 py-1 text-xs leading-none text-gray-500 bg-gray-100 border border-solid rounded-[99px] w-[54px]">
            <span className="text-gray-500">{item.type}</span>
          </div>
          <div className="flex-1 shrink text-sm text-gray-900 basis-6">
            {item.definition}
          </div>
        </div>
      ))}
    </div>
  );
};
