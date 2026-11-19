import type { PluginContext, UnloadPluginContext } from "@sharkord/plugin-sdk";

// the whole plugin runs client side; the server only ships the bundle
const onLoad = async (ctx: PluginContext) => {
  ctx.ui.enable();
  ctx.logger.log("MicGain loaded");
};

const onUnload = async (ctx: UnloadPluginContext) => {
  ctx.logger.log("MicGain unloaded");
};

export { onLoad, onUnload };
