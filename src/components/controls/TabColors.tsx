import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
}

function SliderControl({ label, value, defaultValue, onChange, min, max, step, format }: SliderControlProps) {
  const isChanged = Math.abs(value - defaultValue) > step * 0.5;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <ChangedDot show={isChanged} />
          <Label className="text-[11px]">{label}</Label>
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

export function TabColors() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const d = DEFAULT_SETTINGS;

  return (
    <div className="space-y-5">
      <SliderControl label={t('colors.brightness')} value={settings.brightness} defaultValue={d.brightness}
        onChange={(v) => updateSettings({ brightness: v })} min={-1} max={1} step={0.01} />
      <SliderControl label={t('colors.contrast')} value={settings.contrast} defaultValue={d.contrast}
        onChange={(v) => updateSettings({ contrast: v })} min={0} max={3} step={0.01} />
      <SliderControl label={t('colors.saturation')} value={settings.saturation} defaultValue={d.saturation}
        onChange={(v) => updateSettings({ saturation: v })} min={0} max={3} step={0.01} />
      <SliderControl label={t('colors.hue')} value={settings.hue} defaultValue={d.hue}
        onChange={(v) => updateSettings({ hue: v })} min={-180} max={180} step={1}
        format={(v) => `${v}°`} />
      <SliderControl label={t('colors.gamma')} value={settings.gamma} defaultValue={d.gamma}
        onChange={(v) => updateSettings({ gamma: v })} min={0.1} max={3} step={0.01} />

      <div className="pt-3 border-t border-border space-y-5">
        <Label className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">{t('colors.tint')}</Label>
        <SliderControl label={t('colors.red')} value={settings.tintRed} defaultValue={d.tintRed}
          onChange={(v) => updateSettings({ tintRed: v })} min={0} max={255} step={1}
          format={(v) => String(Math.round(v))} />
        <SliderControl label={t('colors.green')} value={settings.tintGreen} defaultValue={d.tintGreen}
          onChange={(v) => updateSettings({ tintGreen: v })} min={0} max={255} step={1}
          format={(v) => String(Math.round(v))} />
        <SliderControl label={t('colors.blue')} value={settings.tintBlue} defaultValue={d.tintBlue}
          onChange={(v) => updateSettings({ tintBlue: v })} min={0} max={255} step={1}
          format={(v) => String(Math.round(v))} />
      </div>

      <div className="pt-3 border-t border-border space-y-5">
        <Label className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">{t('colors.levels')}</Label>
        <SliderControl label={t('colors.levelsInLow')} value={settings.levelsInLow} defaultValue={d.levelsInLow}
          onChange={(v) => updateSettings({ levelsInLow: v })} min={0} max={254} step={1}
          format={(v) => String(Math.round(v))} />
        <SliderControl label={t('colors.levelsInHigh')} value={settings.levelsInHigh} defaultValue={d.levelsInHigh}
          onChange={(v) => updateSettings({ levelsInHigh: v })} min={1} max={255} step={1}
          format={(v) => String(Math.round(v))} />
        <SliderControl label={t('colors.levelsOutLow')} value={settings.levelsOutLow} defaultValue={d.levelsOutLow}
          onChange={(v) => updateSettings({ levelsOutLow: v })} min={0} max={254} step={1}
          format={(v) => String(Math.round(v))} />
        <SliderControl label={t('colors.levelsOutHigh')} value={settings.levelsOutHigh} defaultValue={d.levelsOutHigh}
          onChange={(v) => updateSettings({ levelsOutHigh: v })} min={1} max={255} step={1}
          format={(v) => String(Math.round(v))} />
      </div>
    </div>
  );
}
