import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload?: (file: File) => Promise<string>;
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto';
  maxSizeMB?: number;
  bucketName?: string;
  folderPath?: string;
  className?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  onUpload,
  aspectRatio = 'auto',
  maxSizeMB = 5,
  bucketName = 'display-assets',
  folderPath = 'logos',
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClass = {
    square: 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    auto: '',
  }[aspectRatio];

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vennligst velg en bildefil');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Filen er for stor. Maks ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);

    try {
      let url: string;

      if (onUpload) {
        url = await onUpload(file);
      } else {
        // Default upload to Supabase storage
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        url = urlData.publicUrl;
      }

      onChange(url);
      toast.success('Bildet ble lastet opp');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kunne ikke laste opp bildet');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          dragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          aspectRatioClass,
          !aspectRatioClass && "min-h-[120px]"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full"
            >
              <img
                src={value}
                alt="Opplastet bilde"
                className="w-full h-full object-contain rounded-md"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Laster opp...</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="rounded-full bg-muted p-3">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Dra og slipp eller klikk</p>
                  <p className="text-xs">PNG, JPG opp til {maxSizeMB}MB</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
