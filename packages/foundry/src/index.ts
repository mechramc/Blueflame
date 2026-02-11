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

export {
	type BuilderConfig,
	type BuilderError,
	type BuilderFileOutput,
	type BuilderOutput,
	type BuilderResult,
	type BuilderTaskInput,
	buildBuilderPrompt,
	generateCode,
	parseBuilderOutput,
} from "./agents/builder.js";

export { BUILDER_SYSTEM_PROMPT } from "./agents/prompts/builder-system.js";

export {
	type CriterionResult,
	type VerifierConfig,
	type VerifierError,
	type VerifierInput,
	type VerifierOutput,
	type VerifierResult,
	buildVerifierPrompt,
	parseVerifierOutput,
	verifyCIResults,
} from "./agents/verifier.js";

export { VERIFIER_SYSTEM_PROMPT } from "./agents/prompts/verifier-system.js";

export {
	type ConstraintComplianceEntry,
	type CriterionMapping,
	type ExplainerConfig,
	type ExplainerInput,
	type ExplainerOutput,
	type ExplainerResult,
	buildExplainerPrompt,
	generateExplanation,
	parseExplainerOutput,
} from "./agents/explainer.js";

export { EXPLAINER_SYSTEM_PROMPT } from "./agents/prompts/explainer-system.js";
