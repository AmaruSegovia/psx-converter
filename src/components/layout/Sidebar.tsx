import { toast } from 'sonner';
import { useConverterStore } from '@/store/converterStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TabSample } from '@/components/controls/TabSample';
import { TabDither } from '@/components/controls/TabDither';
import { TabPalette } from '@/components/controls/TabPalette';
import { TabColors } from '@/components/controls/TabColors';
import { PresetSaveDialog, PresetLoadDialog } from '@/components/presets/PresetManager';
import { useUndoRedo } from '@/hooks/useUndoRedo';

export function Sidebar() {
  const { t } = useTranslation();
  const activeTab = useConverterStore((s) => s.activeTab);
  const setActiveTab = useConverterStore((s) => s.setActiveTab);
  const resetSettings = useConverterStore((s) => s.resetSettings);
  const { undo, redo, historyIndex, historyLength, navigateHistory } = useUndoRedo();

  return (
    <div className="w-[420px] border-r border-border flex flex-col bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
        <PresetLoadDialog />
        <PresetSaveDialog />
        <Separator orientation="vertical" className="h-4 mx-1" />
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-muted-foreground" onClick={undo} title={t('sidebar.undoTitle')}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 10h13a4 4 0 010 8H7" /><path d="M3 10l4-4M3 10l4 4" /></svg>
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-muted-foreground" onClick={redo} title={t('sidebar.redoTitle')}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10H8a4 4 0 000 8h10" /><path d="M21 10l-4-4M21 10l-4 4" /></svg>
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => { resetSettings(); toast.success(t('toast.settingsReset')); }}
        >
          {t('sidebar.reset')}
        </Button>
      </div>

      {/* History timeline */}
      {historyLength > 1 && (
        <div className="px-4 py-1.5 border-b border-border flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground/50 shrink-0">{t('sidebar.history')}</span>
          <div className="flex-1 flex items-center gap-px h-3">
            {Array.from({ length: historyLength }, (_, i) => (
              <button
                key={i}
                onClick={() => navigateHistory(i)}
                className={`flex-1 h-1.5 rounded-full transition-colors min-w-[3px] ${
                  i === historyIndex ? 'bg-primary' :
                  i < historyIndex ? 'bg-primary/30' : 'bg-muted-foreground/15'
                }`}
                title={`${i + 1}/${historyLength}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground/40 font-mono shrink-0">{historyIndex + 1}/{historyLength}</span>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList className="grid grid-cols-4 mx-4 mt-3 bg-muted/50 h-9">
          <TabsTrigger value="sample" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l6-6 4 4 8-8" /></svg>
            {t('tab.resize')}
          </TabsTrigger>
          <TabsTrigger value="dither" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="6" cy="6" r="1.5" /><circle cx="18" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></svg>
            {t('tab.dither')}
          </TabsTrigger>
          <TabsTrigger value="palette" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="2" /><circle cx="8" cy="14" r="2" /><circle cx="16" cy="14" r="2" /></svg>
            {t('tab.palette')}
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /><path d="M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" /></svg>
            {t('tab.colors')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 pb-8">
            <TabsContent value="sample" className="mt-0"><TabSample /></TabsContent>
            <TabsContent value="dither" className="mt-0"><TabDither /></TabsContent>
            <TabsContent value="palette" className="mt-0"><TabPalette /></TabsContent>
            <TabsContent value="colors" className="mt-0"><TabColors /></TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
