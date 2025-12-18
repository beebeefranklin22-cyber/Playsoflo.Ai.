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
      }
    };

    // Run initial scan after 10 seconds
    const initialTimeout = setTimeout(runBackgroundScan, 10000);
    
    // Then run every 5 minutes
    intervalId = setInterval(runBackgroundScan, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  return null; // Invisible component
}