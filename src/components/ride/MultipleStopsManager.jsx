import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MultipleStopsManager({ ride, currentUser, isDriver }) {
  const [currentStop, setCurrentStop] = useState(null);
  const [waitTimer, setWaitTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (!timerActive || !currentStop) return;
    
    const interval = setInterval(() => {
      setWaitTimer(prev => {
        if (prev >= 420) { // 7 minutes = 420 seconds
          clearInterval(interval);
          return 420;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, currentStop]);

  const startWaitTimer = (stop, index) => {
    setCurrentStop({ ...stop, index });
    setWaitTimer(0);
    setTimerActive(true);
    
    // Update stop with start time
    base44.entities.RideRequest.update(ride.id, {
      stops: ride.stops.map((s, i) => 
        i === index ? { ...s, wait_start_time: new Date().toISOString() } : s
      )
    });
  };

  const completeStop = async (index) => {
    const updatedStops = ride.stops.map((s, i) => 
      i === index ? { ...s, completed: true, wait_time_minutes: Math.floor(waitTimer / 60) } : s
    );

    await base44.entities.RideRequest.update(ride.id, {
      stops: updatedStops
    });

    setTimerActive(false);
    setCurrentStop(null);
    toast.success('Stop completed!');
  };

  const terminateRide = async () => {
    if (!confirm('Terminate ride due to excessive wait time? You will keep the full fare.')) return;

    await base44.entities.RideRequest.update(ride.id, {
      status: 'terminated',
      termination_reason: `Excessive wait time at stop (${Math.floor(waitTimer / 60)} minutes exceeded 7-minute policy)`,
      end_time: new Date().toISOString()
    });

    toast.success('Ride terminated. Fare retained per policy.');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOverTime = waitTimer > 420;
  const warningTime = waitTimer > 360; // Warn at 6 minutes

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-purple-400" />
        Route Stops ({ride.stops?.filter(s => s.completed).length || 0}/{ride.stops?.length || 0})
      </h3>

      {ride.stops?.map((stop, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-4 rounded-xl border ${
            stop.completed 
              ? 'bg-green-500/10 border-green-500/30' 
              : currentStop?.index === index
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold">Stop {index + 1}</span>
                {stop.completed && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
              <p className="text-gray-300 text-sm">{stop.address}</p>
            </div>
            
            {stop.completed && (
              <span className="text-green-400 text-xs">
                Wait: {stop.wait_time_minutes}m
              </span>
            )}
          </div>

          {/* Timer UI for current stop */}
          {currentStop?.index === index && timerActive && isDriver && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className={`text-center p-4 rounded-xl ${
                isOverTime ? 'bg-red-500/20 border-2 border-red-500' :
                warningTime ? 'bg-yellow-500/20 border-2 border-yellow-500' :
                'bg-blue-500/10 border border-blue-500/30'
              }`}>
                <div className={`text-4xl font-mono font-bold mb-2 ${
                  isOverTime ? 'text-red-400' :
                  warningTime ? 'text-yellow-400' :
                  'text-white'
                }`}>
                  {formatTime(waitTimer)}
                </div>
                <p className={`text-sm ${
                  isOverTime ? 'text-red-300' :
                  warningTime ? 'text-yellow-300' :
                  'text-gray-400'
                }`}>
                  {isOverTime ? '⚠️ Time exceeded - may terminate' :
                   warningTime ? '⏰ Approaching 7-minute limit' :
                   '7-minute wait limit'}
                </p>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => completeStop(index)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Stop
                </Button>
                
                {isOverTime && (
                  <Button
                    onClick={terminateRide}
                    variant="destructive"
                    className="flex-1"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Terminate Ride
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Start wait button */}
          {!stop.completed && !timerActive && isDriver && currentStop?.index !== index && (
            <Button
              onClick={() => startWaitTimer(stop, index)}
              size="sm"
              className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              Arrive at Stop
            </Button>
          )}
        </motion.div>
      ))}

      {ride.stops?.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">No additional stops</p>
      )}
    </div>
  );
}