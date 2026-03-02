"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { createMember, deleteMember } from "@/lib/prediction-action";
import { useToast } from "@/components/toast";

type Group = {
  id: number;
  name: string;
  members: { id: number; name: string }[];
};

export const MembersAdmin = ({ groups }: { groups: Group[] }) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(
    groups[0] ? String(groups[0].id) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !groupId) return;
    setIsSubmitting(true);
    try {
      await createMember({ name: name.trim(), groupId: Number(groupId) });
      setName("");
      toast.success("Member added");
    } catch {
      toast.error("Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMember({ id });
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">Add member</h2>

      {groups.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          Create a group first before adding members.
        </p>
      ) : (
        <form onSubmit={handleCreate} className="mb-8 space-y-3">
          <div className="flex gap-2">
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Member name"
              required
              className="flex-1 border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      <h2 className="mb-4 text-sm font-medium">Members by group</h2>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="mb-6">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            {group.name}
          </h3>
          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members.</p>
          ) : (
            <div className="divide-y divide-border">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm">{member.name}</span>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    title="Remove member"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
