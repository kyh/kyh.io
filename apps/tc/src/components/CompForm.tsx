import { a11y } from "@repo/tailwind-compat/a11y.stylex";
import { boxShadow, ringSlots, shadowLayers } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import { useEffect, useRef, useState } from "react";
import { Listbox, RadioGroup } from "@headlessui/react";
import { NumericFormat } from "react-number-format";
import * as stylex from "@stylexjs/stylex";
import { colors, fontSizes, defaults, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

const styles = stylex.create({
  mt10: { marginTop: spacing[10] },
  legendPlain: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate300,
  },
  legend: {
    display: "flex",
    width: "100%",
    justifyContent: "space-between",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate300,
  },
  legendCentered: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.slate300,
  },
  radioGroup: { display: "flex", gap: spacing[2] },
  radio: {
    cursor: "pointer",
    transitionProperty: transitionProperty.default,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  radioChecked: { color: colors.emerald600 },
  stack: {
    isolation: "isolate",
    marginTop: spacing[2],
    borderRadius: radii.md,
    boxShadow: boxShadow.xs,
  },
  /** Negative margin collapses each field border into its neighbour. */
  stackTop: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: -1,
  },
  stackMiddle: { borderRadius: 0, marginBottom: -1 },
  stackBottom: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  row: { display: "flex", alignItems: "center" },
  iconButton: { padding: spacing[1] },
  icon4: { height: spacing[4], width: spacing[4] },
  relative: { position: "relative" },
  listboxButton: { color: colors.emerald500 },
  option: {
    position: "relative",
    cursor: "pointer",
    paddingInline: spacing[4],
    paddingBlock: spacing[2],
    userSelect: "none",
  },
  optionActive: { backgroundColor: colors.emerald900, color: colors.emerald100 },
  listboxOptions: {
    position: "absolute",
    right: 0,
    zIndex: 10,
    marginTop: spacing[1],
    maxHeight: spacing[60],
    width: "200px",
    overflow: "auto",
    borderRadius: radii.lg,
    backgroundColor: colors.black,
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    boxShadow: `${ringSlots.before}, 0 0 0 1px ${colors.black}, ${shadowLayers.lg}`,
    outlineStyle: { default: null, ":focus": "none" },
  },
});

import type { CompHooksType } from "@/lib/comp";
import { CompModal } from "@/components/CompModal";
import { FormField } from "@/components/FormField";
import { useModal } from "@/components/Modal";
import { currencyInputFormatProps, staticInputFormatProps } from "@/lib/formProps";

type Props = {
  comp: CompHooksType;
};

