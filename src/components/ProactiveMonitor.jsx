import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProactiveMonitor() {
  useEffect(() => {
    let intervalId;

    const runBackgroundScan = async () => {
      try {
        const user = await base44.auth.me();
        
        // Only run for admins
        if (!user || user.role !== 'admin') return;

        const response = await base44.functions.invoke('systemDiagnostics', {
          action: 'proactive_scan'
        });

        const scan = response.data;
        
        // Alert on critical issues
        if (scan.severity_summary.critical > 0) {
          toast.error(
            `🚨 ${scan.severity_summary.critical} critical system issues detected!`,
            { duration: 10000 }
          );
        }

        // Success notification for auto-healed issues
        if (scan.auto_healing.fixed_count > 0) {
          toast.success(
            `✅ Auto-healed ${scan.auto_healing.fixed_count} issues in background`,
            { duration: 5000 }
          );
        }

      } catch (error) {
        console.error('Background monitoring error:', error);
        // Don't show errors to users - silent fail to prevent UI disruption
      }
    };

    // Run initial scan after 30 seconds (reduced frequency)
    const initialTimeout = setTimeout(runBackgroundScan, 30000);
    
    // Then run every 10 minutes (reduced from 5)
    intervalId = setInterval(runBackgroundScan, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  return null; // Invisible component
}