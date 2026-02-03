import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Keyboard, ArrowUp, ArrowDown, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductWithOrders {
  id: string;
  name: string;
  product_number: string;
  pieces_per_tray: number | null;
  category_name?: string;
  orders: Array<{
    id: string;
    quantity: number;
    customer: {
      id: string;
      name: string;
      customer_number: string;
    };
    packing_status: {
      id: string;
      status: string;
    } | null;
  }>;
  totalOrders: number;
  packedOrders: number;
  totalQuantity: number;
  progress: number;
}

type FilterStatus = 'all' | 'not_started' | 'in_progress' | 'completed';
type SortField = 'name' | 'product_number' | 'quantity' | 'customers' | 'progress';
type SortDirection = 'asc' | 'desc';

interface ProductTableViewProps {
  products: ProductWithOrders[];
  categoryId?: string;
  dateStr: string;
  onStartPacking: (productIds: string[]) => void;
}

export function ProductTableView({ products, categoryId, dateStr, onStartPacking }: ProductTableViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.product_number.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    switch (filterStatus) {
      case 'not_started':
        result = result.filter(p => p.progress === 0);
        break;
      case 'in_progress':
        result = result.filter(p => p.progress > 0 && p.progress < 100);
        break;
      case 'completed':
        result = result.filter(p => p.progress === 100);
        break;
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'nb');
          break;
        case 'product_number':
          comparison = a.product_number.localeCompare(b.product_number, 'nb');
          break;
        case 'quantity':
          comparison = a.totalQuantity - b.totalQuantity;
          break;
        case 'customers':
          comparison = a.totalOrders - b.totalOrders;
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [products, searchQuery, filterStatus, sortField, sortDirection]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(filteredProducts.length - 1, prev + 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[focusedIndex]) {
          toggleProductSelection(filteredProducts[focusedIndex].id);
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Jump to next selected product
        const selectedArray = Array.from(selectedProductIds);
        if (selectedArray.length > 0) {
          const currentProductId = filteredProducts[focusedIndex]?.id;
          const currentSelectedIndex = selectedArray.indexOf(currentProductId);
          const nextSelectedId = selectedArray[(currentSelectedIndex + 1) % selectedArray.length];
          const nextIndex = filteredProducts.findIndex(p => p.id === nextSelectedId);
          if (nextIndex !== -1) {
            setFocusedIndex(nextIndex);
          }
        }
        break;
    }
  }, [filteredProducts, focusedIndex, selectedProductIds]);

  // Double-click handler
  const handleDoubleClick = useCallback((productId: string) => {
    onStartPacking([productId]);
  }, [onStartPacking]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused row into view
  useEffect(() => {
    const row = rowRefs.current.get(focusedIndex);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedIndex]);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const removeFromSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (progress: number) => {
    if (progress === 100) {
      return <Badge className="bg-success text-success-foreground">Ferdig</Badge>;
    }
    if (progress > 0) {
      return <Badge className="bg-warning text-warning-foreground">Pågår</Badge>;
    }
    return <Badge variant="secondary">Venter</Badge>;
  };

  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return `${quantity} stk`;
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    if (trays === 0) return `${pieces} stk`;
    if (pieces === 0) return `${trays} brett`;
    return `${trays} brett + ${pieces} stk`;
  };

  // Calculate totals
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalPacked = products.filter(p => p.progress === 100).length;
  const overallProgress = totalProducts > 0 ? Math.round((totalPacked / totalProducts) * 100) : 0;

  // Selected products data
  const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'not_started', label: 'Ikke startet' },
    { value: 'in_progress', label: 'Pågår' },
    { value: 'completed', label: 'Ferdig' },
  ];

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-4">
        {/* Search and filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Søk etter produktnavn eller varenummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredProducts.length} produkter
            </span>
            
            <Popover open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto gap-2">
                  <Keyboard className="h-4 w-4" />
                  Hurtigtaster
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                  <h4 className="font-semibold">Hurtigtaster</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Naviger mellom rader</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs">↑</kbd>
                        <span>/</span>
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs">↓</kbd>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Velg/avvelg produkt</span>
                      <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hopp til neste valgte</span>
                      <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Tab</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gå direkte til pakking</span>
                      <kbd className="px-2 py-0.5 bg-muted rounded text-xs">Dobbeltklikk</kbd>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filterStatus === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(option.value)}
                className={cn(
                  filterStatus === option.value && option.value === 'all' && 'bg-primary',
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Table */}
        <div ref={tableRef} className="rounded-lg border bg-card">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12">Velg</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Produktnavn
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('product_number')}
                  >
                    <div className="flex items-center gap-1">
                      Vnr.
                      {sortField === 'product_number' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center gap-1">
                      Antall
                      {sortField === 'quantity' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('customers')}
                  >
                    <div className="flex items-center gap-1">
                      Kunder
                      {sortField === 'customers' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 w-32"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1">
                      Fremgang
                      {sortField === 'progress' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <span>Ingen produkter funnet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => {
                    const isSelected = selectedProductIds.has(product.id);
                    const isFocused = index === focusedIndex;
                    
                    return (
                      <TableRow
                        key={product.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(index, el);
                        }}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected && 'bg-primary/10 border-l-4 border-l-primary',
                          isFocused && !isSelected && 'bg-muted/50',
                          product.progress === 100 && 'opacity-60'
                        )}
                        onClick={() => toggleProductSelection(product.id)}
                        onDoubleClick={() => handleDoubleClick(product.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              isSelected && 'bg-primary border-primary text-primary-foreground'
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.product_number}</TableCell>
                        <TableCell>
                          {product.category_name && (
                            <Badge variant="outline">{product.category_name}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {getQuantityDisplay(product.totalQuantity, product.pieces_per_tray)}
                        </TableCell>
                        <TableCell>{product.totalOrders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={product.progress} className="h-2 w-16" />
                            <span className="text-sm text-muted-foreground w-10">{product.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.progress)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
      
      {/* Right sidebar - Selected products */}
      <div className="w-80 space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Valgte produkter</h3>
            <Badge variant="secondary">{selectedProducts.length}/{totalProducts}</Badge>
          </div>
          
          {selectedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Velg produkter fra listen for å starte pakking
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 group"
                  >
                    <div className="w-1 h-full bg-primary rounded-full self-stretch" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getQuantityDisplay(product.totalQuantity, product.pieces_per_tray)} • {product.totalOrders} kunder
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromSelection(product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <Button
            className="w-full mt-4 gap-2"
            size="lg"
            disabled={selectedProducts.length === 0}
            onClick={() => onStartPacking(Array.from(selectedProductIds))}
          >
            <Package className="h-5 w-5" />
            Start pakking ({selectedProducts.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
