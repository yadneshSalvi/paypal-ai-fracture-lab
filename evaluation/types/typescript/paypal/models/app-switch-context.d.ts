import type { Schema } from "../core/validation/schema.js";
import { type MobileWebContext } from "./mobile-web-context.js";
import { type NativeAppContext } from "./native-app-context.js";
export type AppSwitchContext = {
    nativeApp?: NativeAppContext;
    mobileWeb?: MobileWebContext;
};
export declare const appSwitchContextSchema: Schema<AppSwitchContext>;
