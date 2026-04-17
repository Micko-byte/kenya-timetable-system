import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Palette, Type, Upload, Image as ImageIcon, Rocket } from "lucide-react";
import { toast } from "sonner";
import { templatesApi } from "@/lib/api/templates";
import type { Template, UploadedImage } from "@/lib/api/templates";
import { ImageGallery } from "./ImageGallery";
import defaultTemplate from "@/assets/default-template.webp";

interface CellData {
  id: string;
  day: string;
  period: number;
  subject: string;
  bgColor: string;
  textColor: string;
}

interface TemplateConfig {
  name: string;
  periods: string[];
  days: string[];
  breaks: { afterPeriod: number; label: string; duration?: number }[];
  cells: CellData[];
}

interface Props {
  templateId?: string;
  onSave: (template: Template) => void;
}




// simple UUID generator for upload session keys
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_PERIODS = [
  "8:30-9:00",
  "9:00-9:40",
  "9:40-10:30",
  "10:50-11:10",
  "11:10-11:40",
  "11:40-12:10",
  "12:30-2:00",
  "2:00-2:40",
  "3:20-4:00",
];

const DEFAULT_DAYS = ["MON", "TUE", "WED", "THUR", "FRI"];

function normalizeTemplateConfig(template: Template | null | undefined): TemplateConfig {
  const raw = (template?.content ?? template?.structure_config ?? {}) as Record<string, any>;
  const periods = Array.isArray(raw.periods) && raw.periods.length > 0 ? raw.periods : DEFAULT_PERIODS;
  const days = Array.isArray(raw.days) && raw.days.length > 0 ? raw.days : DEFAULT_DAYS;
  const breaks = Array.isArray(raw.breaks)
    ? raw.breaks.map((item: any) => ({
        afterPeriod: Number(item.afterPeriod ?? 0),
        label: String(item.label ?? "BREAK"),
        duration: typeof item.duration === "number" ? item.duration : undefined,
      }))
    : Array.isArray(template?.break_config)
      ? template.break_config.map((item: any) => ({
          afterPeriod: Number(item.afterPeriod ?? 0),
          label: String(item.label ?? "BREAK"),
          duration: typeof item.duration === "number" ? item.duration : undefined,
        }))
      : [
          { afterPeriod: 3, label: "BREAK" },
          { afterPeriod: 6, label: "LUNCH" },
        ];

  return {
    name: template?.name || raw.name || "New Template",
    periods: periods.map((period: any) => String(period)),
    days: days.map((day: any) => String(day)),
    breaks,
    cells: Array.isArray(raw.cells) ? raw.cells : [],
  };
}

