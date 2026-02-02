import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, File, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileWithPreview {
  file: File;
  type: 'prd' | 'cus' | 'od0' | 'unknown';
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

export default function Import() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const getFileType = (filename: string): FileWithPreview['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'prd') return 'prd';
    if (ext === 'cus') return 'cus';
    if (ext === 'od0') return 'od0';
    return 'unknown';
  };
  
  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FileWithPreview[] = Array.from(fileList).map(file => {
      const type = getFileType(file.name);
      return {
        file,
        type,
        status: type === 'unknown' ? 'invalid' : 'valid',
        error: type === 'unknown' ? t('import.invalidFormat') : undefined,
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [t]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    const validFiles = files.filter(f => f.status === 'valid');
    if (validFiles.length === 0) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('import.invalidFormat'),
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }
    
    setIsUploading(false);
    setFiles([]);
    
    toast({
      title: t('common.success'),
      description: t('import.success'),
    });
  };
  
  const getFileIcon = (type: FileWithPreview['type']) => {
    switch (type) {
      case 'prd':
        return <Badge variant="outline" className="text-xs">PRD</Badge>;
      case 'cus':
        return <Badge variant="outline" className="text-xs">CUS</Badge>;
      case 'od0':
        return <Badge variant="outline" className="text-xs">OD0</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs">?</Badge>;
    }
  };
  
  const hasPrd = files.some(f => f.type === 'prd' && f.status === 'valid');
  const hasCus = files.some(f => f.type === 'cus' && f.status === 'valid');
  const hasOd0 = files.some(f => f.type === 'od0' && f.status === 'valid');
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('import.title')}</h1>
        <p className="text-muted-foreground">{t('import.supportedFormats')}</p>
      </div>
      
      {/* Drop zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={cn(
              'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
              isDragging && 'border-primary bg-primary/5',
              !isDragging && 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t('import.dropzone')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('import.supportedFormats')}</p>
            
            <input
              type="file"
              multiple
              accept=".prd,.cus,.od0"
              onChange={handleInputChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            
            <Button variant="outline" className="mt-4">
              {t('import.selectFiles')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('import.summary')}</CardTitle>
            <CardDescription>
              <div className="flex gap-4 mt-2">
                <span className={cn(hasPrd ? 'text-success' : 'text-muted-foreground')}>
                  {t('import.productsFile')} {hasPrd ? '✓' : '○'}
                </span>
                <span className={cn(hasCus ? 'text-success' : 'text-muted-foreground')}>
                  {t('import.customersFile')} {hasCus ? '✓' : '○'}
                </span>
                <span className={cn(hasOd0 ? 'text-success' : 'text-muted-foreground')}>
                  {t('import.ordersFile')} {hasOd0 ? '✓' : '○'}
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-4 rounded-lg border p-4',
                  fileItem.status === 'invalid' && 'border-destructive/50 bg-destructive/5'
                )}
              >
                <File className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(fileItem.file.size / 1024).toFixed(1)} KB
                  </p>
                  {fileItem.error && (
                    <p className="text-sm text-destructive">{fileItem.error}</p>
                  )}
                </div>
                {getFileIcon(fileItem.type)}
                {fileItem.status === 'valid' ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('import.processing')}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={isUploading || files.every(f => f.status === 'invalid')}
              className="w-full"
            >
              {isUploading ? t('import.uploading') : t('import.uploadFiles')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
