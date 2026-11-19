import { build } from "@sharkord/plugin-builder";
import { PLUGIN_SDK_VERSION } from "@sharkord/plugin-sdk";

const result = await build({ sdkVersion: PLUGIN_SDK_VERSION });

console.log(`Built ${result.outDir}`);
