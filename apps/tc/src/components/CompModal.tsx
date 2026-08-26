import type { InputActionMeta, MultiValue, OptionProps } from "react-select";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import Select, { components } from "react-select";
import { useDebouncedCallback } from "use-debounce";
import * as stylex from "@stylexjs/stylex";
import {
  colors,
  defaults,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

const TRANSITION_ALL =
  "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events";

const styles = stylex.create({
  chip: {
    marginRight: spacing[1],
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.gray100,
    paddingInline: spacing[2],
    paddingBlock: spacing[0.5],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    fontWeight: fontWeights.medium,
    color: colors.slate800,
  },
  titleRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between" },
  segmented: {
    position: "relative",
    zIndex: 0,
    display: "inline-flex",
    borderRadius: radii.md,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  },
  segment: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.slate600, ":focus": colors.emerald500 },
    backgroundColor: {
      default: colors.black,
      "@media (hover: hover)": { default: colors.black, ":hover": colors.emerald900 },
    },
    paddingInline: spacing[2],
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    transitionProperty: TRANSITION_ALL,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
    zIndex: { default: null, ":focus": 10 },
    boxShadow: { default: null, ":focus": `0 0 0 1px ${colors.emerald500}` },
    outlineStyle: { default: null, ":focus": "none" },
  },
  segmentFirst: { borderTopLeftRadius: radii.md, borderBottomLeftRadius: radii.md },
  segmentLast: {
    marginLeft: -1,
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  segmentOn: { backgroundColor: colors.slate800 },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  icon3: { height: spacing[3], width: spacing[3] },
  mt1: { marginTop: spacing[1] },
  mt3: { marginTop: spacing[3] },
  h2: { fontWeight: fontWeights.bold, color: colors.slate50 },
  panel: { display: "flex", minHeight: "360px", flexDirection: "column", gap: spacing[3] },
  rounded: { borderRadius: radii.default },
  centered: { display: "flex", flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: colors.slate700 },
  table: {
    position: "relative",
    minWidth: "100%",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  thead: {
    fontWeight: fontWeights.semibold,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: colors.slate600,
  },
  cell: { display: "table-cell", paddingInline: spacing[3], paddingBlock: spacing[3.5] },
  left: { textAlign: "left" },
  right: { textAlign: "right" },
  cellNoX: { display: "table-cell", paddingBlock: spacing[3.5] },
  tbody: { color: colors.slate500 },
  removeButton: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.slate600, ":focus": colors.emerald500 },
    paddingInline: spacing[2],
    paddingBlock: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: colors.white,
    transitionProperty: TRANSITION_ALL,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.emerald900 },
    },
    zIndex: { default: null, ":focus": 10 },
    boxShadow: { default: null, ":focus": `0 0 0 1px ${colors.emerald500}` },
    outlineStyle: { default: null, ":focus": "none" },
  },
});

import type { Props as ModalProps } from "@/components/Modal";
import type { CompHooksType } from "@/lib/comp";
import { FormField } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { currencyTextFormatProps, staticTextFormatProps } from "@/lib/formProps";

type Props = { requestUpdate: () => void } & CompHooksType & Omit<ModalProps, "title" | "children">;

