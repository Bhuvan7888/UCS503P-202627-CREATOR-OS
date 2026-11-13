"use client";

import { useParams } from "next/navigation";
import { useWorkspace } from "@/features/workspaces";
import { ClauseReview } from "./components/ClauseReview";

/** The clause review inside the creator workspace. */
export default function WorkspaceClauseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { base } = useWorkspace();
  return <ClauseReview id={id} backHref={`${base}/contracts`} />;
}
