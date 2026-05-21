"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  MessageSquare,
  FileText,
  Clock,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";

type EmailType = "cold_intro" | "follow_up" | "proposal" | "check_in";

const EMAIL_TYPES: { type: EmailType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: "cold_intro",
    label: "Cold Intro",
    icon: <Send className="h-4 w-4" />,
    description: "First outreach to a new prospect",
  },
  {
    type: "follow_up",
    label: "Follow Up",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Gentle nudge after no reply",
  },
  {
    type: "proposal",
    label: "Proposal",
    icon: <FileText className="h-4 w-4" />,
    description: "Detailed pitch with pricing hints",
  },
  {
    type: "check_in",
    label: "Check In",
    icon: <Clock className="h-4 w-4" />,
    description: "Casual reconnect after a while",
  },
];

interface EmailComposerProps {
  leadId: string;
  companyName: string;
}

export function EmailComposer({ leadId, companyName }: EmailComposerProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmailType>("cold_intro");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          emailType: selectedType,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate email");
      }

      setSubject(data.email.subject);
      setBody(data.email.body);
      setGenerated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate email. Is the AI service running?"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setSubject("");
    setBody("");
    setGenerated(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Draft Email
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Mail className="h-5 w-5 text-amber-500" />
            AI Email Composer — {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Email Type Selection */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-2 block">
              Email Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TYPES.map((et) => (
                <button
                  key={et.type}
                  onClick={() => {
                    setSelectedType(et.type);
                    if (generated) reset();
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    selectedType === et.type
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <div
                    className={
                      selectedType === et.type
                        ? "text-amber-500"
                        : "text-zinc-500"
                    }
                  >
                    {et.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{et.label}</p>
                    <p className="text-xs text-zinc-500">{et.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-2 block">
              Custom Context{" "}
              <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., They recently renovated their lobby, mention that we do metallic epoxy that would look amazing in an entryway..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 resize-none"
            />
          </div>

          {/* Generate Button */}
          {!generated && (
            <Button
              onClick={generateEmail}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Generated Email Display */}
          {generated && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  Email Generated
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      reset();
                      generateEmail();
                    }}
                    disabled={loading}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-zinc-800"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