const Option = ({ children, ...rest }: OptionProps<any>) => {
  return (
    <components.Option {...rest}>
      <span {...stylex.props(styles.chip)}>{rest.data.symbol}</span>
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
  requestUpdate,
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
    requestUpdate();
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
        <div {...stylex.props(styles.titleRow)}>
          <h1>{view === "estimate" ? "Estimate Equity Value" : "Terminology"}</h1>
          <span {...stylex.props(styles.segmented)}>
            <button
              type="button"
              {...stylex.props(
                styles.segment,
                styles.segmentFirst,
                view === "estimate" && styles.segmentOn,
              )}
              onClick={() => setView("estimate")}
            >
              <span {...stylex.props(styles.srOnly)}>Estimate Equity Value</span>
              <svg
                {...stylex.props(styles.icon3)}
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
              {...stylex.props(
                styles.segment,
                styles.segmentLast,
                view === "terminology" && styles.segmentOn,
              )}
              onClick={() => setView("terminology")}
            >
              <span {...stylex.props(styles.srOnly)}>Terminology</span>
              <svg
                {...stylex.props(styles.icon3)}
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
        <div {...stylex.props(styles.mt3)}>
          {isoCurrent && (
            <div>
              <h2 {...stylex.props(styles.h2)}>Preferred Stock Price</h2>
              <p {...stylex.props(styles.mt1)}>
                The preferred stock price is the price at which investors currently pay for shares
                of the company. You can ask your recruiter what the current price is.
              </p>
            </div>
          )}
          {rsuCurrent && (
            <div {...stylex.props(styles.mt3)}>
              <h2 {...stylex.props(styles.h2)}>Current Market Price</h2>
              <p {...stylex.props(styles.mt1)}>
                This is the stock price at which the company is currently trading
              </p>
            </div>
          )}
          {(isoRevenue || rsuRevenue) && (
            <div {...stylex.props(styles.mt3)}>
              <h2 {...stylex.props(styles.h2)}>Shares Outstanding</h2>
              <p {...stylex.props(styles.mt1)}>
                The shares outstanding is the number of shares that the company has available in the
                market.
              </p>
            </div>
          )}
          <div {...stylex.props(styles.mt3)}>
            {isoCurrent && (
              <>
                <h2 {...stylex.props(styles.h2)}>Expected Growth over 4 years</h2>
                <p {...stylex.props(styles.mt1)}>
                  Depending on the stage of the company expected growth can vary. Investors
                  typically expect a 10x return on what they put in.
                </p>
              </>
            )}
            {rsuCurrent && (
              <>
                <h2 {...stylex.props(styles.h2)}>Expected Market Growth</h2>
                <p {...stylex.props(styles.mt1)}>
                  How much do you expect the stock price to change every year? Anualized growth over
                  the last 4 years is a good estimate.
                </p>
              </>
            )}
            {(isoRevenue || rsuRevenue) && (
              <>
                <h2 {...stylex.props(styles.h2)}>Expected Company Revenue</h2>
                <p {...stylex.props(styles.mt1)}>
                  How much do you expect the company to make every year? Divide this number by the
                  number of shares outstanding to get the revenue multiple.
                </p>
                <h2 {...stylex.props(styles.mt3, styles.h2)}>Revenue Multiple</h2>
                <p {...stylex.props(styles.mt1)}>
                  The revenue multiple is the ratio of the company’s revenue relative to its stock
                  price. You can use your competitors revenue multiple to estimate what your share
                  value would be.
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {view === "estimate" && (
        <div {...stylex.props(styles.panel)}>
          <div {...stylex.props(styles.mt3)}>
            <p>Estimate reasonable numbers for your equity value by looking at competitors:</p>
            <div {...stylex.props(styles.mt3)}>
              <FormField
                {...stylex.props(styles.rounded)}
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
                  onChange={(selected) => loadCompaniesData(selected ?? [])}
                  isSearchable={companiesData.length < 3}
                  openMenuOnFocus={false}
                  openMenuOnClick={false}
                />
              </FormField>
            </div>
          </div>
          {companiesLoading && !companiesData.length ? (
            <div {...stylex.props(styles.centered)}>
              <h2 {...stylex.props(styles.loading)}>Loading companies...</h2>
            </div>
          ) : companiesData.length ? (
            <table {...stylex.props(styles.table)}>
              <thead {...stylex.props(styles.thead)}>
                <tr>
                  <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                    Company
                  </th>
                  {isoCurrent && (
                    <th scope="col" {...stylex.props(styles.cell)}>
                      Growth over last 4 years
                    </th>
                  )}
                  {rsuCurrent && (
                    <>
                      <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                        Current Market Value
                      </th>
                      <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                        Average Growth per year
                      </th>
                    </>
                  )}
                  {(isoRevenue || rsuRevenue) && (
                    <>
                      <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                        Shares Outstanding
                      </th>
                      <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                        Revenue
                      </th>
                      <th scope="col" {...stylex.props(styles.cell, styles.left)}>
                        Revenue Multiple
                      </th>
                    </>
                  )}
                  <th scope="col" {...stylex.props(styles.cellNoX, styles.right)} />
                </tr>
              </thead>
              <tbody {...stylex.props(styles.tbody)}>
                {companiesData.map((c: any) => (
                  <tr key={c.companyName}>
                    <td {...stylex.props(styles.cell)}>{c.companyName}</td>
                    {isoCurrent && (
                      <td {...stylex.props(styles.cell)}>
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
                        <td {...stylex.props(styles.cell)}>
                          <NumericFormat {...currencyTextFormatProps} value={c.day200MovingAvg} />
                        </td>
                        <td {...stylex.props(styles.cell)}>
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
                        <td {...stylex.props(styles.cell)}>
                          <NumericFormat
                            displayType="text"
                            thousandSeparator
                            valueIsNumericString
                            value={c.sharesOutstanding}
                          />
                        </td>
                        <td {...stylex.props(styles.cell)}>
                          <NumericFormat {...currencyTextFormatProps} value={c.revenue} />
                        </td>
                        <td {...stylex.props(styles.cell)}>
                          <NumericFormat
                            displayType="text"
                            thousandSeparator
                            valueIsNumericString
                            value={c.revenuePerShare}
                          />
                        </td>
                      </>
                    )}
                    <td {...stylex.props(styles.cellNoX, styles.right)}>
                      <button
                        type="button"
                        {...stylex.props(styles.removeButton)}
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
            <div {...stylex.props(styles.centered)}>
              <h2 {...stylex.props(styles.loading)}>Add a company above</h2>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
