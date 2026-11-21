"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DesignEditor } from "@/components/editor/DesignEditor";
import { THEME } from "@/lib/graphql";

function EditDesign() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useQuery(THEME, { variables: { id }, fetchPolicy: "network-only" });

  if (error) return <p className="mt-16 text-center text-muted-foreground">{error.message}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <DesignEditor key={data.theme.id} theme={data.theme} />;
}

export default function EditDesignPage() {
  return (
    <AppShell>
      <EditDesign />
    </AppShell>
  );
}
