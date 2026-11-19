import { useSyncExternalStore } from "react";
import { getStatus, subscribeStatus } from "../interceptor";
import { getSettings, subscribeSettings } from "../settings";

const useSettings = () => useSyncExternalStore(subscribeSettings, getSettings);

const useStatus = () => useSyncExternalStore(subscribeStatus, getStatus);

export { useSettings, useStatus };
