import { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChangedDot } from '@/components/ui/changed-dot';
import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HoverTooltip } from '@/components/ui/hover-tooltip';
import { buildShareUrl } from '@/lib/shareLink';
import { tabsWithChanges } from '@/lib/historyLabels';
import { DEFAULT_SETTINGS } from '@/types';
import { TabSample } from '@/components/controls/TabSample';
import { TabDither } from '@/components/controls/TabDither';
// Palette tab carries react-colorful — lazy-load to shrink initial bundle.
const TabPalette = lazy(() =>
  import('@/components/controls/TabPalette').then((m) => ({ default: m.TabPalette }))
);
import { TabColors } from '@/components/controls/TabColors';
import { TabEffects } from '@/components/controls/TabEffects';
import { PresetSaveDialog, PresetLoadDialog } from '@/components/presets/PresetManager';
import { CAFECITO_URL } from '@/components/donate/DonateButton';
import { subscribeDonatePulse } from '@/components/donate/donateState';
import { useUndoRedo, setPendingHistoryLabel } from '@/hooks/useUndoRedo';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const TAB_DOT_CLASSNAME = 'absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary';

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const { t } = useTranslation();
  const activeTab = useConverterStore((s) => s.activeTab);
  const setActiveTab = useConverterStore((s) => s.setActiveTab);
  const settings = useConverterStore((s) => s.settings);
  const resetSettings = useConverterStore((s) => s.resetSettings);
  const changedTabs = tabsWithChanges(settings, DEFAULT_SETTINGS);
  const { undo, redo, historyIndex, historyLength, navigateHistory, clearHistory, getEntryLabel } = useUndoRedo();
  const currentLabel = historyIndex >= 0 ? getEntryLabel(historyIndex) : '';
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [donatePulse, setDonatePulse] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const unsub = subscribeDonatePulse(() => {
      setDonatePulse(false);
      // next frame to retrigger animation if pulse fires while still active
      requestAnimationFrame(() => setDonatePulse(true));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setDonatePulse(false), 1800);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  const handleResetConfirm = () => {
    setPendingHistoryLabel('Reset');
    resetSettings();
    toast.success(t('toast.settingsReset'));
    setShowResetConfirm(false);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-background/60 backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}
      <aside
        data-tour="sidebar"
        aria-label="Settings sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-30 md:z-auto
          w-[85vw] max-w-[420px] md:w-[420px]
          border-r border-border flex flex-col bg-card/95 md:bg-card/60 backdrop-blur-sm
          transform transition-transform duration-200
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
      <div className="flex flex-col px-3 pt-2 pb-1.5 border-b border-border gap-1">
        {/* Row 1: presets + share + donate (donate at far right with breathing room) */}
        <div className="flex items-center gap-1.5">
          <PresetLoadDialog />
          <PresetSaveDialog />
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 gap-1 shrink-0"
            onClick={async () => {
              const settings = useConverterStore.getState().settings;
              const url = buildShareUrl(settings);
              try {
                await navigator.clipboard.writeText(url);
                if (url.length > 2000) toast.warning(t('toast.linkTooLong'));
                else toast.success(t('toast.linkCopied'));
              } catch {
                toast.error(t('toast.copyFailed'));
              }
            }}
            title={t('share.copy')}
            aria-label={t('share.copy')}
          >
            <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.72" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            {t('share.button')}
          </Button>
        </div>
        {/* Row 2: undo/redo + reset */}
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-muted-foreground" onClick={undo} title={t('sidebar.undoTitle')} aria-label={t('sidebar.undoTitle')}>
            <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 10h13a4 4 0 010 8H7" /><path d="M3 10l4-4M3 10l4 4" /></svg>
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-muted-foreground" onClick={redo} title={t('sidebar.redoTitle')} aria-label={t('sidebar.redoTitle')}>
            <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10H8a4 4 0 000 8h10" /><path d="M21 10l-4-4M21 10l-4 4" /></svg>
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setShowResetConfirm(true)}
          >
            {t('sidebar.reset')}
          </Button>
        </div>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('reset.title')}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">{t('reset.description')}</p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setShowResetConfirm(false)}>{t('reset.cancel')}</Button>
            <Button size="sm" variant="destructive" className="text-[11px]" onClick={handleResetConfirm}>{t('reset.confirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History timeline */}
      {historyLength > 1 && (
        <div className="px-4 py-1.5 border-b border-border flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground/50 shrink-0">{t('sidebar.history')}</span>
            <div className="flex-1 flex items-center gap-px h-3">
              {Array.from({ length: historyLength }, (_, i) => (
                <HoverTooltip
                  key={i}
                  label={`${i + 1}/${historyLength} — ${getEntryLabel(i)}`}
                  className="flex-1 inline-flex"
                >
                  <button
                    onClick={() => navigateHistory(i)}
                    aria-label={`${i + 1}/${historyLength} — ${getEntryLabel(i)}`}
                    className={`w-full h-1.5 rounded-full transition-colors min-w-[3px] hover:h-2 ${
                      i === historyIndex ? 'bg-primary' :
                      i < historyIndex ? 'bg-primary/30' : 'bg-muted-foreground/15'
                    }`}
                  />
                </HoverTooltip>
              ))}
            </div>
            <button
              onClick={clearHistory}
              className="text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
              title={t('sidebar.clearHistory')}
            >
              ✕
            </button>
            <span className="text-[9px] text-muted-foreground/40 font-mono shrink-0">{historyIndex + 1}/{historyLength}</span>
          </div>
          {currentLabel && (
            <span className="text-[10px] text-muted-foreground/60 truncate" title={currentLabel}>
              {currentLabel}
            </span>
          )}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList className="grid grid-cols-5 mx-4 mt-3 bg-muted/50 h-9">
          <TabsTrigger value="sample" className="relative text-[10px] gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary pl-1 pr-3">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l6-6 4 4 8-8" /></svg>
            {t('tab.resize')}
            <ChangedDot show={changedTabs.sample} className={TAB_DOT_CLASSNAME} />
          </TabsTrigger>
          <TabsTrigger value="dither" className="relative text-[10px] gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary pl-1 pr-3">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="6" cy="6" r="1.5" /><circle cx="18" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></svg>
            {t('tab.dither')}
            <ChangedDot show={changedTabs.dither} className={TAB_DOT_CLASSNAME} />
          </TabsTrigger>
          <TabsTrigger value="palette" className="relative text-[10px] gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary pl-1 pr-3">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="2" /><circle cx="8" cy="14" r="2" /><circle cx="16" cy="14" r="2" /></svg>
            {t('tab.palette')}
            <ChangedDot show={changedTabs.palette} className={TAB_DOT_CLASSNAME} />
          </TabsTrigger>
          <TabsTrigger value="colors" className="relative text-[10px] gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary pl-1 pr-3">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /><path d="M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" /></svg>
            {t('tab.colors')}
            <ChangedDot show={changedTabs.colors} className={TAB_DOT_CLASSNAME} />
          </TabsTrigger>
          <TabsTrigger value="effects" className="relative text-[10px] gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary pl-1 pr-3">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75z" /><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" /></svg>
            {t('tab.effects')}
            <ChangedDot show={changedTabs.effects} className={TAB_DOT_CLASSNAME} />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 pb-8">
            <TabsContent value="sample" className="mt-0"><TabSample /></TabsContent>
            <TabsContent value="dither" className="mt-0"><TabDither /></TabsContent>
            <TabsContent value="palette" className="mt-0">
              <Suspense fallback={<div className="text-xs text-muted-foreground/60 py-2">{t('preset.processing')}</div>}>
                <TabPalette />
              </Suspense>
            </TabsContent>
            <TabsContent value="colors" className="mt-0"><TabColors /></TabsContent>
            <TabsContent value="effects" className="mt-0"><TabEffects /></TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
      {/* Donate footer — pitch personal 2 líneas, toda la card clickeable */}
      <a
        href={CAFECITO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={t('donate.creditTooltip')}
        aria-label={t('donate.creditTooltip')}
        className={`group border-t border-border px-3 py-2.5 shrink-0 text-center select-none flex flex-col items-center gap-0.5 no-underline transition-all duration-200 hover:bg-violet-500/5 hover:-translate-y-px ${donatePulse ? 'donate-pulse' : ''}`}
      >
        <span className="text-[11px] text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
          {t('donate.creditQuestion')}
        </span>
        <span className="text-xs font-medium text-foreground/85 group-hover:text-violet-300 transition-colors inline-flex items-center gap-1.5">
          <span aria-hidden="true">🧉</span>
          <span className="group-hover:underline underline-offset-2 decoration-violet-400/60">{t('donate.creditCta')}</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
        </span>
      </a>
      </aside>
    </>
  );
}
