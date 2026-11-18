import { apiMain, enc } from "@/lib/api/client";
import type { CreateResponsibilityInput, ResponsibilityOverview, ResponsibilityRule } from "@/types/responsibility";

export const responsibilityService = {
  list: async () => (await apiMain<ResponsibilityOverview>("responsibilities")).data,
  create: async (input: CreateResponsibilityInput) => (await apiMain<ResponsibilityRule>("responsibilities", { method: "POST", body: input })).data,
  remove: async (id: string) => {
    await apiMain<{ deleted: boolean }>(`responsibilities/${enc(id)}`, { method: "DELETE" });
  },
};
