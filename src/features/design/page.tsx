import { useState } from "react";
import { MainContent, MainLayout } from "@/components/layout";
import type { DesignOptions, PatternType } from "./types/design";
import Preview from "./components/Preview";
import Option from "./components/Option";

const DesignPage = () => {
  const [isPattern, setIsPattern] = useState<boolean>(false);
  const [horizontalCount, setHorizontalCount] = useState<number>(1);
  const [verticalCount, setVerticalCount] = useState<number>(1);
  const [imageSize, setImageSize] = useState<number>(100);
  const [position, setPosition] = useState<number>(0);
  const [verticalPosition, setVerticalPosition] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(0);
  const [patternType, setPatternType] = useState<PatternType>("normal");
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [gap, setGap] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [selectedFile2, setSelectedFile2] = useState<File | undefined>(
    undefined
  );
  const [color, setColor] = useState<string>("#000000");
  const [text, setText] = useState<string>("");

  const options: DesignOptions = {
    isPattern,
    horizontalCount,
    verticalCount,
    imageSize,
    position,
    verticalPosition,
    rotation,
    patternType,
    isLinked,
    gap,
    selectedFile,
    selectedFile2,
    color,
    text,
  };

  const stateSetters = {
    setIsPattern,
    setHorizontalCount,
    setVerticalCount,
    setImageSize,
    setPosition,
    setVerticalPosition,
    setRotation,
    setPatternType,
    setIsLinked,
    setGap,
    selectedFile: setSelectedFile,
    selectedFile2: setSelectedFile2,
    setColor,
    setText,
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 수선 주문 제출 로직
  };

  return (
    <MainLayout>
      <MainContent>
        <div className="max-w-6xl mx-auto py-8 px-4">
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽: 디자인 폼 */}
              <div className="lg:col-span-2">
                <Preview options={options} stateSetters={stateSetters} />
              </div>

              {/* 오른쪽: 옵션 폼 */}
              <div className="lg:col-span-1">
                <Option options={options} stateSetters={stateSetters} />
              </div>
            </div>
          </form>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default DesignPage;
