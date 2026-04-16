import { useConverterStore } from '@/store/converterStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

interface PresetCardProps {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  thumbnailColors?: string[];
  aspectRatio?: number;
  createdAt?: number;
  isFactory?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

export function PresetCard({
  id, name, description, thumbnail, thumbnailColors, aspectRatio, createdAt, isFactory, isLoading, onClick,
}: PresetCardProps) {
  const { t } = useTranslation();
  const loadPreset = useConverterStore((s) => s.loadPreset);
  const deletePreset = useConverterStore((s) => s.deletePreset);

  const handleLoad = () => {
    if (onClick) onClick();
    else loadPreset(id);
  };

  const gradientFrom = thumbnailColors?.[0] ?? '#2a2a2a';
  const gradientTo = thumbnailColors?.[thumbnailColors.length - 1] ?? '#4a4a4a';

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card relative group hover:border-primary/40 transition-colors">
      {isFactory && (
        <div className="absolute top-1.5 right-1.5 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] leading-none px-1.5 py-1 rounded-sm">
          ★
        </div>
      )}
      <div
        className="bg-muted cursor-pointer overflow-hidden relative"
        style={{ aspectRatio: aspectRatio ?? 1 }}
        onClick={handleLoad}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground/70 rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
          >
            <span className="text-[11px] font-semibold text-white/90 px-2 text-center drop-shadow-md">
              {name}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold leading-tight truncate">{name}</p>
        {description ? (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug" title={description}>
            {description}
          </p>
        ) : createdAt ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(createdAt).toLocaleDateString()}
          </p>
        ) : null}
        {!isFactory && (
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] h-6 w-full mt-1.5 text-destructive/70 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); deletePreset(id); toast.success(`Deleted "${name}"`); }}
          >
            {t('preset.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
