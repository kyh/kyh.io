"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { createGroup, deleteGroup } from "@/lib/prediction-action";
import { useToast } from "@/components/toast";

type Group = {
  id: number;
  name: string;
  description: string | null;
  members: { id: number; name: string }[];
};

export const GroupsAdmin = ({ groups }: { groups: Group[] }) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGroup({ id });
      toast.success("Group deleted");
    } catch {
      toast.error("Failed to delete group");
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">Create group</h2>

      <form onSubmit={handleCreate} className="mb-8 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (e.g. Main GC)"
          required
          className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </form>

      <h2 className="mb-4 text-sm font-medium">Groups ({groups.length})</h2>

      <div className="divide-y divide-border">
        {groups.map((group) => (
          <div key={group.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {group.description && `${group.description} · `}
                {group.members.length} member
                {group.members.length !== 1 && "s"}
              </p>
            </div>
            <button
              onClick={() => handleDelete(group.id)}
              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              title="Delete group"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      )}
    </div>
  );
};
