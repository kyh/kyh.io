import type { Node } from "./components/infinite-grid";
import styles from "@/styles/page.module.css";
import { InfiniteGrid } from "./components/infinite-grid";

export const metadata = {
  title: "Projects",
  description: "The ever growing list of things I'm working on.",
};

const gallery: Node[] = [
  {
    id: 0,
    type: "image",
    src: "/screenshots/amazon-ds.webp",
    dataBlur:
      "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoQAAwAAUAmJagCdLoAAwkBvegA/v29UctAdfkdHg29PWJSqGyVt/+nGP/JS/00j6U93+LYrgyoAA==",
    url: "https://design.amazon.com",
  },
  {
    id: 1,
    type: "image",
    src: "/screenshots/atrium.webp",
    dataBlur:
      "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADQAQCdASoQAAwAAUAmJaQAAuafBgmYAAD+9fljiQX0uQIXlcAKRTrP/H++I3FnboNY2MVVCDSkZJ/yTu+kEwJ9ADg17RGQAAA=",
    url: "https://www.crunchbase.com/organization/atrium-lts",
  },
  {
    id: 2,
    type: "image",
    src: "/screenshots/cardiogram.webp",
    dataBlur:
      "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAgCdASoQAAwAAUAmJZwCw7D0uKmpGNtDAAD+/gJZSH6K4fTPLnMe0LDP31p+YC8Z3gV54kQfHCvUM7NKrfCnpgUeAAAA",
    url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
  },
  {
    id: 3,
    type: "image",
    src: "/screenshots/covid19.webp",
    dataBlur:
      "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
    url: "https://covid-19.kyh.io",
  },
  {
    id: 4,
    type: "image",
    src: "/screenshots/founding.webp",
    dataBlur:
      "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
    url: "https://founding.so",
  },
  {
    id: 5,
    type: "image",
    src: "/screenshots/keiko.webp",
    dataBlur:
      "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    id: 6,
    type: "image",
    src: "/screenshots/slyce.webp",
    dataBlur:
      "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADQAQCdASoQAAwAAUAmJZwAAudljfFYAAD+/pmxYSp4yOONaQeF5/fWRam8ThOk9MqRSC7AHjEfrm4h9atrfO8kfY4GxG9TlyLNd6rv9NZD392rAAA=",
    url: "https://www.crunchbase.com/organization/slyce",
  },
  {
    id: 7,
    type: "image",
    src: "/screenshots/stonks.webp",
    dataBlur:
      "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
    url: "https://stonksville.com",
  },
  {
    id: 8,
    type: "image",
    src: "/screenshots/init.webp",
    dataBlur:
      "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
    url: "https://init.kyh.io",
  },
  {
    id: 9,
    type: "image",
    src: "/screenshots/tc.webp",
    dataBlur:
      "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
    url: "https://tc.kyh.io",
  },
  {
    id: 10,
    type: "image",
    src: "/screenshots/truffles.webp",
    dataBlur:
      "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAACwAQCdASoQAAwAAUAmJaQAAuQXRR4AAP7+7XQ2ry8a0MfqHJH0uHS/5LOWen07Pkad4dWCZkLtS+UKAAA=",
    url: "https://2uphq.com",
  },
  {
    id: 11,
    type: "image",
    src: "/screenshots/uicapsule.webp",
    dataBlur:
      "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
    url: "https://uicapsule.com",
  },
  {
    id: 12,
    type: "image",
    src: "/screenshots/ys.webp",
    dataBlur:
      "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
    url: "https://yourssincerely.org",
  },
  {
    id: 13,
    type: "video",
    src: "/screenshots/codepen.mp4",
    url: "https://codepen.io/kyhio/pen/ExdXaKQ",
  },
  {
    id: 14,
    type: "video",
    src: "/screenshots/arc.webm",
    url: "https://sequoiacap.com",
  },
];

const ProjectsPage = () => (
  <main className={styles.projectsContainer} vaul-drawer-wrapper="">
    <InfiniteGrid nodes={gallery} />
  </main>
);

export default ProjectsPage;
