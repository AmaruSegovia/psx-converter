import { useState, useCallback } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { InfoTip } from '@/components/ui/info-tip';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sv = (val: number | readonly number[]) => Array.isArray(val) ? val[0] : val;

/** Clickable number that becomes an input on click */
function EditableValue({
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = useCallback(() => {
    setDraft(String(value));
    setEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  }, [draft, min, max, onChange]);

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-16 h-5 text-[11px] text-right bg-muted border border-primary/50 rounded px-1 outline-none text-primary font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        min={min}
        max={max}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-[11px] text-primary font-mono hover:underline cursor-text tabular-nums"
      title="Click to edit"
    >
      {value}{suffix}
    </button>
  );
}

/** Lock/unlock aspect ratio icon button */
function AspectLockButton({ locked, onClick, lockTitle, unlockTitle }: { locked: boolean; onClick: () => void; lockTitle: string; unlockTitle: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded border transition-colors ${locked ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground/40 hover:text-muted-foreground'}`}
      title={locked ? unlockTitle : lockTitle}
    >
      {locked ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 019.9-1" />
        </svg>
      )}
    </button>
  );
}

export function TabSample() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const originalWidth = useConverterStore((s) => s.originalWidth);
  const originalHeight = useConverterStore((s) => s.originalHeight);
  const [lockAspect, setLockAspect] = useState(false);

  const isRelative = settings.sizeMode === 'relative';
  const widthMax = isRelative ? 100 : (originalWidth || 1024);
  const heightMax = isRelative ? 100 : (originalHeight || 1024);

  const aspectRatio = (originalWidth && originalHeight)
    ? originalWidth / originalHeight
    : 1;

  const setWidth = useCallback((w: number) => {
    if (lockAspect) {
      if (isRelative) {
        // In relative mode, same % for both = same aspect ratio
        updateSettings({ width: w, height: w });
      } else {
        const h = Math.max(1, Math.round(w / aspectRatio));
        updateSettings({ width: w, height: h });
      }
    } else {
      updateSettings({ width: w });
    }
  }, [lockAspect, aspectRatio, isRelative, updateSettings]);

  const setHeight = useCallback((h: number) => {
    if (lockAspect) {
      if (isRelative) {
        updateSettings({ height: h, width: h });
      } else {
        const w = Math.max(1, Math.round(h * aspectRatio));
        updateSettings({ height: h, width: w });
      }
    } else {
      updateSettings({ height: h });
    }
  }, [lockAspect, aspectRatio, isRelative, updateSettings]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          className={`flex-1 text-[11px] py-1.5 rounded border ${settings.sizeMode === 'absolute' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          onClick={() => {
            if (settings.sizeMode === 'absolute') return;
            const ow = originalWidth || 1024;
            const oh = originalHeight || 1024;
            updateSettings({
              sizeMode: 'absolute',
              width: Math.max(1, Math.round((settings.width / 100) * ow)),
              height: Math.max(1, Math.round((settings.height / 100) * oh)),
            });
          }}
        >
          {t('sample.absolute')}
        </button>
        <button
          className={`flex-1 text-[11px] py-1.5 rounded border ${settings.sizeMode === 'relative' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          onClick={() => {
            if (settings.sizeMode === 'relative') return;
            const ow = originalWidth || 1024;
            const oh = originalHeight || 1024;
            updateSettings({
              sizeMode: 'relative',
              width: Math.max(1, Math.min(100, Math.round((settings.width / ow) * 100))),
              height: Math.max(1, Math.min(100, Math.round((settings.height / oh) * 100))),
            });
          }}
        >
          {t('sample.relative')}
        </button>
      </div>

      {/* Width + lock + Height */}
      <div className="flex gap-3 items-start">
        {/* Width & Height sliders */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-[11px]">{t('sample.width')}</Label>
              <EditableValue
                value={settings.width}
                suffix={isRelative ? '%' : 'px'}
                min={1}
                max={widthMax}
                onChange={setWidth}
              />
            </div>
            <Slider
              value={[settings.width]}
              onValueChange={(val) => setWidth(sv(val))}
              min={1}
              max={widthMax}
              step={1}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-[11px]">{t('sample.height')}</Label>
              <EditableValue
                value={settings.height}
                suffix={isRelative ? '%' : 'px'}
                min={1}
                max={heightMax}
                onChange={setHeight}
              />
            </div>
            <Slider
              value={[settings.height]}
              onValueChange={(val) => setHeight(sv(val))}
              min={1}
              max={heightMax}
              step={1}
            />
          </div>
        </div>

        {/* Aspect lock button between the two */}
        <div className="flex flex-col items-center justify-center pt-5">
          <AspectLockButton locked={lockAspect} onClick={() => setLockAspect(!lockAspect)} lockTitle={t('sample.lockAspect')} unlockTitle={t('sample.unlockAspect')} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px]">{t('sample.sampleMode')}</Label>
          <InfoTip text={t('sample.sampleModeTip')} />
        </div>
        <Select
          value={settings.sampleMode}
          onValueChange={(v) => { if (v) updateSettings({ sampleMode: v as typeof settings.sampleMode }); }}
        >
          <SelectTrigger className="mt-1 h-9 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nearest">{t('sample.nearest')}</SelectItem>
            <SelectItem value="bilinear">{t('sample.bilinear')}</SelectItem>
            <SelectItem value="bicubic">{t('sample.bicubic')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <Label className="text-[11px]">{t('sample.blur')}</Label>
          <span className="text-[11px] text-muted-foreground">{settings.blurAmount.toFixed(1)}</span>
        </div>
        <Slider
          value={[settings.blurAmount]}
          onValueChange={(val) => updateSettings({ blurAmount: sv(val) })}
          min={0}
          max={5}
          step={0.1}
        />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <Label className="text-[11px]">{t('sample.sharpen')}</Label>
          <span className="text-[11px] text-muted-foreground">{settings.sharpenAmount.toFixed(1)}</span>
        </div>
        <Slider
          value={[settings.sharpenAmount]}
          onValueChange={(val) => updateSettings({ sharpenAmount: sv(val) })}
          min={0}
          max={5}
          step={0.1}
        />
      </div>
    </div>
  );
}
