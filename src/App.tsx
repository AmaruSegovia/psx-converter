import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Onboarding } from '@/components/Onboarding';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Toaster } from 'sonner';
import { consumeShareHashFromUrl } from '@/lib/shareLink';
import { useConverterStore } from '@/store/converterStore';
import { setPendingHistoryLabel } from '@/hooks/useUndoRedo';
import { t } from '@/lib/i18n';
import { setHeaderStatus } from '@/lib/headerStatus';

function App() {
  const reduce = useReducedMotion();

  // Apply settings shared via URL hash on first paint (#s=...).
  // Done as a layout-style effect so it runs before the user can interact.
  useEffect(() => {
    const incoming = consumeShareHashFromUrl();
    if (incoming) {
      setPendingHistoryLabel('Shared link');
      useConverterStore.getState().loadSettings(incoming);
      setHeaderStatus(t('toast.linkLoaded'));
    }
  }, []);
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
      <AppShell />
      <Onboarding />
      <Toaster
        theme="dark"
        position="top-center"
        visibleToasts={1}
        gap={8}
        duration={2500}
        toastOptions={{
          style: {
            background: 'oklch(0.17 0.008 280)',
            border: '1px solid oklch(1 0 0 / 8%)',
            color: 'oklch(0.92 0 0)',
            fontSize: '12px',
          },
        }}
      />
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
