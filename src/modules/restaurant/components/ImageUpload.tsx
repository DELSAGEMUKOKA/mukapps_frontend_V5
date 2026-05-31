import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  aspectRatio?: 'square' | 'video' | 'auto';
  className?: string;
}

export function ImageUpload({
  currentImage,
  onUpload,
  onDelete,
  isLoading = false,
  aspectRatio = 'square',
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: 'aspect-auto',
  }[aspectRatio];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image trop volumineuse (max 5MB)');
      return;
    }

    // Preview locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success('Image téléchargée avec succès');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
      setPreviewUrl(currentImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm('Supprimer cette image ?')) {
      try {
        await onDelete();
        setPreviewUrl(null);
        toast.success('Image supprimée');
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const isProcessing = isLoading || isUploading;

  return (
    <div className={cn('relative group', aspectRatioClass, className)}>
      {/* Image preview */}
      <div className={cn(
        'w-full rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200',
        aspectRatioClass
      )}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Aperçu"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon size={32} strokeWidth={1.5} />
            <span className="text-xs">Pas d'image</span>
          </div>
        )}
      </div>

      {/* Overlay avec boutons */}
      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Changer l'image"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </button>
        
        {previewUrl && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isProcessing}
            className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            title="Supprimer l'image"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}