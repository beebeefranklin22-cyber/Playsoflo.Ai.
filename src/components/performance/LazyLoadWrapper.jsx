import { Suspense, lazy } from "react";
import { motion } from "framer-motion";

/**
 * Lazy Load Wrapper with Loading State
 * Use for code-splitting heavy components
 */
export default function LazyLoadWrapper({ 
  loader, 
  fallback,
  errorFallback,
  ...props 
}) {
  const LazyComponent = lazy(loader);

  const defaultFallback = (
    <div className="flex items-center justify-center p-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Usage Example:
 * 
 * const HeavyComponent = () => (
 *   <LazyLoadWrapper 
 *     loader={() => import('./HeavyComponent')}
 *   />
 * );
 */