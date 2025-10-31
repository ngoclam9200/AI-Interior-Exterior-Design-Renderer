import React, { useState } from "react";
import { Icon } from "./icons";
import { generateImageFromText, generateImages } from "../services/geminiService";
import type { SourceImage } from "../types";
 

// --- Reusable Components (Copied from App.tsx for encapsulation) ---

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/25 p-6 rounded-xl">
    <h2 className="text-lg font-semibold text-slate-300 mb-4">{title}</h2>
    {children}
  </div>
);

const ImageUpload: React.FC<{
  sourceImage: SourceImage | null;
  onImageUpload: (image: SourceImage) => void;
  onRemove: () => void;
  title?: string;
  heightClass?: string;
}> = ({ sourceImage, onImageUpload, onRemove, title = "Nhấp hoặc kéo tệp vào đây", heightClass = "h-48" }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        if (base64) {
          onImageUpload({ base64, mimeType: file.type });
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert("Vui lòng tải lên một tệp ảnh hợp lệ (PNG, JPG, WEBP).");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed rounded-lg p-4 flex items-center justify-center ${heightClass} mb-4 hover:border-indigo-500 transition-colors cursor-pointer ${
          isDraggingOver ? "border-indigo-500 bg-slate-700/50" : "border-slate-600"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {sourceImage ? (
          <>
            <img src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`} alt="Source" className="max-h-full max-w-full object-contain rounded" />
            <button onClick={handleRemove} className="absolute top-1 right-1 bg-black/50 rounded-full text-white hover:bg-black/80 p-0.5 transition-colors opacity-0 group-hover:opacity-100 z-10" aria-label="Remove source image">
              <Icon name="x-circle" className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="text-center text-slate-400 pointer-events-none">
            <p>{title}</p>
            <p className="text-xs">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
    </div>
  );
};

const ImageViewerModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-transform duration-200 hover:scale-110 z-10" aria-label="Close">
          <Icon name="x-mark" className="w-6 h-6" />
        </button>
        <div className="p-2 flex-grow overflow-auto flex items-center justify-center">
          <img src={imageUrl} alt="Fullscreen view" className="max-w-full max-h-full object-contain rounded-md" />
        </div>
      </div>
    </div>
  );
};

// --- Task Definitions ---

type TaskService = "generateImageFromText" | "generateImages" | "generateImagesWithReference" | "generateTwoImages";

interface PredefinedPrompt {
  label: string;
  value: string;
}

interface UtilityTaskDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  inputs: 0 | 1 | 2;
  inputLabels?: string[];
  promptPlaceholder: string;
  service: TaskService;
  promptEngineer?: (prompt: string) => string;
  predefinedPrompts?: PredefinedPrompt[];
}

const UTILITY_TASKS: UtilityTaskDef[] = [
  {
    id: "render_from_moodboard",
    name: "Tạo 3D Render từ Moodboard",
    description: "Tải lên moodboard và mô tả căn phòng để tạo ảnh render 3D.",
    icon: "cube",
    inputs: 1,
    inputLabels: ["Ảnh Moodboard"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: phòng khách hiện đại, ánh sáng ban ngày",
    promptEngineer: (p) => `Tạo một ảnh render 3D nội thất siêu thực tế của một căn phòng dựa trên bảng vật liệu, màu sắc và phong cách từ hình ảnh moodboard được cung cấp. Yêu cầu của người dùng là: "${p}".`,
  },
  {
    id: "change_style",
    name: "Đổi Style Công Trình",
    description: "Giữ nguyên kiến trúc từ ảnh gốc, nhưng áp dụng phong cách từ ảnh tham khảo.",
    icon: "arrows-right-left",
    inputs: 2,
    inputLabels: ["Ảnh Công Trình Gốc", "Ảnh Style Tham Khảo"],
    service: "generateImagesWithReference",
    promptPlaceholder: "Ví dụ: áp dụng style hoàng hôn vào ban ngày",
    promptEngineer: (p) =>
      `The user's prompt is: "${p}". You are creating a realistic architectural render. The first image is the architectural sketch. You MUST use the exact structure, form, and layout from this first sketch. The second image is a reference for style ONLY. You must apply the mood, lighting, and color palette from the second image to the room from the first sketch. It is forbidden to copy any shapes, objects, architectural elements, or scene composition (like window frames or foreground elements) from the second style-reference image. The final render must be an interior shot based on the user's prompt.`,
  },
  {
    id: "change_interior_style",
    name: "Đổi Style Nội Thất",
    description: "Giữ nguyên bố cục phòng, chỉ thay đổi style nội thất theo mô tả.",
    icon: "sparkles",
    inputs: 1,
    inputLabels: ["Ảnh Nội Thất Gốc"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: đổi thành phong cách tân cổ điển với tông màu vàng gold",
    promptEngineer: (p: string) =>
      `You are an expert interior designer AI. The user has provided an image of a room. Your task is to re-render this exact room, keeping the layout, camera angle, and architectural elements (walls, windows, doors) the same, but completely changing the interior design style based on the user's text prompt. The user's request is: "${p}". Do not change the structure of the room.`,
    predefinedPrompts: [
      { label: "Phong cách Tối giản (Minimalism)", value: "đổi style của căn phòng này thành phong cách Tối giản (Minimalism)" },
      { label: "Phong cách Hiện đại (Modern)", value: "đổi style của căn phòng này thành phong cách Hiện đại (Modern)" },
      { label: "Phong cách Bắc Âu (Scandinavian)", value: "đổi style của căn phòng này thành phong cách Bắc Âu (Scandinavian)" },
      { label: "Phong cách Công nghiệp (Industrial)", value: "đổi style của căn phòng này thành phong cách Công nghiệp (Industrial)" },
      { label: "Phong cách Wabi-sabi", value: "đổi style của căn phòng này thành phong cách Wabi-sabi" },
      { label: "Phong cách Bohemian", value: "đổi style của căn phòng này thành phong cách Bohemian" },
      { label: "Phong cách Tân cổ điển (Neoclassical)", value: "đổi style của căn phòng này thành phong cách Tân cổ điển (Neoclassical)" },
      { label: "Phong cách Coastal (Ven biển)", value: "đổi style của căn phòng này thành phong cách Coastal (Ven biển)" },
      { label: "Phong cách Mid-Century Modern", value: "đổi style của căn phòng này thành phong cách Mid-Century Modern" },
      { label: "Phong cách Art Deco", value: "đổi style của căn phòng này thành phong cách Art Deco" },
    ],
  },
  {
    id: "insert_building",
    name: "Chèn công trình vào hiện trạng",
    description: "Ghép ảnh công trình của bạn vào một bức ảnh nền hiện trạng một cách chân thực.",
    icon: "photo",
    inputs: 2,
    inputLabels: ["Ảnh Công Trình (nền trắng)", "Ảnh Hiện Trạng"],
    service: "generateImagesWithReference",
    promptPlaceholder: "Ví dụ: đặt vào khu đất trống, điều chỉnh ánh sáng cho phù hợp, bóng đổ mềm",
    promptEngineer: (p: string) =>
      `You are an expert architectural visualizer and photo editor. The user has provided two images. The first image is an architectural building, likely with a plain background. The second image is a photo of the existing site/location. Your task is to seamlessly photoshop the building from the first image into the site from the second image. Pay close attention to scale, perspective, lighting, and shadows to make the composition look photorealistic. The user's specific instructions are: "${p}".`,
    predefinedPrompts: [
      {
        label: "Chèn nhà vào vùng đỏ (ảnh thật)",
        value: "Place the house in img 2 into the red zone in the img 1. and turn it into a real photo.",
      },
      {
        label: "Chèn ảnh 2D vào vùng đỏ (thành 3D)",
        value: "Place the 2d photo in img 2 into the red zone in the img 1. and turn it into a 3d real photo.",
      },
    ],
  },
  {
    id: "perspective_from_plan",
    name: "Tạo phối cảnh từ tổng thể",
    description: "Tải lên bản vẽ tổng thể có đánh dấu hướng nhìn để tạo góc phối cảnh.",
    icon: "viewfinder",
    inputs: 1,
    inputLabels: ["Bản vẽ tổng thể (có đánh dấu)"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: render 3D, phong cách hiện đại, buổi chiều nắng",
    promptEngineer: (p: string) =>
      `The user has provided a 2D master plan image that includes hand-drawn lines or arrows indicating a specific camera position and viewing direction. Your task is to interpret this drawing and generate a photorealistic 3D perspective view from that exact angle. Create a full 3D scene based on the layout in the plan. The user's specific request for style and mood is: "${p}".`,
  },
  {
    id: "3d_to_2d",
    name: "Biến ảnh 3D thành bản vẽ 2D",
    description: "Chuyển đổi một ảnh render 3D thành một bản vẽ kỹ thuật dạng đường nét.",
    icon: "pencil",
    inputs: 1,
    inputLabels: ["Ảnh Render 3D"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: bản vẽ mặt đứng chính diện, nét mảnh",
    promptEngineer: (p) => `Chuyển đổi hình ảnh 3D siêu thực này thành một bản vẽ kiến trúc 2D dạng đường nét kỹ thuật. Giữ lại tất cả các chi tiết và tỷ lệ một cách chính xác. Yêu cầu cụ thể của người dùng là: "${p}".`,
    predefinedPrompts: [
      {
        label: "Tạo 4 góc nhìn (Trước, Sau, Trái, Trên)",
        value: "Sử dụng ảnh kiến ​​trúc được cung cấp làm tham chiếu. Tạo các góc nhìn Mặt trước, Mặt sau, Trái, Trên trên nền trắng. Khoảng cách đều nhau.",
      },
    ],
  },
  {
    id: "color_floorplan",
    name: "Đổ màu & bóng cho Floorplan",
    description: "Thêm màu sắc, vật liệu và bóng đổ để floorplan 2D trông chuyên nghiệp hơn.",
    icon: "brush",
    inputs: 1,
    inputLabels: ["Ảnh Floorplan 2D"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: sàn gỗ, tường trắng, thêm cây xanh",
    promptEngineer: (p) =>
      `Render một phiên bản chất lượng cao của floorplan 2D này với góc nhìn từ trên xuống. Thêm vật liệu thực tế (như gỗ cho sàn, gạch cho phòng tắm) và bóng đổ mềm để tạo cảm giác chiều sâu. Không chuyển đổi nó thành dạng xem phối cảnh 3D. Yêu cầu của người dùng là: "${p}".`,
  },
  {
    id: "image_to_3d_model",
    name: "Ảnh thành Mô hình 3D",
    description: "Biến ảnh chụp thành một mô hình 3D nhỏ đặt trên bàn làm việc.",
    icon: "cube",
    inputs: 1,
    inputLabels: ["Ảnh Công trình / Sản phẩm"],
    service: "generateImages",
    promptPlaceholder: "Ví dụ: đặt trên bàn làm việc bằng gỗ sồi, có dụng cụ kiến trúc xung quanh",
    promptEngineer: (p) =>
      `Tạo một hình ảnh siêu thực của một mô hình kiến trúc 3D thu nhỏ của tòa nhà từ hình ảnh được cung cấp. Mô hình phải được đặt trên bàn làm việc bằng gỗ của kiến trúc sư. Cảnh nên có độ sâu trường ảnh nông, tập trung vào mô hình. Yêu cầu cụ thể của người dùng là: "${p}".`,
  },
  {
    id: "remove_watermark",
    name: "Xóa Watermark",
    description: "Tự động xóa watermark hoặc văn bản trên ảnh.",
    icon: "x-circle",
    inputs: 1,
    inputLabels: ["Ảnh có Watermark"],
    service: "generateImages",
    promptPlaceholder: "Có thể để trống, hoặc mô tả vị trí watermark nếu cần.",
    promptEngineer: (p) => `Xóa các watermark hoặc bất kỳ văn bản nào trên hình ảnh này. Yêu cầu thêm của người dùng: "${p}"`,
  },
];

// --- Runner Component ---

const UtilityRunner: React.FC<{
  task: UtilityTaskDef;
  onBack: () => void;
  onEditRequest: (imageUrl: string) => void;
}> = ({ task, onBack, onEditRequest }) => {
  const [sourceImage1, setSourceImage1] = useState<SourceImage | null>(null);
  const [sourceImage2, setSourceImage2] = useState<SourceImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResultFullscreen, setIsResultFullscreen] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResultImage(null);
    try {
      let result: string | null = null;
      const engineeredPrompt = task.promptEngineer ? task.promptEngineer(prompt) : prompt;

      if (task.service === "generateImageFromText") {
        result = await generateImageFromText(engineeredPrompt);
      } else {
        const source = sourceImage1;
        if (!source) {
          alert("Vui lòng tải lên ảnh nguồn.");
          setIsLoading(false);
          return;
        }
        let images: string[] = [];
        if (task.service === "generateImagesWithReference") {
          if (!sourceImage2) {
            alert("Vui lòng tải lên ảnh tham khảo.");
            setIsLoading(false);
            return;
          }
          images = await generateImages(source, engineeredPrompt, "interior", 1, sourceImage2, false, true);
        } else {
          // 'generateImages'
          images = await generateImages(source, engineeredPrompt, "interior", 1, null, false, true);
        }
        result = images.length > 0 ? images[0] : null;
      }

      if (result) {
        setResultImage(result);
      } else {
        throw new Error("API did not return an image.");
      }
    } catch (error) {
      console.error("Utility task failed:", error);
      alert("Đã xảy ra lỗi khi thực hiện tác vụ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = () => {
    if (isLoading) return false;
    const hasPrompt = task.id === "remove_watermark" || prompt.length > 0;
    if (task.inputs === 0) return prompt.length > 0;
    if (task.inputs === 1) return !!sourceImage1 && hasPrompt;
    if (task.inputs === 2) return !!sourceImage1 && !!sourceImage2 && hasPrompt;
    return false;
  };

  const handleEdit = () => {
    if (resultImage) {
      onEditRequest(resultImage);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 font-semibold">
        <Icon name="arrow-uturn-left" className="w-5 h-5" />
        Quay Lại Danh Sách
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-6">
          <Section title="1. Dữ Liệu Đầu Vào">
            <div className="space-y-4">
              {task.inputs === 1 && <ImageUpload sourceImage={sourceImage1} onImageUpload={setSourceImage1} onRemove={() => setSourceImage1(null)} title={task.inputLabels?.[0]} />}
              {task.inputs === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload sourceImage={sourceImage1} onImageUpload={setSourceImage1} onRemove={() => setSourceImage1(null)} title={task.inputLabels?.[0]} heightClass="h-40" />
                  <ImageUpload sourceImage={sourceImage2} onImageUpload={setSourceImage2} onRemove={() => setSourceImage2(null)} title={task.inputLabels?.[1]} heightClass="h-40" />
                </div>
              )}
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={task.promptPlaceholder} className="w-full bg-slate-700 p-2 rounded-md h-32 resize-none text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              {task.predefinedPrompts && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-400">Gợi ý prompt:</p>
                  <div className="flex flex-wrap gap-2">
                    {task.predefinedPrompts.map((p, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(p.value)}
                        title={p.value} // show full prompt on hover
                        className="bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs font-medium py-1 px-3 rounded-full transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            <Icon name="sparkles" className="w-5 h-5" />
            {isLoading ? "Đang Xử Lý..." : "Thực Hiện"}
          </button>
        </div>
        {/* Right Column: Output */}
        <Section title="2. Kết Quả">
          <div className="w-full h-full bg-black/20 rounded-lg flex items-center justify-center min-h-[400px]">
            <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center group">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-100"></div>
                  <p className="mt-3 font-semibold text-sm text-slate-200">AI đang xử lý, vui lòng chờ...</p>
                </div>
              ) : resultImage ? (
                <>
                  <img src={resultImage} alt="Utility result" className="max-w-full max-h-full object-contain rounded-md" />
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <button
                      onClick={() => setIsResultFullscreen(true)}
                      className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                      title="Xem Toàn Màn Hình"
                    >
                      <Icon name="arrows-expand" className="w-4 h-4" />
                      <span>Phóng To</span>
                    </button>
                    <button
                      onClick={handleEdit}
                      className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                      title="Chỉnh Sửa Ảnh Này"
                    >
                      <Icon name="pencil" className="w-4 h-4" />
                      <span>Sửa</span>
                    </button>
                    <a
                      href={resultImage}
                      download={`nbox-ai-utility-${task.id}-${Date.now()}.png`}
                      className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
                      aria-label="Tải ảnh"
                      title="Tải ảnh"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      <span>Tải</span>
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center p-4">Kết quả sẽ xuất hiện ở đây sau khi bạn thực hiện tác vụ.</p>
              )}
            </div>
          </div>
        </Section>
      </div>
      {isResultFullscreen && resultImage && <ImageViewerModal imageUrl={resultImage} onClose={() => setIsResultFullscreen(false)} />}
    </div>
  );
};

// --- Main Component ---

export const UtilitiesTab: React.FC<{ onEditRequest: (imageUrl: string) => void }> = ({ onEditRequest }) => {
  const [selectedTask, setSelectedTask] = useState<UtilityTaskDef | null>(null);

  if (selectedTask) {
    return <UtilityRunner task={selectedTask} onBack={() => setSelectedTask(null)} onEditRequest={onEditRequest} />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2 text-slate-200">Bộ Tiện Ích AI</h2>
      <p className="text-center text-slate-400 mb-8">Chọn một tác vụ để bắt đầu.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {UTILITY_TASKS.map((task) => {
          const isLocked = task.id !== "render_from_moodboard" && task.id !== "change_interior_style";
          return (
            <div
              key={task.id}
              onClick={() => !isLocked && setSelectedTask(task)}
              className={`relative bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 transition-all duration-300 flex flex-col items-start shadow-lg ${
                isLocked ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-700/70 hover:border-indigo-500 cursor-pointer hover:shadow-indigo-500/10"
              }`}
            >
              {isLocked && (
                <div className="absolute top-4 right-4 text-slate-500" title="Tính năng này đang bị khóa">
                  <Icon name="lock-closed" className="w-5 h-5" />
                </div>
              )}
              <div className={`rounded-lg p-2 mb-4 ${isLocked ? "bg-slate-700/30 text-slate-500" : "bg-indigo-500/10 text-indigo-400"}`}>
                <Icon name={task.icon} className="w-6 h-6" />
              </div>
              <h3 className={`font-bold text-slate-100 mb-2 ${isLocked ? "text-slate-500" : "text-slate-100"}`}>{task.name}</h3>
              <p className="text-sm text-slate-400 flex-grow">{task.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
