export const staticInputFormatProps = {
  allowNegative: false,
  displayType: "input" as const,
  thousandSeparator: true,
  valueIsNumericString: true,
};

export const staticTextFormatProps = {
  allowNegative: false,
  decimalScale: 2,
  decimalSeparator: ".",
  displayType: "text" as const,
  fixedDecimalScale: true,
  thousandSeparator: true,
  valueIsNumericString: true,
};

export const currencyInputFormatProps = {
  allowNegative: false,
  decimalSeparator: ".",
  displayType: "input" as const,
  prefix: "$",
  thousandSeparator: true,
  valueIsNumericString: true,
};

export const currencyTextFormatProps = {
  allowNegative: false,
  decimalScale: 2,
  decimalSeparator: ".",
  displayType: "text" as const,
  fixedDecimalScale: true,
  prefix: "$",
  thousandSeparator: true,
  valueIsNumericString: true,
};
