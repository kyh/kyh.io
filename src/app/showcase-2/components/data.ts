import { all } from "../../showcase/components/data";

export type Item = {
  name: string;
  degree: number;
  variant?: "small" | "medium" | "large";
  title: string;
  description: string;
  url: string;
  projectAssets: any[];
  type: "project" | "work";
};

export type LineType = {
  variant: Item["variant"];
  rotation: number;
  offsetX: number;
  offsetY: number;
  dataIndex: number | null;
};

export type Lines = LineType[];
export type Data = Item[];

// Transform showcase projects into radial data
export const RAW_DATA: Data = all.map((project, index) => ({
  name: project.title,
  degree: index, // Simple sequential indexing
  variant: "large" as const, // All projects are "large" variant
  title: project.title,
  description: project.description,
  url: project.url,
  projectAssets: project.projectAssets,
  type: project.type,
}));

export const DATA = RAW_DATA;
