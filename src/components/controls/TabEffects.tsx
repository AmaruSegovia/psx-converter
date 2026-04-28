import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTip } from '@/components/ui/info-tip';
import { EditableValue } from '@/components/ui/editable-value';
import { ChangedDot } from '@/components/ui/changed-dot';
import { DEFAULT_SETTINGS } from '@/types';

interface SliderControlProps {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  tip?: string;
}

function SliderControl({ label, value, defaultValue, onChange, min, max, step, format, tip }: SliderControlProps) {
  const isChanged = Math.abs(value - defaultValue) > step * 0.5;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <ChangedDot show={isChanged} />
          <Label className="text-[11px]">{label}</Label>
          {tip && <InfoTip text={tip} />}
        </div>
        <EditableValue
          value={value}
          min={min}
          max={max}
          step={step}
          defaultValue={defaultValue}
          onChange={onChange}
          format={format ?? ((v) => v.toFixed(2))}
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export function TabEffects() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const d = DEFAULT_SETTINGS;

  return (
    <div className="space-y-5">
      {/* Posterize */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <ChangedDot show={settings.posterize >= 2} />
            <Label className="text-[11px]">{t('colors.posterize')}</Label>
            <InfoTip text={t('colors.posterizeTip')} />
          </div>
          <EditableValue
            value={settings.posterize}
            min={0}
            max={8}
            step={1}
            defaultValue={d.posterize}
            onChange={(v) => updateSettings({ posterize: v })}
            format={(v) => v === 0 ? 'Off' : String(v)}
          />
        </div>
        <Slider
          value={[settings.posterize]}
          onValueChange={(val) => updateSettings({ posterize: Array.isArray(val) ? val[0] : val })}
          min={0}
          max={8}
          step={1}
        />
      </div>

      {/* Film Grain */}
      <div>
        <SliderControl
          label={t('effects.grain')}
          tip={t('effects.grainTip')}
          value={settings.grainAmount}
          defaultValue={d.grainAmount}
          onChange={(v) => updateSettings({ grainAmount: v })}
          min={0} max={1} step={0.01}
          format={(v) => v === 0 ? 'Off' : `${Math.round(v * 100)}%`}
        />
        {settings.grainAmount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                if (settings.grainSeedLocked) {
                  updateSettings({ grainSeedLocked: false });
                } else {
                  const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
                  updateSettings({ grainSeed: seed, grainSeedLocked: true });
                }
              }}
              className={`flex items-center gap-1.5 text-[11px] px-2 h-6 rounded border transition-colors ${
                settings.grainSeedLocked
                  ? 'border-primary/60 text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={settings.grainSeedLocked}
              aria-label={settings.grainSeedLocked ? t('effects.grainSeedUnlock') : t('effects.grainSeedLock')}
              title={settings.grainSeedLocked ? t('effects.grainSeedUnlock') : t('effects.grainSeedLock')}
            >
              <svg aria-hidden="true" focusable="false" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {settings.grainSeedLocked ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 019.9-1" />
                  </>
                )}
              </svg>
              {settings.grainSeedLocked ? t('effects.grainSeedLocked') : t('effects.grainSeedRandom')}
            </button>
            {settings.grainSeedLocked && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
                    updateSettings({ grainSeed: seed });
                  }}
                  className="text-[10px] font-mono text-muted-foreground/70 hover:text-primary transition-colors"
                  title={t('effects.grainSeedRegenerate')}
                  aria-label={t('effects.grainSeedRegenerate')}
                >
                  {settings.grainSeed.toString(16).padStart(8, '0')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* CRT Effect */}
      <div className="pt-3 border-t border-border space-y-5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="crt-enabled"
            checked={settings.crtEnabled}
            onCheckedChange={(v) => updateSettings({ crtEnabled: !!v })}
          />
          <Label htmlFor="crt-enabled" className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {t('colors.crt')}
          </Label>
        </div>

        {settings.crtEnabled && (
          <>
            <SliderControl
              label={t('colors.scanlines')}
              value={settings.crtScanlines}
              defaultValue={d.crtScanlines}
              onChange={(v) => updateSettings({ crtScanlines: v })}
              min={0} max={0.5} step={0.01}
            />
            <SliderControl
              label={t('colors.rgbShift')}
              value={settings.crtRgbShift}
              defaultValue={d.crtRgbShift}
              onChange={(v) => updateSettings({ crtRgbShift: v })}
              min={0} max={5} step={0.1}
              format={(v) => `${v.toFixed(1)}px`}
            />
            <SliderControl
              label={t('colors.vignette')}
              value={settings.crtVignette}
              defaultValue={d.crtVignette}
              onChange={(v) => updateSettings({ crtVignette: v })}
              min={0} max={0.8} step={0.01}
            />
          </>
        )}
      </div>
    </div>
  );
}
