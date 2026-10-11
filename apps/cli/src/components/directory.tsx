import { Box, Text } from "ink";

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

  return (
    <Box flexDirection="row" width={innerWidth} backgroundColor={bg}>
      <Text backgroundColor={bg} color={selected ? color.black : color.ghost}>
        {selected ? "▶ " : "  "}
      </Text>
      <Text
        backgroundColor={bg}
        color={fg.idx}
        bold={selected}
      >{`${String(index + 1).padStart(2, "0")} `}</Text>
      <Text backgroundColor={bg} color={fg.name} bold={selected}>
        {pad(item.title, col.name)}
      </Text>
      <Text backgroundColor={bg}>{" ".repeat(GUT1)}</Text>
      <Text backgroundColor={bg} color={fg.desc}>
        {pad(item.description, col.desc)}
      </Text>
      {col.showHost && (
        <>
          <Text backgroundColor={bg}>{" ".repeat(GUT2)}</Text>
          <Text backgroundColor={bg} color={fg.host}>
            {pad(truncate(hostFromUrl(item.url), col.host), col.host)}
          </Text>
        </>
      )}
    </Box>
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
      <Box flexDirection="row">
        <Text color={color.faint}>{" ".repeat(MARKER)}</Text>
        <Text color={color.faint}>{pad("#", IDX)}</Text>
        <Text color={color.faint}>{pad("NAME", col.name + GUT1)}</Text>
        <Text color={color.faint}>{pad("DESCRIPTION", col.desc)}</Text>
        {col.showHost && (
          <Text color={color.faint}>{`${" ".repeat(GUT2)}${pad("HOST", col.host)}`}</Text>
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        <Text color={color.ghost}>{clippedTop ? "  ↑ more" : " "}</Text>

        {rows.map((row) => {
          if (row.kind === "spacer") {
            return <Text key={`spacer-${row.label}`}> </Text>;
          }
          if (row.kind === "header") {
            return (
              <Box key={`section-${row.label}`} flexDirection="row">
                <Text color={color.accentDim}>{`▸ ${row.label} `}</Text>
                <Text color={color.ghost}>
                  {"─".repeat(Math.max(0, innerWidth - row.label.length - 3))}
                </Text>
              </Box>
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

        <Box flexGrow={1} />
        <Text color={color.ghost}>{clippedBottom ? "  ↓ more" : " "}</Text>
      </Box>
    </Panel>
  );
};
