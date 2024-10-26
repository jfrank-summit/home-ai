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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configure the assistant LLM with structured output
const assistantLlm = new ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    model: MODEL,
    temperature: 0.7,
    maxTokens: 2000,
}).withStructuredOutput(assistantSchema, { name: 'assistant' });

// Create the assistant chain
const assistantChain = assistantPrompt.pipe(assistantLlm);

const State = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
    followUpQuestions: Annotation<string[]>({
        reducer: (x, y) => [...new Set([...x, ...y])], // Ensure unique questions
    }),
});

const assistantNode = async (state: typeof State.State) => {
    logger.info('Assistant Node - Starting assistant process');
    const response = await assistantChain.invoke({
        messages: state.messages.map(msg => msg.content).join('\n')
    });
    logger.info('Assistant Node - Assistant process completed', { response });
    return {
        messages: [new AIMessage({ content: response.response })],
        followUpQuestions: response.followUpQuestions || [],
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

    const initialState = {
        messages: [new HumanMessage({ content: userRequest })],
        followUpQuestions: [],
        channels: {},
    };

    logger.info('AssistantAgent - Initial state prepared');

    const result = await app.invoke(initialState);

    logger.info('AssistantAgent - Result received', { result });

    // Check for messages in the result
    const lastMessage = result.messages?.[result.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
        logger.error('AssistantAgent - No valid message found', { result });
        throw new Error('Failed to generate assistant response');
    }

    logger.info('AssistantAgent - Assistant process completed');

    // Parse the response and create follow-up questions
    const response = lastMessage.content.toString();


    return {
        response,
        followUpQuestions: result.followUpQuestions || [],
    };
};
