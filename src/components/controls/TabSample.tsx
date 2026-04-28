import { useCallback } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { InfoTip } from '@/components/ui/info-tip';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditableValue } from '@/components/ui/editable-value';
import { ChangedDot } from '@/components/ui/changed-dot';
import { DEFAULT_SETTINGS } from '@/types';

const sv = (val: number | readonly number[]) => Array.isArray(val) ? val[0] : val;

const snapPow2 = (n: number) => Math.max(1, 2 ** Math.round(Math.log2(Math.max(1, n))));

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
  const lockAspect = settings.lockAspect;

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

  // Toggle lock — when activating, snap height to source aspect immediately
  // (instead of waiting for the user to move a slider).
  const handleToggleLock = useCallback(() => {
    if (!lockAspect) {
      if (isRelative) {
        updateSettings({ lockAspect: true, height: settings.width });
      } else {
        const h = Math.max(1, Math.round(settings.width / aspectRatio));
        updateSettings({ lockAspect: true, height: h });
      }
    } else {
      updateSettings({ lockAspect: false });
    }
  }, [lockAspect, isRelative, settings.width, aspectRatio, updateSettings]);

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

      {/* Target size preset (absolute mode only — gamedev workflow) */}
      {settings.sizeMode === 'absolute' && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label className="text-[11px]">{t('sample.targetPreset')}</Label>
            <InfoTip text={t('sample.targetPresetTip')} />
          </div>
          <Select
            value={(() => {
              const longSide = Math.max(settings.width, settings.height);
              const presets = [16, 32, 64, 128, 256, 512, 1024];
              if (!presets.includes(longSide)) return 'custom';
              if (lockAspect) {
                // Aspect-aware match: long-side equals preset and short-side
                // matches the source aspect within ±1px rounding.
                const expectedShort = aspectRatio >= 1
                  ? Math.max(1, Math.round(longSide / aspectRatio))
                  : Math.max(1, Math.round(longSide * aspectRatio));
                const actualShort = Math.min(settings.width, settings.height);
                return Math.abs(expectedShort - actualShort) <= 1 ? String(longSide) : 'custom';
              }
              // Lock off: dropdown only matches when output is a perfect square.
              return settings.width === longSide && settings.height === longSide
                ? String(longSide)
                : 'custom';
            })()}
            onValueChange={(v) => {
              if (!v || v === 'custom') return;
              const size = parseInt(v, 10);
              if (!size) return;
              if (lockAspect) {
                const w = aspectRatio >= 1 ? size : Math.max(1, Math.round(size * aspectRatio));
                const h = aspectRatio >= 1 ? Math.max(1, Math.round(size / aspectRatio)) : size;
                updateSettings({ width: w, height: h });
              } else {
                // No aspect lock → square output as the user requested.
                updateSettings({ width: size, height: size });
              }
            }}
          >
            <SelectTrigger className="h-9 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">{t('sample.targetCustom')}</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="32">32</SelectItem>
              <SelectItem value="64">64</SelectItem>
              <SelectItem value="128">128</SelectItem>
              <SelectItem value="256">256</SelectItem>
              <SelectItem value="512">512</SelectItem>
              <SelectItem value="1024">1024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Width + lock + Height */}
      <div className="flex gap-3 items-start">
        {/* Width & Height sliders */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-[11px]">{t('sample.width')}</Label>
              <div className="flex items-center gap-1.5">
                {!isRelative && (
                  <button
                    type="button"
                    onClick={() => setWidth(snapPow2(settings.width))}
                    className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors font-mono px-1"
                    title={t('sample.snapPow2Tip')}
                    aria-label={t('sample.snapPow2')}
                  >
                    ≈2ⁿ
                  </button>
                )}
                <EditableValue
                  value={settings.width}
                  suffix={isRelative ? '%' : 'px'}
                  min={1}
                  max={widthMax}
                  step={1}
                  onChange={setWidth}
                  className="text-[11px] text-primary font-mono hover:underline cursor-text tabular-nums"
                />
              </div>
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
              <div className="flex items-center gap-1.5">
                {!isRelative && (
                  <button
                    type="button"
                    onClick={() => setHeight(snapPow2(settings.height))}
                    className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors font-mono px-1"
                    title={t('sample.snapPow2Tip')}
                    aria-label={t('sample.snapPow2')}
                  >
                    ≈2ⁿ
                  </button>
                )}
                <EditableValue
                  value={settings.height}
                  suffix={isRelative ? '%' : 'px'}
                  min={1}
                  max={heightMax}
                  step={1}
                  onChange={setHeight}
                  className="text-[11px] text-primary font-mono hover:underline cursor-text tabular-nums"
                />
              </div>
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
          <AspectLockButton locked={lockAspect} onClick={handleToggleLock} lockTitle={t('sample.lockAspect')} unlockTitle={t('sample.unlockAspect')} />
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
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <ChangedDot show={Math.abs(settings.blurAmount - DEFAULT_SETTINGS.blurAmount) > 0.05} />
            <Label className="text-[11px]">{t('sample.blur')}</Label>
          </div>
          <EditableValue
            value={settings.blurAmount}
            min={0}
            max={5}
            step={0.1}
            defaultValue={DEFAULT_SETTINGS.blurAmount}
            onChange={(v) => updateSettings({ blurAmount: v })}
            format={(v) => v.toFixed(1)}
          />
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
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <ChangedDot show={Math.abs(settings.sharpenAmount - DEFAULT_SETTINGS.sharpenAmount) > 0.05} />
            <Label className="text-[11px]">{t('sample.sharpen')}</Label>
          </div>
          <EditableValue
            value={settings.sharpenAmount}
            min={0}
            max={5}
            step={0.1}
            defaultValue={DEFAULT_SETTINGS.sharpenAmount}
            onChange={(v) => updateSettings({ sharpenAmount: v })}
            format={(v) => v.toFixed(1)}
          />
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
