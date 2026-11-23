'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, Settings } from "lucide-react";

interface PreferencesWarningProps {
  className?: string;
}

export function PreferencesWarning({ className }: PreferencesWarningProps) {
  const router = useRouter();

  const handleConfigurePreferences = () => {
    // Navigate to settings page where users can configure preferences
    router.push(`/protected/settings`);
  };

  return (
    <Card className={`border-border bg-muted ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <AlertCircle className="w-5 h-5" />
          Configure Your Preferences
        </CardTitle>
        <CardDescription className="text-primary">
          To get a more accurate and personalized food catalog, please set up your dietary preferences and restrictions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-primary mb-4">
          By setting your preferences, we can show you foods that match your dietary needs and taste preferences, 
          making it easier to find meals you&apos;ll love.
        </p>
        <Button 
          onClick={handleConfigurePreferences}
          variant="default"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          <Settings className="w-4 h-4" />
          Configure Preferences
        </Button>
      </CardContent>
    </Card>
  );
}