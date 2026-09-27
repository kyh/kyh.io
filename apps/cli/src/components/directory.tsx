import { TextAttributes } from "@opentui/core";

import type { Item } from "../data/content";
import { color } from "../lib/theme";
import { hostFromUrl, pad, truncate } from "../lib/utils";
import { Panel } from "./panel";

interface Section {
  label: string;
  items: Item[];
}

interface DirectoryProps {
  sections: Section[];
  selectedIndex: number;
  innerWidth: number;
  maxRows: number;
}

type DisplayRow =
  | { kind: "header"; label: string }
  | { kind: "spacer"; label: string }
  | { kind: "item"; item: Item; index: number };

// Fixed field widths, sized so marker+idx+name+desc+host + gutters == innerWidth
// exactly (prevents the selected row from wrapping).
// "▶ " / "  "
const MARKER = 2;
// "01 "
const IDX = 3;
// name → desc
const GUT1 = 1;
// desc → host
const GUT2 = 2;

const columns = (innerWidth: number) => {
  const showHost = innerWidth > 60;
  const host = showHost ? Math.min(20, Math.max(12, Math.floor(innerWidth * 0.24))) : 0;
  const fixed = MARKER + IDX + GUT1 + (showHost ? GUT2 + host : 0);
  const avail = Math.max(0, innerWidth - fixed);
  // clamp name to what's actually available so the row never exceeds innerWidth
  const name = Math.min(avail, Math.min(22, Math.max(12, Math.floor(avail * 0.42))));
  const desc = Math.max(0, avail - name);
  return { desc, host, name, showHost };
};

type Cols = ReturnType<typeof columns>;

const ItemRow = ({
  item,
  index,
  selected,
  innerWidth,
  col,
}: {
  item: Item;
  index: number;
  selected: boolean;
  innerWidth: number;
  col: Cols;
}) => {
  const bg = selected ? color.accent : undefined;
  const fg = selected
    ? { desc: color.black, host: color.accentDim, idx: color.black, name: color.black }
    : { desc: color.dim, host: color.faint, idx: color.accentDim, name: color.text };
  const bold = selected ? TextAttributes.BOLD : undefined;

  return (
    <box flexDirection="row" width={innerWidth} backgroundColor={bg}>
      <text bg={bg} fg={selected ? color.black : color.ghost}>
        {selected ? "▶ " : "  "}
      </text>
      <text bg={bg} fg={fg.idx} attributes={bold}>{`${String(index + 1).padStart(2, "0")} `}</text>
      <text bg={bg} fg={fg.name} attributes={bold}>
        {pad(item.title, col.name)}
      </text>
      <text bg={bg}>{" ".repeat(GUT1)}</text>
      <text bg={bg} fg={fg.desc}>
        {pad(item.description, col.desc)}
      </text>
      {col.showHost && (
        <>
          <text bg={bg}>{" ".repeat(GUT2)}</text>
          <text bg={bg} fg={fg.host}>
            {pad(truncate(hostFromUrl(item.url), col.host), col.host)}
          </text>
        </>
      )}
    </box>
  );
};

const buildRows = (sections: Section[]): DisplayRow[] => {
  const rows: DisplayRow[] = [];
  let index = 0;
  for (const section of sections) {
    // blank line between sections so each group reads as its own block
    if (rows.length > 0) {
      rows.push({ kind: "spacer", label: section.label });
    }
    rows.push({ kind: "header", label: section.label });
    for (const item of section.items) {
      rows.push({ index, item, kind: "item" });
      index += 1;
    }
  }
  return rows;
};

// Keep the selected row (and, when possible, its section header) in view without
// relying on scrollbox focus.
const windowRows = (rows: DisplayRow[], selectedIndex: number, maxRows: number) => {
  if (rows.length <= maxRows) {
    return { clippedBottom: false, clippedTop: false, rows };
  }

  const selRow = rows.findIndex((r) => r.kind === "item" && r.index === selectedIndex);
  let start = Math.max(0, selRow - Math.floor(maxRows / 2));
  start = Math.min(start, rows.length - maxRows);
  if (start > 0 && rows[start - 1]?.kind === "header" && selRow - start < maxRows - 1) {
    start -= 1;
  }

  return {
    clippedBottom: start + maxRows < rows.length,
    clippedTop: start > 0,
    rows: rows.slice(start, start + maxRows),
  };
};

export const Directory = ({ sections, selectedIndex, innerWidth, maxRows }: DirectoryProps) => {
  const col = columns(innerWidth);
  const allRows = buildRows(sections);
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const { rows, clippedTop, clippedBottom } = windowRows(allRows, selectedIndex, maxRows);

  return (
    <Panel title="DIRECTORY" bottomTitle={`${total} ENTRIES`} flexGrow={1}>
      {/* column header */}
      <box flexDirection="row">
        <text fg={color.faint}>{" ".repeat(MARKER)}</text>
        <text fg={color.faint}>{pad("#", IDX)}</text>
        <text fg={color.faint}>{pad("NAME", col.name + GUT1)}</text>
        <text fg={color.faint}>{pad("DESCRIPTION", col.desc)}</text>
        {col.showHost && (
          <text fg={color.faint}>{`${" ".repeat(GUT2)}${pad("HOST", col.host)}`}</text>
        )}
      </box>

      <box flexDirection="column" flexGrow={1}>
        <text fg={color.ghost}>{clippedTop ? "  ↑ more" : ""}</text>

        {rows.map((row) => {
          if (row.kind === "spacer") {
            return <text key={`spacer-${row.label}`}> </text>;
          }
          if (row.kind === "header") {
            return (
              <box key={`section-${row.label}`} flexDirection="row">
                <text fg={color.accentDim}>{`▸ ${row.label} `}</text>
                <text fg={color.ghost}>
                  {"─".repeat(Math.max(0, innerWidth - row.label.length - 3))}
                </text>
              </box>
            );
          }
          return (
            <ItemRow
              key={row.item.title}
              item={row.item}
              index={row.index}
              selected={row.index === selectedIndex}
              innerWidth={innerWidth}
              col={col}
            />
          );
        })}

        <box flexGrow={1} />
        <text fg={color.ghost}>{clippedBottom ? "  ↓ more" : ""}</text>
      </box>
    </Panel>
  );
};
