import { useEffect } from 'react';
import { toast } from 'sonner';

export default function ToastListener() {
  useEffect(() => {
    const handleToast = (event) => {
      const { message, type = 'info' } = event.detail;
      
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast(message);
      }
    };

    window.addEventListener('showToast', handleToast);
    return () => window.removeEventListener('showToast', handleToast);
  }, []);

  return null;
}