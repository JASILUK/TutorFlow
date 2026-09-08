// src/features/calendar/calendarLayout.ts
import { parseISO, getHours, getMinutes, differenceInMinutes, isSameDay } from "date-fns";
import { SessionResponse } from "@/types/sessions";

export const CALENDAR_START_HOUR = 7; // 7:00 AM
export const CALENDAR_END_HOUR = 21; // 9:00 PM
export const TOTAL_HOURS = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
export const HOUR_HEIGHT_PX = 60; // 60px per hour = 1px per minute

export interface PositionedSession {
  session: SessionResponse;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

/**
 * Calculates top (px), height (px), and column splits for overlapping sessions on a given day.
 */
export function computeDaySessionLayout(
  dayDate: Date,
  sessions: SessionResponse[]
): PositionedSession[] {
  // Filter sessions that fall on this day
  const daySessions = sessions
    .filter((s) => isSameDay(parseISO(s.scheduled_start), dayDate))
    .sort(
      (a, b) =>
        parseISO(a.scheduled_start).getTime() - parseISO(b.scheduled_start).getTime()
    );

  if (daySessions.length === 0) return [];

  // Compute raw vertical dimensions (clamped between 7 AM and 9 PM)
  const baseItems = daySessions.map((s) => {
    const start = parseISO(s.scheduled_start);
    const end = parseISO(s.scheduled_end);

    const startMinutesFromBase =
      (getHours(start) - CALENDAR_START_HOUR) * 60 + getMinutes(start);
    const durationMinutes = Math.max(differenceInMinutes(end, start), 25); // Min height 25px for readability

    const top = Math.max(0, startMinutesFromBase);
    const height = Math.min(
      durationMinutes,
      TOTAL_HOURS * 60 - top
    );

    return {
      session: s,
      top,
      height,
      startMin: startMinutesFromBase,
      endMin: startMinutesFromBase + durationMinutes,
    };
  });

  // Simple, greedy column pack algorithm for overlaps
  const clusters: (typeof baseItems)[] = [];
  let currentCluster: typeof baseItems = [];
  let clusterEnd = -1;

  for (const item of baseItems) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMin;
    } else if (item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Allocate width % and left offset within each cluster
  const positioned: PositionedSession[] = [];

  for (const cluster of clusters) {
    const columns: (typeof baseItems)[] = [];

    for (const item of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (lastInCol.endMin <= item.startMin) {
          columns[i].push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
      }
    }

    const totalCols = columns.length;
    const colWidth = 100 / totalCols;

    columns.forEach((colItems, colIndex) => {
      colItems.forEach((item) => {
        positioned.push({
          session: item.session,
          top: item.top,
          height: item.height,
          leftPercent: colIndex * colWidth,
          widthPercent: colWidth - 1, // 1% right gutter
        });
      });
    });
  }

  return positioned;
}