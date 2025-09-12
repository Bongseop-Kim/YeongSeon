import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { DesignOptions } from "../types/design";
import { ImagePicker } from "@/components/composite/image-picker";

interface OptionPanelProps {
  options: DesignOptions;
  stateSetters: any;
}

const Option = ({ options, stateSetters }: OptionPanelProps) => {
  const handleFileUpload = (
    file: File | undefined,
    field: "selectedFile" | "selectedFile2"
  ) => {
    stateSetters[field](file);
  };

  const PatternTypeSelector = () => {
    return (
      <div className="space-y-2">
        <Label className="text-sm">타입</Label>
        <div className="flex rounded-lg border bg-muted p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1 text-sm transition-all ${
              options.patternType === "normal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => stateSetters.setPatternType("normal")}
          >
            정방향
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-1 text-sm transition-all ${
              options.patternType === "grid1"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => stateSetters.setPatternType("grid1")}
          >
            격자타입
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      {/* 미리보기 이미지 */}
      <div className="space-y-2">
        <Label>이미지</Label>
        <div className="flex gap-2">
          <ImagePicker
            selectedFile={options.selectedFile}
            onFileChange={(file) => handleFileUpload(file, "selectedFile")}
            id="image-picker"
          />
          {options.isPattern && (
            <ImagePicker
              selectedFile={options.selectedFile2}
              onFileChange={(file) => handleFileUpload(file, "selectedFile2")}
              id="image-picker2"
            />
          )}
        </div>
        <input
          type="file"
          id="fileUpload"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            handleFileUpload(e.target.files?.[0], "selectedFile")
          }
        />
        <input
          type="file"
          id="fileUpload2"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            handleFileUpload(e.target.files?.[0], "selectedFile2")
          }
        />
      </div>

      {/* 텍스트 로고 */}
      <div className="space-y-2">
        <Label className="text-sm">텍스트 로고</Label>
        <Input
          value={options.text}
          onChange={(e) => stateSetters.setText(e.target.value)}
          placeholder="텍스트를 입력하세요"
        />
      </div>

      {/* 패턴 체크박스 */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="pattern"
          checked={options.isPattern}
          onCheckedChange={(checked) => stateSetters.setIsPattern(!!checked)}
        />
        <Label htmlFor="pattern" className="text-sm cursor-pointer">
          패턴
        </Label>
      </div>

      {/* 색상 */}
      <div className="space-y-2">
        <Label className="text-sm">색상</Label>
        <div className="flex items-center space-x-2">
          <Input
            type="color"
            value={options.color}
            onChange={(e) => stateSetters.setColor(e.target.value)}
            className="w-12 h-8 p-1 border rounded"
          />
          <Input
            type="text"
            value={options.color}
            onChange={(e) => stateSetters.setColor(e.target.value)}
            className="flex-1"
            placeholder="#000000"
          />
        </div>
        {/* 색상 팔레트 */}
        <div className="grid grid-cols-5 gap-1">
          {[
            "#2e2e2e",
            "#868e96",
            "#fa5252",
            "#e64980",
            "#be4bdb",
            "#7950f2",
            "#4c6ef5",
            "#228be6",
            "#15aabf",
            "#12b886",
          ].map((color) => (
            <button
              key={color}
              type="button"
              className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => stateSetters.setColor(color)}
            />
          ))}
        </div>
      </div>

      {/* 크기 조절 */}
      <div className="space-y-2">
        <Label className="text-sm">이미지 크기</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[options.imageSize]}
            onValueChange={([value]) => stateSetters.setImageSize(value)}
            min={15}
            max={50}
            step={1}
            className="flex-1"
          />
          <Input
            type="number"
            value={options.imageSize}
            onChange={(e) => {
              const value = Number(e.target.value);
              stateSetters.setImageSize(value);
            }}
            min={20}
            max={50}
            className="w-16"
          />
        </div>
      </div>

      {/* 기울기 */}
      <div className="space-y-2">
        <Label className="text-sm">기울기</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[options.rotation]}
            onValueChange={([value]) => stateSetters.setRotation(value)}
            min={-180}
            max={180}
            step={1}
            className="flex-1"
          />
          <Input
            type="number"
            value={options.rotation}
            onChange={(e) => stateSetters.setRotation(Number(e.target.value))}
            min={-180}
            max={180}
            className="w-16"
          />
        </div>
      </div>

      {/* 패턴 관련 옵션들 */}
      {options.isPattern && (
        <div className="space-y-4 pt-4 border-t">
          {/* 간격 */}
          <div className="space-y-2">
            <Label className="text-sm">간격</Label>
            <div className="flex items-center space-x-2">
              <Slider
                value={[options.gap]}
                onValueChange={([value]) => stateSetters.setGap(value)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={options.gap}
                onChange={(e) => stateSetters.setGap(Number(e.target.value))}
                min={0}
                max={100}
                className="w-16"
              />
            </div>
          </div>

          {/* 가로 이동 */}
          <div className="space-y-2">
            <Label className="text-sm">가로 이동</Label>
            <div className="flex items-center space-x-2">
              <Slider
                value={[options.position]}
                onValueChange={([value]) => stateSetters.setPosition(value)}
                min={-30}
                max={30}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={options.position}
                onChange={(e) =>
                  stateSetters.setPosition(Number(e.target.value))
                }
                min={-30}
                max={30}
                className="w-16"
              />
            </div>
          </div>

          {/* 세로 이동 */}
          <div className="space-y-2">
            <Label className="text-sm">세로 이동</Label>
            <div className="flex items-center space-x-2">
              <Slider
                value={[options.verticalPosition]}
                onValueChange={([value]) =>
                  stateSetters.setVerticalPosition(value)
                }
                min={-100}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={options.verticalPosition}
                onChange={(e) =>
                  stateSetters.setVerticalPosition(Number(e.target.value))
                }
                min={-100}
                max={100}
                className="w-16"
              />
            </div>
          </div>

          {/* 타입 선택 */}
          <PatternTypeSelector />
        </div>
      )}
    </Card>
  );
};

export default Option;
