import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Download, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';

interface KioskLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  bakeryShortId: string;
}

export function KioskLinkDialog({
  open,
  onOpenChange,
  category,
  bakeryShortId,
}: KioskLinkDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qrRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);

  // Generate kiosk URL based on packing mode
  const kioskUrl = (() => {
    const baseUrl = window.location.origin;
    const modePath = category.packing_mode === 'product_based'
      ? `/kiosk/packing/${bakeryShortId}/product/${category.id}`
      : `/kiosk/packing/${bakeryShortId}/${category.id}`;
    return `${baseUrl}${modePath}`;
  })();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      toast({ title: t('categories.linkCopied') });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke kopiere til utklippstavle',
      });
    }
  }, [kioskUrl, toast, t]);

  const handleDownloadQr = useCallback(() => {
    const svg = qrRef.current;
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx?.scale(2, 2);
        ctx?.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `kiosk-${category.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = pngUrl;
        link.click();

        toast({ title: t('categories.qrDownloaded') });
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke laste ned QR-kode',
      });
    }
  }, [category.name, toast, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('categories.kioskLinkTitle', { category: category.name })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {t('categories.kioskLinkDescription')}
          </p>

          {/* URL field with copy button */}
          <div className="flex gap-2">
            <Input
              readOnly
              value={kioskUrl}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG
              ref={qrRef}
              value={kioskUrl}
              size={200}
              level="M"
              includeMargin
            />
          </div>

          {/* Packing mode badge */}
          <div className="flex justify-center">
            <Badge variant="secondary">
              {category.packing_mode === 'product_based'
                ? t('categories.productBased')
                : t('categories.customerBased')}
            </Badge>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t('categories.kioskTips')}
            </p>
          </div>

          {/* Download button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleDownloadQr}
          >
            <Download className="h-4 w-4" />
            {t('categories.downloadQr')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
