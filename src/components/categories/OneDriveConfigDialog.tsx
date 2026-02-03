import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useOneDriveConfigForCategory, useUpsertOneDriveConfig, useDeleteOneDriveConfig } from '@/hooks/useOneDriveConfig';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface OneDriveConfigDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OneDriveConfigDialog({ category, open, onOpenChange }: OneDriveConfigDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [folderUrl, setFolderUrl] = useState('');
  
  const { data: config, isLoading } = useOneDriveConfigForCategory(category?.id || null);
  const upsertConfig = useUpsertOneDriveConfig();
  const deleteConfig = useDeleteOneDriveConfig();
  
  useEffect(() => {
    if (config?.onedrive_folder_url) {
      setFolderUrl(config.onedrive_folder_url);
    } else {
      setFolderUrl('');
    }
  }, [config]);
  
  const handleSave = async () => {
    if (!category || !folderUrl) return;
    
    try {
      await upsertConfig.mutateAsync({
        categoryId: category.id,
        onedriveFolderUrl: folderUrl,
      });
      
      toast({
        title: 'OneDrive-kobling lagret',
        description: 'Mappekoblingen er konfigurert for denne kategorien.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Kunne ikke lagre konfigurasjon',
      });
    }
  };
  
  const handleDelete = async () => {
    if (!category) return;
    
    try {
      await deleteConfig.mutateAsync(category.id);
      setFolderUrl('');
      
      toast({
        title: 'OneDrive-kobling fjernet',
        description: 'Kategorien er ikke lenger koblet til OneDrive.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke fjerne konfigurasjon',
      });
    }
  };
  
  if (!category) return null;
  
  const isSaving = upsertConfig.isPending;
  const isDeleting = deleteConfig.isPending;
  
  const getStatusBadge = () => {
    if (!config) return <Badge variant="secondary">Ikke konfigurert</Badge>;
    
    switch (config.sync_status) {
      case 'configured':
        return <Badge className="bg-success text-success-foreground">Konfigurert</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Synkroniserer</Badge>;
      case 'error':
        return <Badge variant="destructive">Feil</Badge>;
      default:
        return <Badge variant="secondary">Ikke konfigurert</Badge>;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive-konfigurasjon
          </DialogTitle>
          <DialogDescription>
            Koble <strong>{category.name}</strong> til en OneDrive-mappe for automatisk import
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge()}
            </div>
            
            {config?.last_sync_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Siste synkronisering</span>
                <span>{format(new Date(config.last_sync_at), 'dd. MMM yyyy HH:mm', { locale: nb })}</span>
              </div>
            )}
            
            {config?.sync_error && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{config.sync_error}</p>
              </div>
            )}
            
            {/* OneDrive folder URL */}
            <div className="space-y-2">
              <Label>OneDrive-mappe URL</Label>
              <Input
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="https://onedrive.live.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Lim inn delings-lenken til mappen som inneholder .PRD, .CUS og .OD0-filer
              </p>
            </div>
            
            {/* Info */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Forventede filer i mappen:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>.PRD</strong> - Produktfil (deles på tvers av kategorier)</li>
                <li>• <strong>.CUS</strong> - Kundefil (deles på tvers av kategorier)</li>
                <li>• <strong>.OD0</strong> - Ordrefil (kategori-spesifikk)</li>
              </ul>
            </div>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          {config && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="mr-auto"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Fjern kobling
            </Button>
          )}
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !folderUrl}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="h-4 w-4 mr-2" />
            Lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
