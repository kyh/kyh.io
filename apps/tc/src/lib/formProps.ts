export const staticInputFormatProps = {
  displayType: "input" as const,
  thousandSeparator: true,
  isNumericString: true,
  allowNegative: false,
};

export const staticTextFormatProps = {
  decimalSeparator: ".",
  displayType: "text" as const,
  thousandSeparator: true,
  isNumericString: true,
  allowNegative: false,
  decimalScale: 2,
  fixedDecimalScale: true,
};

export const currencyInputFormatProps = {
  prefix: "$",
  decimalSeparator: ".",
  displayType: "input" as const,
  thousandSeparator: true,
  isNumericString: true,
  allowNegative: false,
};

export const currencyTextFormatProps = {
  prefix: "$",
  decimalSeparator: ".",
  displayType: "text" as const,
  thousandSeparator: true,
  isNumericString: true,
  allowNegative: false,
  decimalScale: 2,
  fixedDecimalScale: true,
};
