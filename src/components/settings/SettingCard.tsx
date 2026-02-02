"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SettingCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function SettingCard({ icon: Icon, title, description, action, children }: SettingCardProps) {
  return (
    <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Icon size={16} />
            <span>{title}</span>
          </div>
          {action}
        </div>
        {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
}
