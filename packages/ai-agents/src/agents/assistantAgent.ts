import { END, StateGraph, START, Annotation } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
import { assistantSchema } from './schemas';
import { assistantPrompt } from './prompts';
import { AssistantAgentParams, AssistantAgentOutput } from './types';
import logger from '../logger';

// Load environment variables
dotenv.config();

const MODEL = 'gpt-4o-mini';

// Configure the assistant LLM with structured output
const assistantLlm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: MODEL,
    temperature: 0.7,
    maxTokens: 2000,
}).withStructuredOutput(assistantSchema, { name: 'assistant' });

// Create the assistant chain
const assistantChain = assistantPrompt.pipe(assistantLlm);

// Define the state using Annotation.Root
const State = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

const assistantNode = async (state: typeof State.State) => {
    logger.info('Assistant Node - Starting assistant process');
    const response = await assistantChain.invoke({ messages: state.messages });
    logger.info('Assistant Node - Assistant process completed');
    return {
        messages: [new AIMessage(response.response)],
        output: response,
    };
};

// Create the workflow with proper state definition
const workflow = new StateGraph(State)
    .addNode('assist', assistantNode)
    .addEdge(START, 'assist')
    .addEdge('assist', END);

const app = workflow.compile();

export const assistantAgent = async ({
    userRequest,
}: AssistantAgentParams): Promise<AssistantAgentOutput> => {
    logger.info('AssistantAgent - Starting assistant process', { userRequest });

    // Initialize state with channels
    const initialState = {
        messages: [new HumanMessage(userRequest)],
    };

    logger.info('AssistantAgent - Initial state prepared');

    const result = await app.invoke(initialState);

    if (!result.output) {
        logger.error('AssistantAgent - No output was generated');
        throw new Error('Failed to generate assistant response');
    }

    logger.info('AssistantAgent - Assistant process completed');
    return {
        response: result.output.response,
        followUpQuestions: result.output.followUpQuestions,
    };
};
