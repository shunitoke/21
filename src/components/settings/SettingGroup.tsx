"use client";

interface SettingGroupProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingGroup({ title, children }: SettingGroupProps) {
  return (
    <div className="grid gap-3">
      {title && (
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
