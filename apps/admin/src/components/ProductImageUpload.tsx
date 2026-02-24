import { useState } from "react";
import { Upload, Modal, message } from "antd";
import {
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  StarFilled,
} from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload";
import type { useImageKitUpload } from "@/hooks/useImageKitUpload";

type ImageUploadHook = ReturnType<typeof useImageKitUpload>;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

interface ProductImageUploadProps {
  fileList: ImageUploadHook["fileList"];
  uploading: ImageUploadHook["uploading"];
  customRequest: ImageUploadHook["customRequest"];
  onChange: ImageUploadHook["handleChange"];
  onRemove: ImageUploadHook["handleRemove"];
  onMove: ImageUploadHook["moveFile"];
}

export const ProductImageUpload = ({
  fileList,
  uploading,
  customRequest,
  onChange,
  onRemove,
  onMove,
}: ProductImageUploadProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const beforeUpload = (file: RcFile) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error("JPG, PNG, GIF, WebP 파일만 업로드할 수 있습니다.");
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error("파일 크기는 10MB 이하여야 합니다.");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || file.thumbUrl || "");
    setPreviewOpen(true);
  };

  const itemRender = (
    originNode: React.ReactElement,
    file: UploadFile,
    _fileList: UploadFile[],
    _actions: { remove: () => void }
  ) => {
    const index = fileList.findIndex((f) => f.uid === file.uid);
    const isFirst = index === 0;
    const isLast = index === fileList.length - 1;

    return (
      <div style={{ position: "relative" }}>
        {originNode}
        {isFirst && file.status === "done" && (
          <StarFilled
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              color: "#faad14",
              fontSize: 16,
              zIndex: 1,
              filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))",
            }}
          />
        )}
        {file.status === "done" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            <LeftOutlined
              onClick={() => !isFirst && onMove(index, index - 1)}
              style={{
                cursor: isFirst ? "not-allowed" : "pointer",
                opacity: isFirst ? 0.3 : 1,
                fontSize: 12,
              }}
            />
            <RightOutlined
              onClick={() => !isLast && onMove(index, index + 1)}
              style={{
                cursor: isLast ? "not-allowed" : "pointer",
                opacity: isLast ? 0.3 : 1,
                fontSize: 12,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        customRequest={customRequest}
        beforeUpload={beforeUpload}
        onChange={onChange}
        onPreview={handlePreview}
        onRemove={onRemove}
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp"
        itemRender={itemRender}
      >
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>
            {uploading ? "업로드 중..." : "이미지 추가"}
          </div>
        </div>
      </Upload>

      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img
          alt="preview"
          style={{ width: "100%" }}
          src={previewImage}
        />
      </Modal>
    </>
  );
};
