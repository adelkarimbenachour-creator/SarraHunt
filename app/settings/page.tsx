"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Github, LogOut } from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

const STORAGE_KEY = "velocityhunt:coreDirectives";

const DEFAULT_DIRECTIVES = `You are a GitHub repository discovery agent. Your goal is to find high-quality, trending repositories that are gaining momentum quickly.

Key focus areas:
- Prioritize repositories with active development
- Look for innovative or unique projects
- Prefer projects with good documentation
- Consider recent stars and forks growth`;

export default function SettingsPage() {
  const [directives, setDirectives] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { data: session } = useSession();

  // Load saved directives on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setDirectives(saved);
    } else {
      setDirectives(DEFAULT_DIRECTIVES);
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, directives);
      toast.success("Core directives saved successfully!");
    } catch (error) {
      toast.error("Failed to save directives");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default directives?")) {
      setDirectives(DEFAULT_DIRECTIVES);
      localStorage.setItem(STORAGE_KEY, DEFAULT_DIRECTIVES);
      toast.success("Directives reset to default");
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-syne">Settings</h1>
          <p className="text-zinc-400 mt-2">Configure your search agent's core directives</p>
        </div>
      </div>

      <Card className="glass border-zinc-800">
        <CardHeader>
          <CardTitle>GitHub Account</CardTitle>
          <CardDescription>
            Connect your GitHub account to get higher API rate limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "GitHub avatar"}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-zinc-100">{session.user?.name}</p>
                  <p className="text-sm text-zinc-400">{session.user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => signIn("github")}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-950 hover:bg-white"
            >
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-zinc-800">
        <CardHeader>
          <CardTitle>Core Directives</CardTitle>
          <CardDescription>
            Define how the search agent should prioritize and evaluate GitHub repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={directives}
            onChange={(e) => setDirectives(e.target.value)}
            placeholder="Enter your core directives here..."
            className="min-h-[300px] font-sans"
          />
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
