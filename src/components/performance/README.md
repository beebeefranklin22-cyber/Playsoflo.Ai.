# Performance Optimization Components

## Overview
These components help optimize app performance, reduce loading times, and improve responsiveness.

## Components

### PerformanceMonitor
Tracks and logs performance metrics (FPS, memory, network speed).
- Only enabled in development mode
- Auto-reports critical issues to backend
- Shows real-time metrics overlay

**Usage:**
```jsx
<PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
```

### OptimizedImage
Lazy-loaded images with blur placeholder and error fallback.
- Intersection Observer for lazy loading
- Progressive loading with animations
- Automatic error handling

**Usage:**
```jsx
<OptimizedImage 
  src="/image.jpg" 
  alt="Description"
  priority={false} // Set true for above-fold images
  width={400}
  height={300}
/>
```

### VirtualizedList
Renders only visible items for long lists (thousands of items).
- Windowing technique
- Configurable overscan
- Smooth scrolling

**Usage:**
```jsx
<VirtualizedList
  items={largeArray}
  itemHeight={100}
  containerHeight={600}
  renderItem={(item, index) => <ItemComponent item={item} />}
/>
```

### LazyLoadWrapper
Code-splitting wrapper with loading state.
- React.lazy + Suspense
- Custom fallback UI
- Error boundaries

**Usage:**
```jsx
<LazyLoadWrapper loader={() => import('./HeavyComponent')} />
```

### useOptimizedQuery
Enhanced react-query hook with smart caching and retry logic.
- Automatic retry with exponential backoff
- Network reconnect handling
- Configurable cache times

**Usage:**
```jsx
const { data, isLoading } = useOptimizedQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 60000,
  retry: 3
});
```

## Best Practices
1. Use `OptimizedImage` for all images
2. Virtualize lists with 50+ items
3. Lazy load heavy components
4. Monitor performance in development
5. Set appropriate cache times for queries