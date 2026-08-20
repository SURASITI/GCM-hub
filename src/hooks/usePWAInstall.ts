import { useState, useEffect } from 'react';

// Extend the Window interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  // We'll always show the button unless installed, to provide fallback instructions
  const isInstallable = !isInstalled;

  useEffect(() => {
    // Check if it's already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      // Log install to analytics
      console.log('PWA was installed');
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      if (window.self !== window.top) {
        alert('การติดตั้ง PWA ไม่สามารถทำได้ขณะอยู่ในหน้าต่างพรีวิว (Preview)\n\nกรุณากดปุ่ม "Open in new tab" (เปิดในแท็บใหม่) ที่แถบด้านบนสุดของหน้าต่างนี้ เพื่อเปิดแอปแบบเต็มจอ แล้วกดปุ่มติดตั้งอีกครั้ง');
        return;
      }

      // Fallback for iOS or Desktop where event didn't fire
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert('สำหรับการติดตั้งบน iOS (iPhone/iPad): \nแตะปุ่ม Share (แชร์) ด้านล่าง จากนั้นเลือก "Add to Home Screen" (เพิ่มไปยังหน้าจอโฮม)');
      } else {
        alert('ไม่สามารถติดตั้งแบบอัตโนมัติได้\n\nเพื่อติดตั้งแอปบนคอมพิวเตอร์: \nกรุณากดไอคอน "ติดตั้งแอป (Install)" ที่อยู่มุมขวาบนของแถบที่อยู่เว็บ (Address Bar) ของเบราว์เซอร์ (Google Chrome, Edge, Safari)\nหรือไปที่เมนูของเบราว์เซอร์ > "ติดตั้งแอป" (Install / Add to Desktop)');
      }
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return { isInstallable, isInstalled, promptInstall };
}
