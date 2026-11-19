import { PluginSlot } from "@sharkord/plugin-sdk";
import type { TPluginComponentsMapBySlotId } from "@sharkord/plugin-sdk/client";
import { PLUGIN_ID } from "./constants";
import { install, uninstall } from "./interceptor";
import { SettingsPage } from "./ui/settings-page";

const store = window.__SHARKORD_STORE__;

/**
 * The interceptor runs while the server has the plugin loaded. Turning the
 * plugin off in the server settings restores the browser's own getUserMedia
 * without a reload.
 */
const syncInterceptor = () => {
  const loaded = store
    .getState()
    .plugins.some((plugin) => plugin.pluginId === PLUGIN_ID);

  if (loaded) {
    install();
  } else {
    uninstall();
  }
};

store.subscribe(syncInterceptor);
syncInterceptor();

const components: TPluginComponentsMapBySlotId = {
  [PluginSlot.USER_SETTINGS]: [SettingsPage],
};

export { components };
