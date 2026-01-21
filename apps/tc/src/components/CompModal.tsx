import type { InputActionMeta, MultiValue, OptionProps } from "react-select";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import Select, { components } from "react-select";
import { useDebouncedCallback } from "use-debounce";

import type { Props as ModalProps } from "@/components/Modal";
import type { CompHooksType } from "@/lib/comp";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import {
  currencyTextFormatProps,
  staticTextFormatProps,
} from "@/lib/formProps";

type Props = { setShouldUpdate: (t: boolean) => void } & CompHooksType &
  Omit<ModalProps, "title" | "children">;

const Option = ({ children, ...rest }: OptionProps<any>) => {
  return (
    <components.Option {...rest}>
      <span className="mr-1 inline-flex items-center rounded-sm bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-800">
        {rest.data.symbol}
      </span>
      <span>{children}</span>
    </components.Option>
  );
};

export const CompModal = ({
  isOpen,
  closeModal,
  openModal,
  shareType,
  shareCalcType,
  setExpectedGrowthMultiple,
  setPreferredSharePrice,
  setSharesOutstanding,
  setExpectedRevenue,
  setRevenueMultiple,
  setShouldUpdate,
}: Props) => {
  const [view, setView] = useState("estimate");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [companiesData, setCompaniesData] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const loadOptions = useDebouncedCallback(async (value: string) => {
    const query = value.trim();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    // Mock data for demonstration - API functionality removed
    setTimeout(() => {
      setSearchResults([]);
      setSearchLoading(false);
    }, 500);
  }, 300);

  const loadCompaniesData = async (selected: MultiValue<any>) => {
    const query = selected.map((s) => s.symbol).join(",");

    if (!query) {
      setCompaniesData([]);
      setCompaniesLoading(false);
      return;
    }

    setCompaniesLoading(true);

    // Mock data for demonstration - API functionality removed
    setTimeout(() => {
      setCompaniesData([]);
      setCompaniesLoading(false);
    }, 500);
  };

  const handleClose = () => {
    setCompaniesData([]);
    closeModal();
  };

  const handleUse = (c: any) => {
    if (isoCurrent) {
      setExpectedGrowthMultiple(c.year5ChangePercent.toFixed(2));
    }
    if (rsuCurrent) {
      setPreferredSharePrice((c.marketcap / c.sharesOutstanding).toFixed(2));
      setExpectedGrowthMultiple(((c.year5ChangePercent / 5) * 100).toFixed(2));
    }
    if (isoRevenue || rsuRevenue) {
      setSharesOutstanding(c.sharesOutstanding.toString());
      setExpectedRevenue(c.revenue.toString());
      setRevenueMultiple(c.revenuePerShare.toString());
    }
    setShouldUpdate(true);
    handleClose();
  };

  const isoCurrent = shareType === "iso" && shareCalcType == "current";
  const rsuCurrent = shareType === "rsu" && shareCalcType == "current";
  const isoRevenue = shareType === "iso" && shareCalcType == "revenue";
  const rsuRevenue = shareType === "rsu" && shareCalcType == "revenue";

  return (
    <Modal
      isOpen={isOpen}
      openModal={openModal}
      closeModal={handleClose}
      title={
        <div className="flex items-end justify-between">
          <h1>
            {view === "estimate" ? "Estimate Equity Value" : "Terminology"}
          </h1>
          <span className="relative z-0 inline-flex rounded-md shadow-xs">
            <button
              type="button"
              className={`relative inline-flex items-center rounded-l-md border border-slate-600 bg-black px-2 py-2 text-sm transition hover:bg-emerald-900 focus:z-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden ${
                view === "estimate" ? "bg-slate-800" : ""
              }`}
              onClick={() => setView("estimate")}
            >
              <span className="sr-only">Estimate Equity Value</span>
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </button>
            <button
              type="button"
              className={`relative -ml-px inline-flex items-center rounded-r-md border border-slate-600 bg-black px-2 py-2 text-sm transition hover:bg-emerald-900 focus:z-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden ${
                view === "terminology" ? "bg-slate-800" : ""
              }`}
              onClick={() => setView("terminology")}
            >
              <span className="sr-only">Terminology</span>
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
            </button>
          </span>
        </div>
      }
    >
      {view === "terminology" && (
        <div className="mt-3">
          {isoCurrent && (
            <div>
              <h2 className="font-bold text-slate-50">Preferred Stock Price</h2>
              <p className="mt-1">
                The preferred stock price is the price at which investors
                currently pay for shares of the company. You can ask your
                recruiter what the current price is.
              </p>
            </div>
          )}
          {rsuCurrent && (
            <div className="mt-3">
              <h2 className="font-bold text-slate-50">Current Market Price</h2>
              <p className="mt-1">
                This is the stock price at which the company is currently
                trading
              </p>
            </div>
          )}
          {(isoRevenue || rsuRevenue) && (
            <div className="mt-3">
              <h2 className="font-bold text-slate-50">Shares Outstanding</h2>
              <p className="mt-1">
                The shares outstanding is the number of shares that the company
                has available in the market.
              </p>
            </div>
          )}
          <div className="mt-3">
            {isoCurrent && (
              <>
                <h2 className="font-bold text-slate-50">
                  Expected Growth over 4 years
                </h2>
                <p className="mt-1">
                  Depending on the stage of the company expected growth can
                  vary. Investors typically expect a 10x return on what they put
                  in.
                </p>
              </>
            )}
            {rsuCurrent && (
              <>
                <h2 className="font-bold text-slate-50">
                  Expected Market Growth
                </h2>
                <p className="mt-1">
                  How much do you expect the stock price to change every year?
                  Anualized growth over the last 4 years is a good estimate.
                </p>
              </>
            )}
            {(isoRevenue || rsuRevenue) && (
              <>
                <h2 className="font-bold text-slate-50">
                  Expected Company Revenue
                </h2>
                <p className="mt-1">
                  How much do you expect the company to make every year? Divide
                  this number by the number of shares outstanding to get the
                  revenue multiple.
                </p>
                <h2 className="mt-3 font-bold text-slate-50">
                  Revenue Multiple
                </h2>
                <p className="mt-1">
                  The revenue multiple is the ratio of the company’s revenue
                  relative to its stock price. You can use your competitors
                  revenue multiple to estimate what your share value would be.
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {view === "estimate" && (
        <div className="flex min-h-[360px] flex-col gap-3">
          <div className="mt-3">
            <p>
              Estimate reasonable numbers for your equity value by looking at
              competitors:
            </p>
            <div className="mt-3">
              <FormField
                className="rounded"
                label="Add your company or a competitor"
                name="competitor"
                placeholder="Google"
              >
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  components={{ Option, IndicatorsContainer: () => null }}
                  isMulti
                  isLoading={searchLoading}
                  defaultValue={[]}
                  onInputChange={(value, actionMeta: InputActionMeta) => {
                    if (actionMeta.action === "input-change") {
                      loadOptions(value);
                    }
                    return value;
                  }}
                  options={searchResults}
                  onChange={(selected) =>
                    loadCompaniesData((selected ?? []) as MultiValue<any>)
                  }
                  isSearchable={companiesData.length < 3}
                  openMenuOnFocus={false}
                  openMenuOnClick={false}
                />
              </FormField>
            </div>
          </div>
          {companiesLoading && !companiesData.length ? (
            <div className="flex flex-1 items-center justify-center">
              <h2 className="text-slate-700">Loading companies...</h2>
            </div>
          ) : companiesData.length ? (
            <table className="relative min-w-full divide-y divide-slate-600 text-sm">
              <thead className="font-semibold">
                <tr>
                  <th scope="col" className="table-cell px-3 py-3.5 text-left">
                    Company
                  </th>
                  {isoCurrent && (
                    <th scope="col" className="table-cell px-3 py-3.5">
                      Growth over last 4 years
                    </th>
                  )}
                  {rsuCurrent && (
                    <>
                      <th
                        scope="col"
                        className="table-cell px-3 py-3.5 text-left"
                      >
                        Current Market Value
                      </th>
                      <th
                        scope="col"
                        className="table-cell px-3 py-3.5 text-left"
                      >
                        Average Growth per year
                      </th>
                    </>
                  )}
                  {(isoRevenue || rsuRevenue) && (
                    <>
                      <th
                        scope="col"
                        className="table-cell px-3 py-3.5 text-left"
                      >
                        Shares Outstanding
                      </th>
                      <th
                        scope="col"
                        className="table-cell px-3 py-3.5 text-left"
                      >
                        Revenue
                      </th>
                      <th
                        scope="col"
                        className="table-cell px-3 py-3.5 text-left"
                      >
                        Revenue Multiple
                      </th>
                    </>
                  )}
                  <th scope="col" className="table-cell py-3.5 text-right" />
                </tr>
              </thead>
              <tbody className="text-slate-500">
                {companiesData.map((c: any) => (
                  <tr key={c.companyName}>
                    <td className="table-cell px-3 py-3.5">{c.companyName}</td>
                    {isoCurrent && (
                      <td className="table-cell px-3 py-3.5">
                        <NumericFormat
                          {...staticTextFormatProps}
                          allowNegative
                          suffix="%"
                          value={c.year5ChangePercent * 100}
                        />
                      </td>
                    )}
                    {rsuCurrent && (
                      <>
                        <td className="table-cell px-3 py-3.5">
                          <NumericFormat
                            {...currencyTextFormatProps}
                            value={c.day200MovingAvg}
                          />
                        </td>
                        <td className="table-cell px-3 py-3.5">
                          <NumericFormat
                            {...staticTextFormatProps}
                            allowNegative
                            suffix="%"
                            value={(c.year5ChangePercent / 5) * 100}
                          />
                        </td>
                      </>
                    )}
                    {(isoRevenue || rsuRevenue) && (
                      <>
                        <td className="table-cell px-3 py-3.5">
                          <NumericFormat
                            displayType="text"
                            thousandSeparator
                            valueIsNumericString
                            value={c.sharesOutstanding}
                          />
                        </td>
                        <td className="table-cell px-3 py-3.5">
                          <NumericFormat
                            {...currencyTextFormatProps}
                            value={c.revenue}
                          />
                        </td>
                        <td className="table-cell px-3 py-3.5">
                          <NumericFormat
                            displayType="text"
                            thousandSeparator
                            valueIsNumericString
                            value={c.revenuePerShare}
                          />
                        </td>
                      </>
                    )}
                    <td className="table-cell py-3.5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-slate-600 px-2 py-1 text-xs text-white transition hover:bg-emerald-900 focus:z-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        onClick={() => handleUse(c)}
                      >
                        Use
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <h2 className="text-slate-700">Add a company above</h2>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
