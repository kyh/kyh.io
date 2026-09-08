import { useState } from "react";

const baseData = [
  {
    base: 0,
    bonus: 0,
    stock: 0,
    year: "1",
  },
  {
    base: 0,
    bonus: 0,
    stock: 0,
    year: "2",
  },
  {
    base: 0,
    bonus: 0,
    stock: 0,
    year: "3",
  },
  {
    base: 0,
    bonus: 0,
    stock: 0,
    year: "4",
  },
];

export type BaseDataType = typeof baseData;

type ShareCalcType = "current" | "revenue";

const calculateBase = (base = "0") => Number(base || "0");

const calculateBonus = (year = "1", signOnBonus = "0", targetBonus = "0") => {
  if (year === "1") {
    return Number(signOnBonus || "0") + Number(targetBonus || "0");
  }
  return Number(targetBonus || "0");
};

const calculateStocks = (shares = "0", strikePrice = "0", shareValue = "0") => {
  const total =
    Number(shares || "0") * Number(shareValue || "0") -
    Number(shares || "0") * Number(strikePrice || "0");
  return Math.max(total, 0);
};

const compoundInterest = (principle = 0, rate = 0, time = 1, n = 1) => {
  const amount = principle * (1 + rate / n) ** (n * time);
  const interest = amount - principle;
  return interest;
};

const calculateShareValueFromMultiple = (
  preferredSharePrice = "0",
  multiple = "0",
  calcTotal = true,
  year = "1",
) => {
  const price = Number(preferredSharePrice || "0");
  const rate = Number(multiple || "0");

  if (calcTotal) {
    return (price * rate || 1).toFixed(2);
  }

  const interest = compoundInterest(price, rate / 100, Math.trunc(Number(year)));
  return (price + interest).toFixed(2);
};

const calculateShareValueFromRevenue = (
  sharesOutstanding = "0",
  expectedRevenue = "0",
  revenueMultiple = "0",
) => {
  const valuation = Number(expectedRevenue || "0") * Number(revenueMultiple || "0");
  const shareValue = valuation / Math.trunc(Number(sharesOutstanding || "1"));

  return shareValue.toFixed(2);
};

export const useCompHooks = () => {
  const [data, setData] = useState(baseData);

  // cash comp
  const [base, setBase] = useState("");
  const [signOnBonus, setSignOnBonus] = useState("");
  const [targetBonus, setTargetBonus] = useState("");

  // stock info
  const [shareType, setShareType] = useState("iso");
  const [iso, setIso] = useState("");
  const [strikePrice, setStrikePrice] = useState("");
  const [rsu, setRsu] = useState("");

  // stock comp
  const [shareCalcType, setShareCalcType] = useState<ShareCalcType>("current");
  // common
  const [preferredSharePrice, setPreferredSharePrice] = useState("");
  const [expectedGrowthMultiple, setExpectedGrowthMultiple] = useState("");
  // revenue
  const [sharesOutstanding, setSharesOutstanding] = useState("");
  const [expectedRevenue, setExpectedRevenue] = useState("");
  const [revenueMultiple, setRevenueMultiple] = useState("");

  const updateData = () => {
    setData((prevData) =>
      prevData.map((d) => {
        const sv =
          shareCalcType === "current"
            ? calculateShareValueFromMultiple(
                preferredSharePrice,
                expectedGrowthMultiple,
                shareType === "iso",
                d.year,
              )
            : calculateShareValueFromRevenue(sharesOutstanding, expectedRevenue, revenueMultiple);

        return {
          ...d,
          base: calculateBase(base),
          bonus: calculateBonus(d.year, signOnBonus, targetBonus),
          stock:
            shareType === "iso"
              ? calculateStocks(iso, strikePrice, sv)
              : calculateStocks(rsu, "0", sv),
        };
      }),
    );
  };

  return {
    base,
    data,
    expectedGrowthMultiple,
    expectedRevenue,
    iso,
    preferredSharePrice,
    revenueMultiple,
    rsu,
    setBase,
    setExpectedGrowthMultiple,
    setExpectedRevenue,
    setIso,
    setPreferredSharePrice,
    setRevenueMultiple,
    setRsu,
    setShareCalcType,
    setShareType,
    setSharesOutstanding,
    setSignOnBonus,
    setStrikePrice,
    setTargetBonus,
    shareCalcType,
    shareType,
    sharesOutstanding,
    signOnBonus,
    strikePrice,
    targetBonus,
    updateData,
  };
};

export type CompHooksType = ReturnType<typeof useCompHooks>;
