import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileSelect({ value, onValueChange, children, placeholder, triggerClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Extract items from children
  const items = React.Children.toArray(children)
    .filter(child => child.type?.displayName === 'SelectItem')
    .map(child => ({
      value: child.props.value,
      label: child.props.children
    }));

  const selectedItem = items.find(item => item.value === value);

  if (!isMobile) {
    return children;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (window.NativeAppBridge?.triggerHaptic) {
            window.NativeAppBridge.triggerHaptic('light');
          }
          setIsOpen(true);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[44px]",
          triggerClassName
        )}
      >
        <span className={cn(!selectedItem && "text-muted-foreground")}>
          {selectedItem?.label || placeholder || "Select..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-center">
                  {placeholder || "Select an option"}
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
                {items.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (window.NativeAppBridge?.triggerHaptic) {
                        window.NativeAppBridge.triggerHaptic('light');
                      }
                      onValueChange(item.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-6 py-4 text-left flex items-center justify-between border-b border-gray-100 dark:border-gray-800 transition-colors min-h-[52px]",
                      value === item.value
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <span className="text-base">{item.label}</span>
                    {value === item.value && <Check className="h-5 w-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

MobileSelect.Item = function SelectItem({ value, children }) {
  return null;
};
MobileSelect.Item.displayName = 'SelectItem';