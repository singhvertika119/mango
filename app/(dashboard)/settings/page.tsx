"use client";

import * as React from "react";
import { Settings, Shield, User, Bell } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage workspace preferences and account configurations</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center gap-4">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-bold">Workspace Profile</CardTitle>
              <CardDescription>Manage names and project domains</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 max-w-sm">
              <label className="text-xs font-semibold text-muted-foreground">Workspace Name</label>
              <input
                type="text"
                defaultValue="Mango Development"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button size="sm" className="cursor-pointer">Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
