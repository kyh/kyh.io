import type { IosAppFolderItem } from "@/components/ios-app-folder";
import { IosAppFolder } from "@/components/ios-app-folder";
import { getPublicAssetUrl } from "@/lib/public-assets";

const sideQuestItems: IosAppFolderItem[] = [
  {
    key: "usdr",
    layoutId: "usdr",
    name: "USDR",
    iconSrc: getPublicAssetUrl("usdr.svg"),
  },
  {
    key: "nodejs",
    layoutId: "nodejs",
    name: "OpenJS",
    iconSrc: getPublicAssetUrl("nodejs.svg"),
  },
  {
    key: "github",
    layoutId: "github",
    name: "GitHub",
    iconSrc: getPublicAssetUrl("github.svg"),
  },
  {
    key: "showcase",
    layoutId: "showcase",
    name: "Showcase",
    iconSrc: "/favicon/favicon.svg",
  },
];

export const SideQuests = () => (
  <div className="mt-1">
    <IosAppFolder title="Side Quests" items={sideQuestItems} />
  </div>
);
