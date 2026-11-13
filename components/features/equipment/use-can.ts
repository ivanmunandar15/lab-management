"use client";
import { useSession } from "next-auth/react";
import { can, type Action, type Resource } from "@/lib/rbac";

export function useCan(resource: Resource) {
  const { data } = useSession();
  const role = data?.user?.role;
  return (action: Action) => can(role, resource, action);
}
