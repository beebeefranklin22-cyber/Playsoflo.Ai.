import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Generic lazy load wrapper with error boundary
export default function LazyLoadWrapper({ 
  loader, 
  fallback = <LoadingFallback />,
  errorFallback = <ErrorFallback />
}) {
  const [error, setError] = React.useState(null);

  const Component = React.useMemo(() => {
    try {
      return lazy(loader);
    } catch (err) {
      setError(err);
      return null;
    }
  }, [loader]);

  if (error || !Component) {
    return errorFallback;
  }

  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-red-400 mb-2">Failed to load component</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-sm text-purple-400 hover:underline"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}