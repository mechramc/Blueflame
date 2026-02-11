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

export {
	type SpecGeneratorConfig,
	generateSpec,
} from "./agents/spec-generator.js";

export { SPEC_GENERATION_SYSTEM_PROMPT } from "./agents/prompts/spec-generation-system.js";

export {
	type PlannerConfig,
	type RawPlanOutput,
	type RawPlanTask,
	generatePlan,
	parsePlanOutput,
	validateDAG,
} from "./agents/planner.js";

export { PLANNER_SYSTEM_PROMPT } from "./agents/prompts/planner-system.js";
