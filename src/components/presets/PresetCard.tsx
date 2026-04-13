import { useConverterStore } from '@/store/converterStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

interface PresetCardProps {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: number;
}

export function PresetCard({ id, name, thumbnail, createdAt }: PresetCardProps) {
  const { t } = useTranslation();
  const loadPreset = useConverterStore((s) => s.loadPreset);
  const deletePreset = useConverterStore((s) => s.deletePreset);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <div
        className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
        onClick={() => loadPreset(id)}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No preview</span>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="text-[10px] h-6 w-full mt-1 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); deletePreset(id); toast.success(`Deleted "${name}"`); }}
        >
          {t('preset.delete')}
        </Button>
      </div>
    </div>
  );
}
