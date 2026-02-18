// src/lib/deepseek-handler.ts

/**
 * DeepSeek R1 returns reasoning/thinking in a special format.
 * This handler parses and separates thinking from final answer.
 *
 * DeepSeek R1 via Bedrock uses <think>...</think> tags for its reasoning process. */
 
 export interface ParsedDeepSeekResponse {
thinking: string;
answer: string;
hasThinking: boolean;
}

/**

Parse DeepSeek R1 response to separate thinking from answer
*/
export function parseDeepSeekResponse(content: string): ParsedDeepSeekResponse {
// DeepSeek R1 format
const thinkMatch = content
const parts = this.buffer.split("</think>");
this.thinkingContent += parts[0];
this.inThinking = false;
this.thinkingComplete = true;
this.buffer = parts.slice(1).join("</think>");

// Return any remaining buffer as answer
if (this.buffer.length > 0) {
const content = this.buffer;
this.answerContent += content;
this.buffer = "";
return { type: "answer", content };
}
return null;
}

// During thinking
if (this.inThinking) {
const content = this.buffer;
this.thinkingContent += content;
this.buffer = "";
return { type: "thinking", content };
}

// After thinking (or no thinking)
if (this.thinkingComplete || !this.buffer.includes("<")) {
const content = this.buffer;
this.answerContent += content;
this.buffer = "";
if (content.length > 0) {
return { type: "answer", content };
}
}

return null;
}

getResult(): ParsedDeepSeekResponse {
return {
thinking: this.thinkingContent.trim(),
answer: this.answerContent.trim(),
hasThinking: this.thinkingContent.length > 0,
};
}
}