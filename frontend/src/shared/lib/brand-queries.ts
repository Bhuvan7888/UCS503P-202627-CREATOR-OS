"use client";

import client from "@/shared/lib/api-client";
import type { components } from "@/shared/lib/api-types";
import { useQuery } from "@/shared/lib/query-cache";

export type Deal = components["schemas"]["Deal"];
export type Creator = components["schemas"]["Creator"];
export type Contract = components["schemas"]["Contract"];
export type Deliverable = components["schemas"]["Deliverable"];
export type Payment = components["schemas"]["Payment"];

// The brand app's lists, cached (stale-while-revalidate) and shared by every brand page, so moving between
// Home, Deals, Contracts, Payments… shows data at once. Call `refresh()` after a change.
const page = { params: { query: { limit: 100 } } };

export const useDeals = () =>
  useQuery("brand:deals", async () => (await client.GET("/deals", page)).data);

export const useCreators = () =>
  useQuery("brand:creators", async () => (await client.GET("/creators", page)).data);

export const useContracts = () =>
  useQuery("brand:contracts", async () => (await client.GET("/contracts", page)).data);

export const useDeliverables = () =>
  useQuery("brand:deliverables", async () => (await client.GET("/deliverables", page)).data);

export const usePayments = () =>
  useQuery("brand:payments", async () => (await client.GET("/payments", page)).data);

/** id → display name, for tables that show a creator column. */
export function nameById(creators: Creator[] | undefined): Record<string, string> {
  return Object.fromEntries((creators ?? []).map((c) => [c.id, c.display_name]));
}
