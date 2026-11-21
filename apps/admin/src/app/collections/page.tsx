"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { ExternalLink, FolderOpen, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLECTIONS,
  CREATE_COLLECTION,
  CURRENT_SHOP,
  DELETE_COLLECTION,
  PRODUCTS,
  UPDATE_COLLECTION,
  type Collection,
} from "@/lib/graphql";
import { storefrontUrl } from "@/lib/storefront-url";

function CollectionFields({
  name,
  description,
  onName,
  onDescription,
}: {
  name: string;
  description: string;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={name} maxLength={80} onChange={(e) => onName(e.target.value)} placeholder="e.g. Kurtas" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          rows={2}
          maxLength={1000}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Optional, shown at the top of the collection page"
        />
      </div>
    </>
  );
}

function CollectionRow({ collection, storeBase }: { collection: Collection; storeBase: string | null }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [update, updateState] = useMutation(UPDATE_COLLECTION);
  const [remove, removeState] = useMutation(DELETE_COLLECTION, {
    refetchQueries: [{ query: COLLECTIONS }, { query: PRODUCTS }],
  });

  async function save() {
    if (!name.trim()) return toast.error("Add a name");
    try {
      await update({ variables: { id: collection.id, input: { name: name.trim(), description: description.trim() } } });
      setEditing(false);
      toast.success("Collection saved");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function del() {
    if (!window.confirm(`Delete “${collection.name}”? Its products are kept.`)) return;
    try {
      await remove({ variables: { id: collection.id } });
      toast.success("Collection deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3 p-4">
        <CollectionFields name={name} description={description} onName={setName} onDescription={setDescription} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button size="sm" loading={updateState.loading} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{collection.name}</p>
        <p className="truncate text-xs text-muted-foreground">/collections/{collection.handle}</p>
      </div>
      {storeBase && (
        <Button variant="ghost" size="sm" asChild>
          <a href={`${storeBase}/collections/${collection.handle}`} target="_blank" rel="noreferrer" aria-label="View on store">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
      <Button variant="ghost" size="sm" icon={<Pencil />} onClick={() => setEditing(true)} aria-label="Edit" />
      <Button variant="ghost" size="sm" icon={<Trash2 />} loading={removeState.loading} onClick={del} aria-label="Delete" />
    </div>
  );
}

function Collections() {
  const { data, loading } = useQuery(COLLECTIONS);
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const [create, createState] = useMutation(CREATE_COLLECTION, { refetchQueries: [{ query: COLLECTIONS }] });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const collections = data?.collections ?? [];
  const storeBase = shopData ? storefrontUrl(shopData.currentShop.subdomain) : null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Add a name");
    try {
      await create({ variables: { input: { name: name.trim(), description: description.trim() } } });
      setName("");
      setDescription("");
      toast.success("Collection added");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Group products so customers can browse them. Show a collection on your home page from the design editor.
          </p>
        </div>
        {loading && collections.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : collections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <FolderOpen className="h-8 w-8 text-primary" />
              <p className="font-medium">No collections yet</p>
              <p className="text-sm text-muted-foreground">All your products are always available at /collections/all.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="divide-y">
            {collections.map((c) => (
              <CollectionRow key={c.id} collection={c} storeBase={storeBase} />
            ))}
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">New collection</CardTitle>
          <CardDescription>The link is created from the name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <CollectionFields name={name} description={description} onName={setName} onDescription={setDescription} />
            <Button type="submit" className="w-full" loading={createState.loading}>
              Add collection
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <AppShell>
      <Collections />
    </AppShell>
  );
}
