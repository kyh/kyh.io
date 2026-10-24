import { formatDate } from "@/lib/format";
import { incidentDescription } from "@/lib/incident-seo";
import type { IncidentSummary } from "@/lib/incident-seo";
import { siteName } from "@/lib/site";

export const INCIDENT_CARD_SIZE = { height: 630, width: 1200 };

export const INCIDENT_CARD_ALT = `${siteName} incident report: where, when and what happened, as text`;

const ACCENT = "#a5b4fc";

const Bracket = ({ x, y }: { x: "left" | "right"; y: "top" | "bottom" }) => (
  <div
    style={{
      [`border${y === "top" ? "Top" : "Bottom"}`]: `5px solid ${ACCENT}`,
      [`border${x === "left" ? "Left" : "Right"}`]: `5px solid ${ACCENT}`,
      [`border${y === "top" ? "Top" : "Bottom"}${x === "left" ? "Left" : "Right"}Radius`]: 10,
      [x]: 56,
      [y]: 56,
      display: "flex",
      height: 56,
      position: "absolute",
      width: 56,
    }}
  />
);

/**
 * The share card for one incident, drawn by `next/og`: place, date and a short
 * description in the site card's look. Text only, never a frame of footage, a
 * thumbnail or a face.
 */
export const IncidentCard = ({ incident }: { incident: IncidentSummary }) => {
  const place = incident.location?.trim() || `Incident #${incident.id}`;
  const date = formatDate(incident.incidentDate ?? incident.createdAt);
  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: INCIDENT_CARD_SIZE.height,
        justifyContent: "space-between",
        padding: "112px 132px",
        position: "relative",
        width: INCIDENT_CARD_SIZE.width,
      }}
    >
      <Bracket x="left" y="top" />
      <Bracket x="right" y="top" />
      <Bracket x="left" y="bottom" />
      <Bracket x="right" y="bottom" />
      <div style={{ alignItems: "center", display: "flex", fontSize: 26, gap: 14 }}>
        <div
          style={{
            backgroundColor: "#ef4444",
            borderRadius: 999,
            display: "flex",
            height: 20,
            width: 20,
          }}
        />
        <div style={{ color: "#d4d4d8", display: "flex", letterSpacing: "0.12em" }}>
          INCIDENT REPORT
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          {place}
        </div>
        {date ? <div style={{ color: ACCENT, display: "flex", fontSize: 32 }}>{date}</div> : null}
        <div style={{ color: "#a1a1aa", display: "flex", fontSize: 30, lineHeight: 1.4 }}>
          {incidentDescription(incident)}
        </div>
      </div>
      <div style={{ color: "#71717a", display: "flex", fontSize: 24 }}>
        {siteName} · www.policingice.com
      </div>
    </div>
  );
};
