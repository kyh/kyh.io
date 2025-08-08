import { all } from "../../showcase/components/data";

export type Item = {
  name: string;
  year: number;
  degree: number;
  variant?: "medium" | "large";
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

// Transform showcase projects into timeline data
export const RAW_DATA: Data = all.map((project, index) => ({
  name: project.title,
  year: 2020 + index, // Assign years sequentially starting from 2020
  degree: 0, // Will be calculated by transformData
  variant: "large" as const, // All projects are "large" variant
  title: project.title,
  description: project.description,
  url: project.url,
  projectAssets: project.projectAssets,
  type: project.type,
}));

let previousIndex = 0;

export function transformData(data: Data, minGap = 5) {
  return data.map((item, index) => {
    if (index !== 0) {
      const previousYear = data[index - 1]?.year ?? 0;
      const currentYear = item.year;

      const yearDifference = currentYear - previousYear;
      if (yearDifference >= minGap) {
        item.degree = previousIndex + yearDifference;
      } else {
        item.degree = previousIndex + minGap + yearDifference;
      }
    } else {
      item.degree = 0;
    }

    previousIndex = item.degree;
    return item;
  });
}

export const DATA = transformData(RAW_DATA);

export const loremIpsum = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In scelerisque mollis mauris, eu condimentum massa tincidunt id. Vestibulum et consequat libero, at malesuada odio.",
  "Nam nec dapibus ligula. Donec aliquet convallis quam, id molestie felis vestibulum a. Duis at erat a risus posuere rhoncus vel at massa. Fusce fringilla diam quis est suscipit egestas.",
  "Cras rutrum, sem vitae convallis finibus, lacus risus dapibus erat, quis porta est mi et libero. Suspendisse volutpat fermentum felis, id pretium metus consequat sed.",
  "Sed euismod, erat sed efficitur eleifend, libero mi fringilla enim, ut facilisis risus dolor eget lectus. Integer eleifend sagittis odio, vitae convallis risus aliquam eget.",
  "Suspendisse sed nisi tristique, gravida lorem id, posuere lorem. Duis vehicula sapien nec lacinia vestibulum. Phasellus consequat ipsum vitae est congue, a mollis nunc vestibulum.",
  "Nulla in ipsum augue. Nulla facilisi. Nam imperdiet velit a risus volutpat, ac fringilla sapien dapibus. Maecenas dapibus laoreet facilisis.",
  "Etiam sit amet mi id leo eleifend viverra. Morbi ultrices ligula nec fringilla consectetur. Suspendisse ac justo non purus tempus fringilla non eu magna.",
  "Pellentesque luctus ornare imperdiet. Vivamus in odio tristique, rhoncus nibh at, placerat ipsum. Donec porta orci ex, ut dignissim quam pretium eleifend.",
  "Cras hendrerit lacus ac mi feugiat, non venenatis lorem congue. Ut eget diam ligula. Morbi eu commodo quam. Sed et lectus id mi facilisis dapibus.",
  "In viverra pretium cursus. Sed gravida, risus in consectetur feugiat, urna odio interdum metus, vitae dignissim augue purus ac neque.",
  "Vivamus ut pulvinar felis, in lacinia magna. Sed interdum lectus ante, sed feugiat enim pretium sit amet. Fusce turpis velit, tempor eu justo at, iaculis mollis est.",
  "Curabitur bibendum id sapien at interdum. Aliquam pharetra, est at pulvinar dignissim, eros massa dapibus eros, non interdum libero urna nec ligula.",
  "Nullam porttitor hendrerit nisl non viverra. Sed et feugiat eros. Nunc tempor fermentum dapibus. Nam id bibendum nunc, at condimentum augue.",
  "Proin laoreet turpis a ligula condimentum, eu facilisis eros aliquet. Donec at justo dignissim, molestie tellus quis, tristique ipsum.",
  "Sed sed tellus at lorem feugiat pulvinar ac eget metus. Curabitur id magna massa. Vestibulum suscipit ligula vitae justo elementum ultrices.",
  "Nam ex dui, venenatis at sagittis eu, eleifend a urna. Nunc suscipit lectus ac felis cursus, nec finibus quam ultricies.",
  "Phasellus ut iaculis enim. Praesent id facilisis neque. Maecenas libero nisl, aliquam nec ex suscipit, eleifend fringilla risus.",
  "Integer tempus semper pulvinar. Nullam bibendum elit vitae feugiat congue. Phasellus imperdiet, lacus a mollis congue, tortor ligula euismod tellus, id tristique dui erat eget tortor.",
  "Quisque tincidunt mauris nec libero lobortis, vel hendrerit velit viverra. Aliquam vestibulum turpis a leo efficitur fermentum.",
  "Fusce id lorem a enim varius maximus. Suspendisse potenti. Aenean bibendum turpis non maximus eleifend.",
  "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In scelerisque quam eget eros consequat fermentum.",
  "Cras porttitor metus at enim aliquet pharetra. Donec mollis nisl nec dapibus aliquam. Aliquam facilisis pulvinar justo sed rutrum.",
  "Nullam aliquet scelerisque tincidunt. Quisque lectus nulla, convallis ac dignissim non, rhoncus id est.",
  "Praesent dapibus hendrerit fringilla. Nunc dictum pellentesque augue eget tincidunt. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
  "Vestibulum vehicula, turpis eget consequat vulputate, est dui tristique ipsum, sit amet ultricies urna urna vel tortor.",
  "Curabitur et risus mauris. Sed maximus enim ut erat elementum, quis condimentum neque commodo. Cras efficitur ac ex in fermentum.",
];
