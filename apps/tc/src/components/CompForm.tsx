import type { CompHooksType } from "~/lib/comp";
import { useEffect, useState } from "react";
import { Listbox, RadioGroup } from "@headlessui/react";
import { CompModal } from "~/components/CompModal";
import { FormField } from "~/components/FormField";
import { useModal } from "~/components/Modal";
import {
  currencyInputFormatProps,
  staticInputFormatProps,
} from "~/lib/formProps";
import { NumericFormat } from "react-number-format";

type Props = {
  comp: CompHooksType;
};

export const CompForm = ({ comp }: Props) => {
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const modalProps = useModal();

  useEffect(() => {
    if (shouldUpdate) {
      comp.updateData();
      setShouldUpdate(false);
    }
  }, [comp, shouldUpdate]);

  return (
    <>
      <div>
        <fieldset className="cash-section">
          <legend className="text-sm text-slate-300">Cash Compensation</legend>
          <div className="isolate mt-2 -space-y-px rounded-md shadow-xs">
            <FormField
              className="rounded-b-none"
              label="Base Salary"
              name="base"
              placeholder="$100,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.base}
                onValueChange={({ value }) => comp.setBase(value)}
                onBlur={() => setShouldUpdate(true)}
              />
            </FormField>
            <FormField
              className="rounded-none"
              label="Sign on bonus"
              name="signon"
              placeholder="$10,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.signOnBonus}
                onValueChange={({ value }) => comp.setSignOnBonus(value)}
                onBlur={() => setShouldUpdate(true)}
              />
            </FormField>
            <FormField
              className="rounded-t-none"
              label="Yearly bonus target"
              name="target"
              placeholder="$10,000.00"
            >
              <NumericFormat
                {...currencyInputFormatProps}
                value={comp.targetBonus}
                onValueChange={({ value }) => comp.setTargetBonus(value)}
                onBlur={() => setShouldUpdate(true)}
              />
            </FormField>
          </div>
        </fieldset>
        <fieldset className="equity-section mt-10">
          <legend className="flex w-full justify-between text-sm text-slate-300">
            <span>Equity Compensation</span>
            <RadioGroup
              className="flex gap-2"
              value={comp.shareType}
              onChange={(shareType) => {
                comp.setShareType(shareType);
                comp.setIso("");
                comp.setStrikePrice("");
                comp.setRsu("");
                comp.setExpectedGrowthMultiple("");
              }}
              onBlur={() => setShouldUpdate(true)}
            >
              <RadioGroup.Option value="iso">
                {({ checked }) => (
                  <span
                    className={`cursor-pointer transition ${
                      checked ? "text-emerald-600" : ""
                    }`}
                  >
                    ISO
                  </span>
                )}
              </RadioGroup.Option>
              <RadioGroup.Option value="rsu">
                {({ checked }) => (
                  <span
                    className={`cursor-pointer transition ${
                      checked ? "text-emerald-600" : ""
                    }`}
                  >
                    RSU
                  </span>
                )}
              </RadioGroup.Option>
            </RadioGroup>
          </legend>
          {comp.shareType === "iso" && (
            <div className="isolate mt-2 -space-y-px rounded-md shadow-xs">
              <FormField
                className="rounded-b-none"
                label="Stock options per year"
                name="shares"
                placeholder="1,000"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.iso}
                  onValueChange={({ value }) => comp.setIso(value)}
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
              <FormField
                className="rounded-t-none"
                label="Strike Price per share"
                name="strike"
                placeholder="$10"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.strikePrice}
                  onValueChange={({ value }) => comp.setStrikePrice(value)}
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
            </div>
          )}
          {comp.shareType === "rsu" && (
            <div className="isolate mt-2 -space-y-px rounded-md shadow-xs">
              <FormField
                label="Shares per year"
                name="shares"
                placeholder="1,000"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.rsu}
                  onValueChange={({ value }) => comp.setRsu(value)}
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
            </div>
          )}
        </fieldset>
        <fieldset className="equity-value-section mt-10">
          <legend className="flex w-full items-center justify-between text-sm text-slate-300">
            <div className="flex items-center">
              <span>Estimate Equity Value</span>
              <button
                type="button"
                className="estimate-modal-button p-1"
                onClick={() => modalProps.openModal()}
              >
                <span className="sr-only">Find out for me</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
              <div className="relative">
                <Listbox.Button className="text-emerald-500">
                  {comp.shareCalcType === "current"
                    ? "Growth Based"
                    : comp.shareCalcType === "revenue"
                      ? "Revenue Based"
                      : null}
                </Listbox.Button>
                <Listbox.Options className="ring-opacity-5 absolute right-0 z-10 mt-1 max-h-60 w-[200px] overflow-auto rounded-lg bg-black text-sm shadow-lg ring-1 ring-black focus:outline-hidden">
                  <Listbox.Option
                    value="current"
                    className={({ active }) =>
                      `relative cursor-pointer px-4 py-2 select-none ${
                        active ? "bg-emerald-900 text-emerald-100" : ""
                      }`
                    }
                  >
                    Growth Based
                  </Listbox.Option>
                  <Listbox.Option
                    value="revenue"
                    className={({ active }) =>
                      `relative cursor-pointer px-4 py-2 select-none ${
                        active ? "bg-emerald-900 text-emerald-100" : ""
                      }`
                    }
                  >
                    Revenue Based
                  </Listbox.Option>
                </Listbox.Options>
              </div>
            </Listbox>
          </legend>
          {comp.shareCalcType === "current" && (
            <div className="isolate mt-2 -space-y-px rounded-md shadow-xs">
              <FormField
                className="rounded-b-none"
                label={
                  comp.shareType === "rsu"
                    ? "Current Market Value"
                    : "Preffered Stock Price"
                }
                name="preferredSharePrice"
                placeholder="$10.00"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.preferredSharePrice}
                  onValueChange={({ value }) =>
                    comp.setPreferredSharePrice(value)
                  }
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
              <FormField
                className="rounded-t-none"
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
                  onValueChange={({ value }) =>
                    comp.setExpectedGrowthMultiple(value)
                  }
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
            </div>
          )}
          {comp.shareCalcType === "revenue" && (
            <div className="isolate mt-2 -space-y-px rounded-md shadow-xs">
              <FormField
                className="rounded-b-none"
                label="Shares Outstanding"
                name="outstanding"
                placeholder="10,000,000"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.sharesOutstanding}
                  onValueChange={({ value }) =>
                    comp.setSharesOutstanding(value)
                  }
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
              <FormField
                className="rounded-none"
                label="Expected Company Revenue"
                name="revenue"
                placeholder="$100,000,000"
              >
                <NumericFormat
                  {...currencyInputFormatProps}
                  value={comp.expectedRevenue}
                  onValueChange={({ value }) => comp.setExpectedRevenue(value)}
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
              <FormField
                className="rounded-t-none"
                label="Revenue Multiple"
                name="revenue-multiple"
                placeholder="15"
              >
                <NumericFormat
                  {...staticInputFormatProps}
                  value={comp.revenueMultiple}
                  onValueChange={({ value }) => comp.setRevenueMultiple(value)}
                  onBlur={() => setShouldUpdate(true)}
                />
              </FormField>
            </div>
          )}
        </fieldset>
      </div>
      <CompModal {...comp} {...modalProps} setShouldUpdate={setShouldUpdate} />
    </>
  );
};
