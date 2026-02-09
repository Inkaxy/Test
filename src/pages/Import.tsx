import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, File, CheckCircle2, AlertCircle, X, Package, Users, ShoppingCart, Cloud, CalendarDays, FolderOpen, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useImport } from '@/hooks/useImport';
import { useCategories } from '@/hooks/useCategories';
import { useOneDriveConfigs } from '@/hooks/useOneDriveConfig';
import { useTrips } from '@/hooks/useTrips';
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
  const { data: categories = [] } = useCategories();
  const { data: oneDriveConfigs = [] } = useOneDriveConfigs();
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>();
  
  const activeCategories = categories.filter(c => c.is_active);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const categoryOneDriveConfig = oneDriveConfigs.find(c => c.category_id === selectedCategoryId);
  const { data: trips = [] } = useTrips(selectedCategoryId);
  const hasTrips = trips.length > 0;
  const selectedTrip = trips.find(t => t.id === selectedTripId);

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
      } catch (error) {
        console.error('Parse error:', error);
      }
    }
  }, [files, parseFiles, t]);
  
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
    if (selectedCategoryId) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, selectedCategoryId]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && selectedCategoryId) {
      handleFiles(e.target.files);
    }
  }, [handleFiles, selectedCategoryId]);
  
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
    if (!parsedData || !parsedData.deliveryDate || !selectedCategoryId) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: !selectedCategoryId 
          ? 'Velg en kategori' 
          : !parsedData?.deliveryDate 
            ? 'Kunne ikke hente leveringsdato fra filene. Sjekk at .OD0-filen har riktig format.' 
            : t('import.invalidFormat'),
      });
      return;
    }

    if (hasTrips && !selectedTripId) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Velg en tur før du importerer. Denne kategorien har turer som må velges.',
      });
      return;
    }
    
    setUploadProgress(10);
    
    try {
      const result = await importData({
        products: parsedData.products,
        customers: parsedData.customers,
        orders: parsedData.orders,
        deliveryDate: parsedData.deliveryDate,
        categoryId: selectedCategoryId,
        tripId: selectedTripId,
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
  
  const canImport = parsedData && parsedData.deliveryDate && selectedCategoryId && (
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
      
      {/* Step 1: Select category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            1. Velg kategori
          </CardTitle>
          <CardDescription>
            Velg hvilken kategori ordrene skal importeres til
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCategoryId} onValueChange={(val) => { setSelectedCategoryId(val); setSelectedTripId(undefined); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Velg kategori..." />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <span>{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.packing_mode === 'product_based' ? 'Produktbasert' : 'Kundebasert'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedCategory && (
            <div className="flex items-center gap-2">
              {categoryOneDriveConfig?.sync_status === 'configured' ? (
                <Badge variant="outline" className="gap-1 text-success border-success/30">
                  <Cloud className="h-3 w-3" />
                  OneDrive koblet
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Cloud className="h-3 w-3" />
                  OneDrive ikke koblet
                </Badge>
              )}
            </div>
          )}
          
          {/* Trip selector - shown when category has trips */}
          {hasTrips && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Velg tur
              </Label>
              <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Velg tur..." />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {trip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Denne kategorien har {trips.length} turer. Velg hvilken tur ordrene tilhører.
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Produkter og kunder deles på tvers av kategorier. Ordrer (.OD0) knyttes til valgt kategori.
          </p>
        </CardContent>
      </Card>
      
      {/* Step 2: Upload files (only shown when category is selected) */}
      {selectedCategoryId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              2. Last opp filer
            </CardTitle>
            <CardDescription>
              Dra og slipp filer eller klikk for å velge. Leveringsdato hentes automatisk fra filene.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
      )}
      
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
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
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Leveringsdato</p>
                    <p className="text-lg font-semibold">
                      {parsedData.deliveryDate 
                        ? format(parsedData.deliveryDate, 'd. MMM yyyy', { locale: nb })
                        : <span className="text-destructive text-sm">Ikke funnet</span>
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Category info */}
            {selectedCategory && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Importeres til: <strong>{selectedCategory.name}</strong>
                </span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {selectedCategory.packing_mode === 'product_based' ? 'Produktbasert' : 'Kundebasert'}
                </Badge>
              </div>
            )}
            
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
            
            {!parsedData?.deliveryDate && hasOd0 && (
              <p className="text-sm text-destructive text-center">
                Kunne ikke hente leveringsdato fra filene. Sjekk at .OD0-filen har riktig format.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
