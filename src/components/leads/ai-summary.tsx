"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface AiSummaryProps {
  leadId: string;
}

export function AiSummary({ leadId }: AiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate summary. Is the AI service running?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 border-amber-500/20">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                AI Lead Summary
              </p>
              {summary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateSummary}
                  disabled={loading}
                  className="h-6 px-2 text-zinc-500 hover:text-zinc-300"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>

            {!summary && !loading && !error && (
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummary}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-zinc-800/50 mt-1"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate Summary
              </Button>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                Analyzing lead data...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 py-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {summary && !loading && (
              <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
