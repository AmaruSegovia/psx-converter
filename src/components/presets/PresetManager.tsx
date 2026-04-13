import { useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PresetCard } from './PresetCard';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

export function PresetSaveDialog() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const savePreset = useConverterStore((s) => s.savePreset);

  const handleSave = () => {
    if (!name.trim()) return;
    savePreset(name.trim());
    toast.success(`Preset "${name.trim()}" saved`);
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-xs" />}>
        {t('preset.save')}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('preset.saveTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('preset.namePlaceholder')}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" onClick={handleSave}>{t('preset.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PresetLoadDialog() {
  const { t } = useTranslation();
  const presets = useConverterStore((s) => s.presets);
  const loadPreset = useConverterStore((s) => s.loadPreset);
  const [open, setOpen] = useState(false);

  const handleLoad = (id: string, name: string) => {
    loadPreset(id);
    toast.success(`Loaded "${name}"`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-xs" />}>
        {t('preset.load')}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('preset.loadTitle')}</DialogTitle>
        </DialogHeader>
        {presets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('preset.noPresets')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
            {presets.map((p) => (
              <div key={p.id} onClick={() => handleLoad(p.id, p.name)}>
                <PresetCard
                  id={p.id}
                  name={p.name}
                  thumbnail={p.thumbnail}
                  createdAt={p.createdAt}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
