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

export function TabDither() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const d = DEFAULT_SETTINGS;

  const alphaChanged = settings.alphaThreshold !== d.alphaThreshold;
  const ditherAmtChanged = Math.abs(settings.ditherAmount - d.ditherAmount) > 0.005;

  return (
    <div className="space-y-5">
      {/* Transparency mode */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Label className="text-[11px]">{t('dither.transparencyMode')}</Label>
        </div>
        <Select value={settings.transparencyMode}
          onValueChange={(v) => { if (v) updateSettings({ transparencyMode: v as typeof settings.transparencyMode }); }}>
          <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('dither.transparencyNone')}</SelectItem>
            <SelectItem value="threshold">{t('dither.transparencyThreshold')}</SelectItem>
            <SelectItem value="color-key">{t('dither.transparencyColorKey')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alpha threshold — only when mode = threshold */}
      {settings.transparencyMode === 'threshold' && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <ChangedDot show={alphaChanged} />
              <Label className="text-[11px]">{t('dither.alphaThreshold')}</Label>
            </div>
            <EditableValue
              value={settings.alphaThreshold}
              min={0}
              max={255}
              step={1}
              defaultValue={d.alphaThreshold}
              onChange={(v) => updateSettings({ alphaThreshold: v })}
            />
          </div>
          <Slider value={[settings.alphaThreshold]} onValueChange={(val) => updateSettings({ alphaThreshold: sv(val) })}
            min={0} max={255} step={1} />
        </div>
      )}

      {/* Color key — only when mode = color-key */}
      {settings.transparencyMode === 'color-key' && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Label className="text-[11px]">{t('dither.colorKey')}</Label>
            <InfoTip text={t('dither.colorKeyTip')} />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded border border-border shrink-0"
              style={{ backgroundColor: settings.colorKeyHex }}
            />
            <input
              type="color"
              value={settings.colorKeyHex}
              onChange={(e) => updateSettings({ colorKeyHex: e.target.value })}
              className="w-9 h-9 rounded border border-border cursor-pointer bg-transparent p-0.5"
            />
            <span className="text-[11px] font-mono text-muted-foreground">{settings.colorKeyHex.toUpperCase()}</span>
          </div>
        </div>
      )}

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
            <ChangedDot show={ditherAmtChanged} />
            <Label className="text-[11px]">{t('dither.amount')}</Label>
          </div>
          <EditableValue
            value={settings.ditherAmount}
            min={0}
            max={1}
            step={0.01}
            defaultValue={d.ditherAmount}
            onChange={(v) => updateSettings({ ditherAmount: v })}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <Slider value={[settings.ditherAmount]} onValueChange={(val) => updateSettings({ ditherAmount: sv(val) })}
          min={0} max={1} step={0.01} />
      </div>
    </div>
  );
}