export const CompForm = ({ comp }: Props) => {
  // `comp.updateData` reads the field state via closure, so it has to run after
  // the edits that triggered it have been applied — hence the request counter
  // rather than a direct call from the handlers.
  const [updateRequest, setUpdateRequest] = useState(0);
  const appliedRequest = useRef(0);
  const modalProps = useModal();

  const requestUpdate = () => setUpdateRequest((n) => n + 1);

  useEffect(() => {
    if (appliedRequest.current === updateRequest) return;
    appliedRequest.current = updateRequest;
    comp.updateData();
  }, [comp, updateRequest]);

  return (
    <>
      <div>
        <fieldset className="cash-section">
          <legend {...stylex.props(styles.legendPlain)}>Cash Compensation</legend>
          <div {...stylex.props(styles.stack)}>
            <FormField
              style={styles.stackTop}
              label="Base Salary"
              name="base"
              placeholder="$100,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.base}
                onValueChange={({ value }) => comp.setBase(value)}
                onBlur={requestUpdate}
              />
            </FormField>
            <FormField
              style={styles.stackMiddle}
              label="Sign on bonus"
              name="signon"
              placeholder="$10,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.signOnBonus}
                onValueChange={({ value }) => comp.setSignOnBonus(value)}
                onBlur={requestUpdate}
              />
            </FormField>
            <FormField
              style={styles.stackBottom}
              label="Yearly bonus target"
              name="target"
              placeholder="$10,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.targetBonus}
                onValueChange={({ value }) => comp.setTargetBonus(value)}
                onBlur={requestUpdate}
              />
            </FormField>
          </div>
        </fieldset>
        <fieldset className={`equity-section ${stylex.props(styles.mt10).className}`}>
          <legend {...stylex.props(styles.legend)}>
            <span>Equity Compensation</span>
            <RadioGroup
              className={stylex.props(styles.radioGroup).className}
              value={comp.shareType}
              onChange={(shareType) => {
                comp.setShareType(shareType);
                comp.setIso("");
                comp.setStrikePrice("");
                comp.setRsu("");
                comp.setExpectedGrowthMultiple("");
              }}
              onBlur={requestUpdate}
            >
              <RadioGroup.Option value="iso">
                {({ checked }) => (
                  <span {...stylex.props(styles.radio, checked && styles.radioChecked)}>ISO</span>
                )}
              </RadioGroup.Option>
              <RadioGroup.Option value="rsu">
                {({ checked }) => (
                  <span {...stylex.props(styles.radio, checked && styles.radioChecked)}>RSU</span>
                )}
              </RadioGroup.Option>
            </RadioGroup>
          </legend>
          {comp.shareType === "iso" && (
            <div {...stylex.props(styles.stack)}>
              <FormField
                style={styles.stackTop}
                label="Stock options per year"
                name="shares"
                placeholder="1,000"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.iso}
                  onValueChange={({ value }) => comp.setIso(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
              <FormField
                style={styles.stackBottom}
                label="Strike Price per share"
                name="strike"
                placeholder="$10"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.strikePrice}
                  onValueChange={({ value }) => comp.setStrikePrice(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
            </div>
          )}
          {comp.shareType === "rsu" && (
            <div {...stylex.props(styles.stack)}>
              <FormField label="Shares per year" name="shares" placeholder="1,000">
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.rsu}
                  onValueChange={({ value }) => comp.setRsu(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
            </div>
          )}
        </fieldset>
        <fieldset className={`equity-value-section ${stylex.props(styles.mt10).className}`}>
          <legend {...stylex.props(styles.legendCentered)}>
            <div {...stylex.props(styles.row)}>
              <span>Estimate Equity Value</span>
              <button
                type="button"
                className={`estimate-modal-button ${stylex.props(styles.iconButton).className}`}
                onClick={() => modalProps.openModal()}
              >
                <span {...stylex.props(a11y.srOnly)}>Find out for me</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  {...stylex.props(styles.icon4)}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            </div>
            <Listbox
              value={comp.shareCalcType}
              onChange={(shareCalcType) => {
                comp.setShareCalcType(shareCalcType);
                comp.setPreferredSharePrice("");
                comp.setExpectedGrowthMultiple("");
                comp.setSharesOutstanding("");
                comp.setExpectedRevenue("");
                comp.setRevenueMultiple("");
              }}
            >
              <div {...stylex.props(styles.relative)}>
                <Listbox.Button {...stylex.props(styles.listboxButton)}>
                  {comp.shareCalcType === "current"
                    ? "Growth Based"
                    : comp.shareCalcType === "revenue"
                      ? "Revenue Based"
                      : null}
                </Listbox.Button>
                <Listbox.Options {...stylex.props(styles.listboxOptions)}>
                  <Listbox.Option
                    value="current"
                    className={({ active }) =>
                      stylex.props(styles.option, active && styles.optionActive).className ?? ""
                    }
                  >
                    Growth Based
                  </Listbox.Option>
                  <Listbox.Option
                    value="revenue"
                    className={({ active }) =>
                      stylex.props(styles.option, active && styles.optionActive).className ?? ""
                    }
                  >
                    Revenue Based
                  </Listbox.Option>
                </Listbox.Options>
              </div>
            </Listbox>
          </legend>
          {comp.shareCalcType === "current" && (
            <div {...stylex.props(styles.stack)}>
              <FormField
                style={styles.stackTop}
                label={comp.shareType === "rsu" ? "Current Market Value" : "Preffered Stock Price"}
                name="preferredSharePrice"
                placeholder="$10.00"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.preferredSharePrice}
                  onValueChange={({ value }) => comp.setPreferredSharePrice(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
              <FormField
                style={styles.stackBottom}
                label={
                  comp.shareType === "rsu"
                    ? "Expected Market Growth (per year)"
                    : "Expected Growth over 4 years"
                }
                name="revenue-multiple"
                placeholder={comp.shareType === "rsu" ? "30%" : "5x"}
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  allowNegative
                  suffix={comp.shareType === "rsu" ? "%" : "x"}
                  value={comp.expectedGrowthMultiple}
                  onValueChange={({ value }) => comp.setExpectedGrowthMultiple(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
            </div>
          )}
          {comp.shareCalcType === "revenue" && (
            <div {...stylex.props(styles.stack)}>
              <FormField
                style={styles.stackTop}
                label="Shares Outstanding"
                name="outstanding"
                placeholder="10,000,000"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.sharesOutstanding}
                  onValueChange={({ value }) => comp.setSharesOutstanding(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
              <FormField
                style={styles.stackMiddle}
                label="Expected Company Revenue"
                name="revenue"
                placeholder="$100,000,000"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.expectedRevenue}
                  onValueChange={({ value }) => comp.setExpectedRevenue(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
              <FormField
                style={styles.stackBottom}
                label="Revenue Multiple"
                name="revenue-multiple"
                placeholder="15"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.revenueMultiple}
                  onValueChange={({ value }) => comp.setRevenueMultiple(value)}
                  onBlur={requestUpdate}
                />
              </FormField>
            </div>
          )}
        </fieldset>
      </div>
      <CompModal {...comp} {...modalProps} requestUpdate={requestUpdate} />
    </>
  );
};
