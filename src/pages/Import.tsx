import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Upload, File, CheckCircle2, AlertCircle, X, CalendarIcon, Package, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useImport } from '@/hooks/useImport';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ParsedProduct, ParsedCustomer, ParsedOrder } from '@/lib/fileParser';

interface FileWithPreview {
  file: File;
  type: 'prd' | 'cus' | 'od0' | 'unknown';
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

interface ParsedData {
  products: ParsedProduct[];
  customers: ParsedCustomer[];
  orders: ParsedOrder[];
  deliveryDate: Date | null;
}

export default function Import() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { parseFiles, importData, isImporting } = useImport();
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const getFileType = (filename: string): FileWithPreview['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'prd') return 'prd';
    if (ext === 'cus') return 'cus';
    if (ext === 'od0') return 'od0';
    return 'unknown';
  };
  
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileWithPreview[] = Array.from(fileList).map(file => {
      const type = getFileType(file.name);
      return {
        file,
        type,
        status: type === 'unknown' ? 'invalid' : 'valid',
        error: type === 'unknown' ? t('import.invalidFormat') : undefined,
      };
    });
    
    const allFiles = [...files, ...newFiles];
    setFiles(allFiles);
    
    // Parse all valid files
    const validFiles = allFiles
      .filter(f => f.status === 'valid')
      .map(f => f.file);
    
    if (validFiles.length > 0) {
      try {
        const { data, errors } = await parseFiles(validFiles);
        setParsedData(data);
        setParseErrors(errors);
        
        // Auto-set delivery date from filename if found
        if (data.deliveryDate && !deliveryDate) {
          setDeliveryDate(data.deliveryDate);
        }
      } catch (error) {
        console.error('Parse error:', error);
      }
    }
  }, [files, parseFiles, t, deliveryDate]);
  
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
  
  const removeFile = async (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Re-parse remaining files
    const validFiles = newFiles
      .filter(f => f.status === 'valid')
      .map(f => f.file);
    
    if (validFiles.length > 0) {
      const { data, errors } = await parseFiles(validFiles);
      setParsedData(data);
      setParseErrors(errors);
    } else {
      setParsedData(null);
      setParseErrors([]);
    }
  };
  
  const handleUpload = async () => {
    if (!parsedData || !deliveryDate) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: !deliveryDate ? 'Velg en leveringsdato' : t('import.invalidFormat'),
      });
      return;
    }
    
    setUploadProgress(10);
    
    try {
      const result = await importData({
        products: parsedData.products,
        customers: parsedData.customers,
        orders: parsedData.orders,
        deliveryDate,
      });
      
      setUploadProgress(100);
      
      toast({
        title: t('common.success'),
        description: `Import fullført! ${result.productsCreated} nye produkter, ${result.customersCreated} nye kunder, ${result.ordersCreated} ordrer.`,
      });
      
      // Reset state
      setFiles([]);
      setParsedData(null);
      setParseErrors([]);
      setDeliveryDate(undefined);
      setUploadProgress(0);
    } catch (error) {
      setUploadProgress(0);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('import.error'),
      });
    }
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
  
  const canImport = parsedData && deliveryDate && (
    parsedData.products.length > 0 ||
    parsedData.customers.length > 0 ||
    parsedData.orders.length > 0
  );
  
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
              accept=".prd,.cus,.od0,.PRD,.CUS,.OD0"
              onChange={handleInputChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            
            <Button variant="outline" className="mt-4">
              {t('import.selectFiles')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* File list and parsed summary */}
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
            {/* Parsed data summary */}
            {parsedData && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('nav.products')}</p>
                    <p className="text-lg font-semibold">{parsedData.products.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('nav.customers')}</p>
                    <p className="text-lg font-semibold">{parsedData.customers.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ordrer</p>
                    <p className="text-lg font-semibold">{parsedData.orders.length}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Delivery date picker */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{t('import.deliveryDate')}:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !deliveryDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, 'PPP', { locale: nb }) : 'Velg dato'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={setDeliveryDate}
                    locale={nb}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="font-medium text-destructive mb-2">Advarsler under parsing:</p>
                <ul className="text-sm text-destructive space-y-1">
                  {parseErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...og {parseErrors.length - 5} flere</li>
                  )}
                </ul>
              </div>
            )}
            
            {/* File list */}
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
                  disabled={isImporting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {isImporting && (
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
              disabled={isImporting || !canImport}
              className="w-full"
            >
              {isImporting ? t('import.uploading') : t('import.uploadFiles')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
