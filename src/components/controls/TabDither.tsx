import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { InfoTip } from '@/components/ui/info-tip';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_SETTINGS } from '@/types';

const sv = (val: number | readonly number[]) => Array.isArray(val) ? val[0] : val;

export function TabDither() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const d = DEFAULT_SETTINGS;

  const alphaChanged = settings.alphaThreshold !== d.alphaThreshold;
  const ditherAmtChanged = Math.abs(settings.ditherAmount - d.ditherAmount) > 0.005;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            {alphaChanged && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <Label className="text-[11px]">{t('dither.alphaThreshold')}</Label>
          </div>
          <button className="text-[11px] text-muted-foreground font-mono tabular-nums hover:text-primary transition-colors"
            onClick={() => updateSettings({ alphaThreshold: d.alphaThreshold })}>
            {settings.alphaThreshold}
          </button>
        </div>
        <Slider value={[settings.alphaThreshold]} onValueChange={(val) => updateSettings({ alphaThreshold: sv(val) })}
          min={0} max={255} step={1} />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Label className="text-[11px]">{t('dither.distanceMetric')}</Label>
          <InfoTip text={t('dither.distanceMetricTip')} />
        </div>
        <Select value={settings.distanceMetric}
          onValueChange={(v) => { if (v) updateSettings({ distanceMetric: v as typeof settings.distanceMetric }); }}>
          <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="euclidean">Euclidean</SelectItem>
            <SelectItem value="manhattan">Manhattan</SelectItem>
            <SelectItem value="ciede2000">CIEDE2000</SelectItem>
            <SelectItem value="rgb-redmean">RGB Redmean</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Label className="text-[11px]">{t('dither.mode')}</Label>
          <InfoTip text={t('dither.modeTip')} />
        </div>
        <Select value={settings.ditherMode}
          onValueChange={(v) => { if (v) updateSettings({ ditherMode: v as typeof settings.ditherMode }); }}>
          <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="floyd-steinberg">Floyd-Steinberg</SelectItem>
            <SelectItem value="jarvis">Jarvis</SelectItem>
            <SelectItem value="bayer-2x2">Bayer 2x2</SelectItem>
            <SelectItem value="bayer-4x4">Bayer 4x4</SelectItem>
            <SelectItem value="bayer-8x8">Bayer 8x8</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            {ditherAmtChanged && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <Label className="text-[11px]">{t('dither.amount')}</Label>
          </div>
          <button className="text-[11px] text-muted-foreground font-mono tabular-nums hover:text-primary transition-colors"
            onClick={() => updateSettings({ ditherAmount: d.ditherAmount })}>
            {settings.ditherAmount.toFixed(2)}
          </button>
        </div>
        <Slider value={[settings.ditherAmount]} onValueChange={(val) => updateSettings({ ditherAmount: sv(val) })}
          min={0} max={1} step={0.01} />
      </div>
    </div>
  );
}
