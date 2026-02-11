/**
 * @blueflame/foundry — Microsoft Foundry SDK wrappers
 *
 * All Foundry agent operations go through this package.
 * Apps should never import Foundry SDK directly.
 */

export {
	type DesignerConfig,
	type StreamCallbacks,
	streamDesignerResponse,
	toOpenAIMessages,
} from "./agents/designer.js";

export { DESIGNER_SYSTEM_PROMPT } from "./agents/prompts/designer-system.js";
