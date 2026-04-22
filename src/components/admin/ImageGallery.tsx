import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { UploadedImage } from '@/lib/api/templates';

interface ImageGalleryProps {
  images: UploadedImage[];
  onDelete: (imageId: string) => Promise<void>;
  onSelect: (image: UploadedImage) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDelete,
  onSelect,
}) => {
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const handleDelete = async (imageId: string) => {
    try {
      setDeleting(imageId);
      await onDelete(imageId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer"
                onClick={() => onSelect(image)}
              >
                <img
                  src={image.file_url}
                  alt={image.file_name}
                  className="w-full h-32 object-cover rounded-lg shadow-sm transition-all group-hover:ring-2 ring-primary"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  disabled={!!deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
