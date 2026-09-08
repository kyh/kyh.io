import React, { useState } from "react";
import { PageContainer } from "components/page-container";
import { Sidebar } from "features/trend/sidebar";
import { useGetStatesDailyData } from "hooks/use-get-states-daily-data";
import { useGetUSDailyData } from "hooks/use-get-us-daily-data";

import { SELECTIONS } from "./data-filter";
import { Featured } from "./featured";

import "./trend-page.css";

export const TrendPage = () => {
  const { isLoading: isLoadingDaily, data: usDailyData } = useGetUSDailyData();
  const { isLoading: isLoadingStates, data: statesDailyData, states } = useGetStatesDailyData();

  const [selectedState, setSelectedState] = useState(
    localStorage.getItem("selectedState") || undefined,
  );

  const [selectedFilter, setSelectedFilter] = useState(
    localStorage.getItem("selectedFilter") || SELECTIONS.time,
  );

  const onSelectState = (state) => {
    if (selectedState === state) {
      localStorage.removeItem("selectedState");
      setSelectedState(undefined);
    } else {
      localStorage.setItem("selectedState", state);
      setSelectedState(state);
    }
  };

  const onSelectFilter = (selection) => {
    localStorage.setItem("selectedFilter", selection);
    setSelectedFilter(selection);
  };

  return (
    <PageContainer>
      <Sidebar
        states={states}
        isLoading={isLoadingStates}
        selectedState={selectedState}
        onSelectState={onSelectState}
        statesDailyData={statesDailyData}
        usDailyData={usDailyData}
      />
      <Featured
        dailyData={statesDailyData[selectedState] || usDailyData}
        selectedState={selectedState}
        selectedFilter={selectedFilter}
        onSelectFilter={onSelectFilter}
        isLoading={isLoadingDaily}
      />
    </PageContainer>
  );
};
