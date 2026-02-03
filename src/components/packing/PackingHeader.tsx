import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Package, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';

interface PackingHeaderProps {
  date: string;
  totalProducts: number;
  totalQuantity: number;
  packedCount: number;
  totalCount: number;
  onBack: () => void;
}

export function PackingHeader({ 
  date, 
  totalProducts, 
  totalQuantity, 
  packedCount, 
  totalCount,
  onBack 
}: PackingHeaderProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
  
  return (
    <div className="flex items-center justify-between pb-4 border-b">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <h1 className="text-xl font-bold">
          {format(new Date(date), 'dd. MMMM yyyy', { locale })}
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{totalProducts}</span>
          <span className="text-muted-foreground">produkter</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">~</span>
          <span className="font-semibold">{totalQuantity.toLocaleString('nb-NO')}</span>
          <span className="text-muted-foreground">enheter</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{packedCount}/{totalCount}</span>
          <span className="text-muted-foreground">({progress}%)</span>
        </div>
      </div>
    </div>
  );
}
