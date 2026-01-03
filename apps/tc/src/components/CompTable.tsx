import { NumericFormat } from "react-number-format";

import type { BaseDataType } from "@/lib/comp";
import { currencyTextFormatProps } from "@/lib/formProps";

type Props = {
  data: BaseDataType;
};

export const CompTable = ({ data }: Props) => (
  <table className="min-w-full divide-y divide-slate-600 text-sm">
    <thead className="font-semibold">
      <tr>
        <th scope="col" className="table-cell px-3 py-3.5 text-left">
          Year
        </th>
        <th scope="col" className="table-cell px-3 py-3.5 text-left">
          Base
        </th>
        <th scope="col" className="table-cell px-3 py-3.5 text-left">
          Bonus
        </th>
        <th scope="col" className="table-cell px-3 py-3.5 text-left">
          Stock
        </th>
        <th scope="col" className="table-cell px-3 py-3.5 text-right">
          Total
        </th>
      </tr>
    </thead>
    <tbody className="text-slate-500">
      {data.map((c) => (
        <tr key={c.year}>
          <td className="table-cell px-3 py-3.5">{c.year}</td>
          <td className="table-cell px-3 py-3.5">
            <NumericFormat value={c.base} {...currencyTextFormatProps} />
          </td>
          <td className="table-cell px-3 py-3.5">
            <NumericFormat value={c.bonus} {...currencyTextFormatProps} />
          </td>
          <td className="table-cell px-3 py-3.5">
            <NumericFormat value={c.stock} {...currencyTextFormatProps} />
          </td>
          <td className="table-cell px-3 py-3.5 text-right text-white">
            <NumericFormat
              value={c.base + c.bonus + c.stock}
              {...currencyTextFormatProps}
            />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
