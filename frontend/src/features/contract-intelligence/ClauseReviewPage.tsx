"use client";

import { use } from "react";
import { ClauseReview } from "./components/ClauseReview";

/** Brand app: /contracts/[id]/clauses */
export default function ClauseReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return <ClauseReview id={use(params).id} backHref="/contracts" />;
}
