import * as stylex from "@stylexjs/stylex";
import {
  colors,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import { NumericFormat } from "react-number-format";

import type { BaseDataType } from "@/lib/comp";
import { currencyTextFormatProps } from "@/lib/formProps";

type Props = {
  data: BaseDataType;
};

const styles = stylex.create({
  table: {
    minWidth: "100%",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  /** was `divide-y divide-slate-600`, a child combinator StyleX cannot express;
   * thead is the only non-last child of this table. */
  head: {
    fontWeight: fontWeights.semibold,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: colors.slate600,
  },
  cell: {
    display: "table-cell",
    paddingInline: spacing[3],
    paddingBlock: spacing[3.5],
  },
  left: { textAlign: "left" },
  right: { textAlign: "right" },
  body: { color: colors.slate500 },
  total: { color: colors.white },
});

export const CompTable = ({ data }: Props) => (
  <table {...stylex.props(styles.table)}>
    <thead {...stylex.props(styles.head)}>
      <tr>
        <th scope="col" {...stylex.props(styles.cell, styles.left)}>
          Year
        </th>
        <th scope="col" {...stylex.props(styles.cell, styles.left)}>
          Base
        </th>
        <th scope="col" {...stylex.props(styles.cell, styles.left)}>
          Bonus
        </th>
        <th scope="col" {...stylex.props(styles.cell, styles.left)}>
          Stock
        </th>
        <th scope="col" {...stylex.props(styles.cell, styles.right)}>
          Total
        </th>
      </tr>
    </thead>
    <tbody {...stylex.props(styles.body)}>
      {data.map((c) => (
        <tr key={c.year}>
          <td {...stylex.props(styles.cell)}>{c.year}</td>
          <td {...stylex.props(styles.cell)}>
            <NumericFormat value={c.base} {...currencyTextFormatProps} />
          </td>
          <td {...stylex.props(styles.cell)}>
            <NumericFormat value={c.bonus} {...currencyTextFormatProps} />
          </td>
          <td {...stylex.props(styles.cell)}>
            <NumericFormat value={c.stock} {...currencyTextFormatProps} />
          </td>
          <td {...stylex.props(styles.cell, styles.right, styles.total)}>
            <NumericFormat value={c.base + c.bonus + c.stock} {...currencyTextFormatProps} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
