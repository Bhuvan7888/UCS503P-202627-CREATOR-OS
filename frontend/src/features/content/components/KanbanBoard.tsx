"use client";

import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  CONTENT_TYPE_LABEL,
  PLATFORMS,
  STAGES,
  type ContentItem,
  type ContentStage,
} from "../constants/content";
import styles from "../content.module.css";

const PLATFORM_COLOR = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.color]));

/** One column per stage. Drag a card to another column, or use its "Move to" menu (keyboard friendly). */
export function KanbanBoard({
  items,
  onMove,
}: {
  items: ContentItem[];
  onMove: (item: ContentItem, stage: ContentStage) => void;
}) {
  const [over, setOver] = useState<ContentStage | null>(null);

  function drop(e: React.DragEvent, stage: ContentStage) {
    e.preventDefault();
    setOver(null);
    const item = items.find((i) => i.id === e.dataTransfer.getData("text/plain"));
    if (item && item.stage !== stage) onMove(item, stage);
  }

  return (
    <div className={styles.board}>
      {STAGES.map((stage) => {
        const cards = items.filter((i) => i.stage === stage.value);
        return (
          <section
            key={stage.value}
            className={`${styles.column} ${over === stage.value ? styles.columnOver : ""}`}
            aria-label={stage.label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage.value);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => drop(e, stage.value)}
          >
            <header className={styles.columnHead}>
              <span>{stage.label}</span>
              <span className={styles.count}>{cards.length}</span>
            </header>
            {cards.map((item) => (
              <article
                key={item.id}
                className={styles.card}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
              >
                <h4>{item.title}</h4>
                <p className={styles.cardMeta}>
                  {CONTENT_TYPE_LABEL[item.type]} · {item.pillar}
                </p>
                <div className={styles.cardFoot}>
                  <span className={styles.dots}>
                    {item.target_platforms.map((p) => (
                      <span
                        key={p}
                        className={styles.platformDot}
                        style={{ background: PLATFORM_COLOR[p] }}
                        title={p}
                      />
                    ))}
                  </span>
                  {item.due_date && (
                    <span className={styles.due}>
                      <CalendarDays size={12} /> {item.due_date}
                    </span>
                  )}
                </div>
                <select
                  className={styles.moveSelect}
                  aria-label={`Move "${item.title}" to stage`}
                  value={item.stage}
                  onChange={(e) => onMove(item, e.target.value as ContentStage)}
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
