import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { Bakery } from '@/hooks/useBakeries';

const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  short_id: z.string().min(1, 'Required').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface BakeryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bakery: Bakery | null;
  onSave: (data: FormData) => Promise<void>;
  isPending: boolean;
}

export function BakeryDialog({ open, onOpenChange, bakery, onSave, isPending }: BakeryDialogProps) {
  const { t } = useTranslation();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      short_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (bakery) {
      form.reset({
        name: bakery.name,
        short_id: bakery.short_id,
        is_active: bakery.is_active ?? true,
      });
    } else {
      form.reset({
        name: '',
        short_id: '',
        is_active: true,
      });
    }
  }, [bakery, form]);

  // Auto-generate short_id from name
  const watchName = form.watch('name');
  useEffect(() => {
    if (!bakery && watchName) {
      const shortId = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);
      form.setValue('short_id', shortId);
    }
  }, [watchName, bakery, form]);

  const handleSubmit = async (data: FormData) => {
    await onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {bakery ? t('bakeries.editBakery') : t('bakeries.addBakery')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bakeries.bakeryName')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bakeri AS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bakeries.shortId')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="bakeri-as" disabled={!!bakery} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t('bakeries.active')}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