export const GraphicalTemplateEditor = ({ templateId, onSave }: Props) => {

  const [config, setConfig] = useState<TemplateConfig>({
    name: "New Template",
    periods: ["8:30-9:00", "9:00-9:40", "9:40-10:30", "10:50-11:10", "11:10-11:40", "11:40-12:10", "12:30-2:00", "2:00-2:40", "3:20-4:00"],
    days: ["MON", "TUE", "WED", "THUR", "FRI"],
    breaks: [
      { afterPeriod: 3, label: "BREAK" },
      { afterPeriod: 6, label: "LUNCH" },
    ],
    cells: [],
  });

  const [selectedCell, setSelectedCell] = useState<{ day: string; period: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>('#f97316');
  const [secondaryColor, setSecondaryColor] = useState<string>('#06b6d4');
  const [defaultBg, setDefaultBg] = useState<string | null>(null);
  const [uploadSession] = useState<string>(() => generateUuid());
  const [paletteSuggestions, setPaletteSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (templateId) {
      loadTemplateImages();
    }
  }, [templateId]);

  const loadTemplateImages = async () => {
    if (!templateId) return;
    try {
      const images = await templatesApi.getTemplateImages(templateId);
      setUploadedImages(images);
      if (images.length > 0) {
        setSelectedImage(images[0].file_url);
      }
    } catch (error) {
      console.error('Failed to load template images:', error);
    }
  };

  const colors = [
    { bg: "hsl(27, 100%, 60%)", text: "hsl(0, 0%, 100%)", name: "Orange" },
    { bg: "hsl(142, 76%, 36%)", text: "hsl(0, 0%, 100%)", name: "Green" },
    { bg: "hsl(189, 67%, 16%)", text: "hsl(0, 0%, 100%)", name: "Teal" },
    { bg: "hsl(42, 47%, 90%)", text: "hsl(189, 67%, 16%)", name: "Cream" },
    { bg: "hsl(0, 84%, 60%)", text: "hsl(0, 0%, 100%)", name: "Red" },
  ];

  const getCellData = (day: string, period: number): CellData | undefined => {
    return config.cells.find((cell) => cell.day === day && cell.period === period);
  };

  const updateCell = (day: string, period: number, subject: string, bgColor: string, textColor: string) => {
    const cellId = `${day}-${period}`;
    const existingIndex = config.cells.findIndex((c) => c.id === cellId);

    if (existingIndex >= 0) {
      const newCells = [...config.cells];
      newCells[existingIndex] = { id: cellId, day, period, subject, bgColor, textColor };
      setConfig({ ...config, cells: newCells });
    } else {
      setConfig({
        ...config,
        cells: [...config.cells, { id: cellId, day, period, subject, bgColor, textColor }],
      });
    }
  };

  const isBreak = (period: number) => {
    return config.breaks.find((b) => b.afterPeriod === period);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // show a local preview immediately so the user sees feedback even if the bucket is private
      const localUrl = URL.createObjectURL(file);
      const tempId = `local-${Date.now()}`;
      const localPreview = { id: tempId, file_url: localUrl, file_name: file.name, uploaded_by: 'local', created_at: new Date().toISOString() } as UploadedImage;
      setUploadedImages((prev) => [localPreview, ...prev]);
      setSelectedImage(localUrl);

      // extract palette from file and propose sample palettes
      try {
        const pal = await extractPalette(file, 5);
        if (pal && pal.length > 0) {
          setPaletteSuggestions(pal);
          setPrimaryColor(pal[0]);
          if (pal[1]) setSecondaryColor(pal[1]);
          // apply palette immediately as the default theme/gradient
          const sec = pal[1] || complementaryColor(pal[0]);
          setDefaultBg(`linear-gradient(90deg, ${pal[0]}, ${sec})`);
        }
      } catch (err) {
        console.warn('Failed to extract palette', err);
      }

      const uploadedImage = await templatesApi.uploadImage(file, templateId, uploadSession);
      // replace local preview with server record if present
      setUploadedImages((prev) => {
        const found = prev.find((p) => p.id === tempId);
        if (found) {
          return prev.map((p) => (p.id === tempId ? uploadedImage : p));
        }
        return [uploadedImage, ...prev];
      });
      setSelectedImage(uploadedImage.file_url || localUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Load existing template when editing
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;
      try {
        const t = await templatesApi.getTemplate(templateId);
        if (!t) return;
        // populate config from stored template data
        setConfig(normalizeTemplateConfig(t));
        // set preview image if available
        if (t.preview_image) setSelectedImage(t.preview_image);
        // set theme colors if stored in template content
        const theme = (t.content ?? t.structure_config ?? {}) as Record<string, any>;
        if (theme?.primary) setPrimaryColor(theme.primary);
        if (theme?.secondary) setSecondaryColor(theme.secondary);
        if (theme?.primary) setDefaultBg(`linear-gradient(90deg, ${theme.primary}, ${theme.secondary || complementaryColor(theme.primary)})`);
        // load uploaded images for the template
        const images = await templatesApi.getTemplateImages(templateId);
        setUploadedImages(images || []);
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    };
    loadTemplate();
  }, [templateId]);

  // Extract a simple dominant color by averaging pixels on a small canvas
  // Extract a color palette by sampling the image and grouping similar colors
  const extractPalette = (file: File, count = 4): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const w = 40;
          const h = 40;
          canvas.width = w;
          canvas.height = h;
          if (!ctx) return resolve([]);
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          const map = new Map<string, number>();
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha === 0) continue;
            // quantize colors to reduce unique values
            const r = Math.round(data[i] / 16) * 16;
            const g = Math.round(data[i + 1] / 16) * 16;
            const b = Math.round(data[i + 2] / 16) * 16;
            const key = rgbToHex(r, g, b);
            map.set(key, (map.get(key) || 0) + 1);
          }
          URL.revokeObjectURL(url);
          // sort by frequency
          const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
          const palette = sorted.slice(0, count).map(([k]) => k);
          resolve(palette);
        } catch (err) {
          URL.revokeObjectURL(url);
          resolve([]);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const complementaryColor = (hex: string) => {
    // compute complement by inverting rgb
    const c = hex.replace('#', '');
    const r = 255 - parseInt(c.substring(0,2),16);
    const g = 255 - parseInt(c.substring(2,4),16);
    const b = 255 - parseInt(c.substring(4,6),16);
    return rgbToHex(r,g,b);
  };

  const applyGradientToAllTiles = () => {
    const grad = `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`;
    setDefaultBg(grad);
    // also update existing cells that have no custom bg to use the gradient via defaultBg
  };

  const resetTileColors = () => {
    setDefaultBg(null);
    // reset all cells to remove their custom bgColor
    setConfig({ ...config, cells: [] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templateData = {
        name: config.name,
        type: 'graphical' as const,
        preview_image: selectedImage ?? null,
        periods_per_day: config.periods.length,
        days_per_week: config.days.length,
        period_duration: 40,
        start_time: config.periods[0]?.split("-")[0] ?? "08:30",
        end_time: config.periods[config.periods.length - 1]?.split("-")[1] ?? "16:00",
        break_config: config.breaks.map((breakItem) => ({
          afterPeriod: breakItem.afterPeriod,
          label: breakItem.label,
          duration: breakItem.duration ?? 0,
        })),
        structure_config: {
          ...config,
          theme: { primary: primaryColor, secondary: secondaryColor },
        },
      };

      const savedTemplate = templateId
        ? await templatesApi.updateTemplate(templateId, templateData)
        : await templatesApi.createTemplate(templateData);

      // If this was a new template, associate any pending uploads from this session
      if (!templateId && savedTemplate?.id) {
        try {
          await templatesApi.associateUploads(uploadSession, savedTemplate.id);
        } catch (e) {
          console.warn('Failed to associate pending uploads:', e);
        }
      }

      onSave(savedTemplate);
      toast.success("Template saved successfully!");
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!templateId) {
      toast.error("Please save the template first");
      return;
    }

    setDeploying(true);
    try {
      await templatesApi.deployTemplate(templateId);
      toast.success("Template deployed successfully!");
    } catch (error) {
      console.error('Failed to deploy template:', error);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reference Image Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur-lg opacity-30" />
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Template Design Reference
              </CardTitle>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <img
              src={selectedImage || defaultTemplate}
              alt="Template Reference"
              className="w-full rounded-lg shadow-lg"
            />
            <ImageGallery
              images={uploadedImages}
              onDelete={async (imageId) => {
                // If this is a local preview (created via URL.createObjectURL), just remove it client-side
                try {
                  const img = uploadedImages.find((i) => i.id === imageId);
                  if (!img) return;
                  if (imageId.startsWith('local-')) {
                    try { URL.revokeObjectURL(img.file_url); } catch (e) { /* ignore */ }
                    setUploadedImages((prev) => prev.filter((i) => i.id !== imageId));
                    if (selectedImage === img.file_url) setSelectedImage(null);
                    return;
                  }

                  await templatesApi.deleteImage(imageId);
                  setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
                } catch (err) {
                  console.error('Failed to delete image:', err);
                  toast.error('Failed to delete image');
                }
              }}
              onSelect={(image) => setSelectedImage(image.file_url)}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Template Name */}
      {/* Colors & Gradient */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colors & Gradient
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex flex-col items-center">
              <label className="text-xs mb-1">Primary</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs mb-1">Secondary</label>
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-8 p-0 border rounded" />
            </div>

            <div className="flex-1">
              <label className="text-xs mb-1 block">Preview</label>
              <div className="w-full h-12 rounded shadow-inner" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
            </div>

            {/* Palette suggestions */}
            {paletteSuggestions.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                {paletteSuggestions.map((c, idx) => (
                  <button
                    key={c + idx}
                    title={c}
                    onClick={() => {
                      setPrimaryColor(c);
                      if (paletteSuggestions[idx + 1]) setSecondaryColor(paletteSuggestions[idx + 1]);
                    }}
                    className="w-8 h-8 rounded border"
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={applyGradientToAllTiles}>Apply Gradient to Timetable</Button>
              <Button size="sm" variant="outline" onClick={resetTileColors}>Reset Tiles</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="Enter template name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editable Timetable Grid */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-x-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Editable Timetable Grid
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? "Lock" : "Edit Mode"}
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Template"}
                  </Button>
                  {templateId && (
                    <Button size="sm" variant="secondary" onClick={handleDeploy} disabled={deploying}>
                      <Rocket className="w-4 h-4 mr-2" />
                      {deploying ? "Deploying..." : "Deploy"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-w-[1000px]">
              {/* Header Row */}
              <div className="grid grid-cols-[100px_repeat(9,1fr)] gap-1 mb-1">
                <div className="bg-success text-success-foreground p-3 text-center font-bold rounded">
                  DAY / TIME
                </div>
                {config.periods.map((time, i) => {
                  const breakData = isBreak(i);
                  if (breakData) {
                    return (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="bg-gradient-to-b from-orange-500 to-orange-600 text-white p-3 text-center font-bold rounded flex items-center justify-center"
                      >
                        <span className="writing-mode-vertical transform -rotate-180">
                          {breakData.label}
                        </span>
                      </motion.div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="bg-success text-success-foreground p-3 text-center text-sm font-bold rounded"
                    >
                      <div>{time.split("-")[0]}</div>
                      <div className="text-xs opacity-80">{time.split("-")[1]}</div>
                    </div>
                  );
                })}
              </div>

              {/* Day Rows */}
              {config.days.map((day, dayIndex) => (
                <motion.div
                  key={day}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: dayIndex * 0.1 }}
                  className="grid grid-cols-[100px_repeat(9,1fr)] gap-1 mb-1"
                >
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 font-bold rounded flex items-center justify-center">
                    {day}
                  </div>

                  {config.periods.map((_, periodIndex) => {
                    const breakData = isBreak(periodIndex);
                    if (breakData) {
                      return (
                        <div
                          key={periodIndex}
                          className="bg-gradient-to-b from-orange-500 to-orange-600 rounded"
                        />
                      );
                    }

                    const cellData = getCellData(day, periodIndex);
                    const bgColor = cellData?.bgColor;
                    const textColor = cellData?.textColor || "hsl(0, 0%, 100%)";

                    const tileStyle: any = {};
                    if (bgColor) tileStyle.backgroundColor = bgColor;
                    else if (defaultBg) tileStyle.background = defaultBg;
                    else tileStyle.backgroundColor = "hsl(27, 100%, 60%)";

                    return (
                      <motion.div
                        key={periodIndex}
                        whileHover={editMode ? { scale: 1.05, zIndex: 10 } : {}}
                        className={`p-3 rounded cursor-pointer relative group transition-all ${
                          editMode ? "ring-2 ring-primary/50" : ""
                        }`}
                        style={{ ...tileStyle, color: textColor }}
                        onClick={() =>
                          editMode && setSelectedCell({ day, period: periodIndex })
                        }
                      >
                        {editMode && (
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <Plus className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="text-center text-sm font-semibold">
                          {cellData?.subject || "Click to add"}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </div>

            {/* Cell Editor */}
            {selectedCell && editMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 bg-accent rounded-lg"
              >
                <h3 className="text-lg font-bold mb-4">
                  Edit Cell: {selectedCell.day} - Period {selectedCell.period + 1}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      placeholder="Enter subject"
                      defaultValue={getCellData(selectedCell.day, selectedCell.period)?.subject}
                      onBlur={(e) => {
                        const currentCell = getCellData(selectedCell.day, selectedCell.period);
                        updateCell(
                          selectedCell.day,
                          selectedCell.period,
                          e.target.value,
                          currentCell?.bgColor || colors[0].bg,
                          currentCell?.textColor || colors[0].text
                        );
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Background Color</Label>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <motion.button
                        key={color.name}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 rounded-lg shadow-lg border-2 border-white"
                        style={{ backgroundColor: color.bg }}
                        onClick={() => {
                          const currentCell = getCellData(selectedCell.day, selectedCell.period);
                          updateCell(
                            selectedCell.day,
                            selectedCell.period,
                            currentCell?.subject || "",
                            color.bg,
                            color.text
                          );
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCell(null)}
                >
                  Close
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
