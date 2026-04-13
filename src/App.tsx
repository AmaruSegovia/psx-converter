import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <AppShell />
      <Toaster
        theme="dark"
        position="bottom-center"
        expand
        visibleToasts={4}
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
    </>
  );
}

export default App;
