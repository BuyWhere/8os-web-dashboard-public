# AI Assistant Feature (OS-1739)

## Overview
The AI Assistant is an always-on conversational assistant embedded in the dashboard, powered by Flow AI's API. It helps users manage their goals, projects, tasks, calendar, and OS configuration through natural language.

## Components

### 1. Flow AI Client (`src/lib/flow-ai.ts`)
- OpenAI-compatible chat completions via `https://api.flowaiapi.com`
- Streaming response support for real-time chat
- Tool/function calling support

### 2. Assistant Tools (`src/lib/assistant-tools.ts`)
Tool definitions for OS manipulation:
- **Goals**: `get_goals`, `update_goal`
- **Projects**: `get_projects`, `create_project`, `update_project`
- **Tasks**: `get_tasks`, `create_task`, `complete_task`
- **Calendar**: `get_calendar_events`, `create_calendar_event`
- **OS Config**: `get_archetype_info`, `get_energy_hours`

### 3. Tool Executor (`src/lib/assistant-tool-executor.ts`)
Executes tool calls by interacting with the database:
- Reads/writes goals, projects, tasks from user's OS config
- Manages calendar events
- Returns archetype and energy hour information

### 4. Chat API (`src/app/api/assistant/chat/route.ts`)
- Streaming chat endpoint with tool execution
- Manages conversation history
- Handles multi-turn conversations with tool calls

### 5. Conversations API (`src/app/api/assistant/conversations/route.ts`)
- List and create conversations
- Persist conversation history

### 6. Chat UI (`src/components/assistant/AssistantChat.tsx`)
- Always-on conversational interface
- Streaming message display
- Tool execution indicators
- Expand/collapse functionality

### 7. Assistant Panel (`src/components/assistant/AssistantPanel.tsx`)
- Client-side wrapper for the chat panel
- Toggle button for expand/collapse
- State persistence in localStorage

## Database Schema
Added to `prisma/schema.prisma`:
- `AssistantConversation`: Stores conversation metadata
- `AssistantMessage`: Stores individual messages with tool call results

## Environment Variables
Add to `.env`:
```
FLOW_AI_API_KEY=<your-flow-ai-api-key>
```

## Integration
The assistant is integrated into the dashboard layout:
- `src/app/(dashboard)/layout.tsx` includes the `AssistantPanel`
- Panel appears as a floating button in the bottom-right corner
- Clicking expands a 384px chat panel from the right

## Architecture
1. User sends message → Chat API
2. Chat API builds context (system prompt + history + new message)
3. Flow AI processes with tool calling enabled
4. If tool calls returned, execute them via Tool Executor
5. Send tool results back to Flow AI for final response
6. Stream response back to UI
7. Persist conversation and messages to database

## Next Steps
- [ ] Set up Flow AI API key in production
- [ ] Add proactive suggestions based on archetype + calendar
- [ ] Integrate with Cal.com for real calendar operations
- [ ] Add message search and conversation management UI
- [ ] Implement drift/coaching engine integration (OS-22)
