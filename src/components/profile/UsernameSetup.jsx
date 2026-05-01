import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export default function UsernameSetup({ currentUser, onComplete }) {
  const [username, setUsername] = useState(currentUser?.username || "");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);

  const checkAvailability = async (value) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const users = await base44.entities.User.filter({});
      const taken = users.some(
        u => u.username?.toLowerCase() === value.toLowerCase() && u.email !== currentUser?.email
      );
      setAvailable(!taken);
    } catch (error) {
      console.error('Failed to check username:', error);
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const updateUsernameMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ username });
    },
    onSuccess: () => {
      toast.success('Username set successfully!');
      onComplete?.();
    },
    onError: (error) => {
      toast.error('Failed to set username: ' + error.message);
    }
  });

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
    
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setAvailable(null);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AtSign className="w-5 h-5" />
          Set Your Username
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-white text-sm mb-2 block">
            Choose a unique username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={username}
              onChange={handleUsernameChange}
              placeholder="username"
              className="pl-10 bg-white/10 border-white/20 text-white"
              maxLength={20}
            />
            {checking && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
            {!checking && available === true && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
            )}
            {!checking && available === false && (
              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
            )}
          </div>
          
          {username.length > 0 && username.length < 3 && (
            <p className="text-yellow-400 text-xs mt-1">Username must be at least 3 characters</p>
          )}
          {available === false && (
            <p className="text-red-400 text-xs mt-1">Username already taken</p>
          )}
          {available === true && (
            <p className="text-green-400 text-xs mt-1">Username available!</p>
          )}
          
          <p className="text-gray-400 text-xs mt-2">
            Only letters, numbers, and underscores allowed
          </p>
        </div>

        <Button
          onClick={() => updateUsernameMutation.mutate()}
          disabled={!available || updateUsernameMutation.isPending || username.length < 3}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {updateUsernameMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Set Username'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}