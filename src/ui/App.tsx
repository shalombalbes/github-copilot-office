import { useState, useEffect } from "react";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
} from "@fluentui/react-components";
import { ChatInput, ImageAttachment } from "./components/ChatInput";
import { Message, MessageList } from "./components/MessageList";
import { HeaderBar, ModelType } from "./components/HeaderBar";
import { useIsDarkMode } from "./useIsDarkMode";
import { useLocalStorage } from "./useLocalStorage";
import { createWebSocketClient } from "./lib/websocket-client";
import { getToolsForHost } from "./tools";
import React from "react";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "var(--colorNeutralBackground3)",
  },
});

const DEFAULT_MODEL: ModelType = "claude-sonnet-4.5";

export const App: React.FC = () => {
  const styles = useStyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useLocalStorage<ModelType>("word-addin-selected-model", DEFAULT_MODEL);
  const isDarkMode = useIsDarkMode();

  const startNewSession = async (model: ModelType) => {
    setMessages([]);
    setInputValue("");
    setImages([]);
    setIsTyping(false);
    setCurrentActivity("");
    setStreamingText("");
    setError("");
    
    try {
      if (client) {
        await client.stop();
      }
      const host = Office.context.host;
      const tools = getToolsForHost(host);
      const newClient = await createWebSocketClient(`wss://${location.host}/api/copilot`);
      setClient(newClient);
      
      // Build host-specific system message
      const hostName = host === Office.HostType.PowerPoint ? "PowerPoint" 
        : host === Office.HostType.Word ? "Word" 
        : host === Office.HostType.Excel ? "Excel" 
        : "Office";
      
      const systemMessage = {
        mode: "append" as const,
        content: `You are an AI assistant embedded inside Microsoft ${hostName} as an Office Add-in. You have direct access to the open ${hostName} document through the tools provided.

IMPORTANT: You are NOT a file system assistant. The user's document is already open in ${hostName}. Use your ${hostName} tools (like get_presentation_content, get_presentation_overview, get_slide_image, etc.) to read and modify the document directly. Do NOT search for files on disk or ask the user to provide file paths.

${host === Office.HostType.PowerPoint ? `For PowerPoint:
- Use get_presentation_overview first to see all slides and understand the deck structure
- Use get_presentation_content to read slide text (supports ranges like startIndex/endIndex for large decks)
- Use get_slide_image to capture a slide's visual design, colors, and layout
- The presentation is already open - just call the tools directly` : ''}

${host === Office.HostType.Word ? `For Word:
- Use get_document_content to read the document
- Use set_document_content to modify it
- The document is already open - just call the tools directly` : ''}

${host === Office.HostType.Excel ? `For Excel:
- Use get_workbook_info to understand the workbook structure
- Use get_workbook_content to read cell data
- The workbook is already open - just call the tools directly` : ''}

Always use your tools to interact with the document. Never ask users to save, export, or provide file paths.`
      };
      
      setSession(await newClient.createSession({ model, tools, systemMessage }));
    } catch (e: any) {
      setError(`Failed to create session: ${e.message}`);
    }
  };

  useEffect(() => {
    startNewSession(selectedModel);
  }, []);

  const handleModelChange = (newModel: ModelType) => {
    setSelectedModel(newModel);
    startNewSession(newModel);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && images.length === 0) || !session) return;

    // Add user message with images
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      text: inputValue || (images.length > 0 ? `Sent ${images.length} image${images.length > 1 ? 's' : ''}` : ''),
      sender: "user",
      timestamp: new Date(),
      images: images.length > 0 ? images.map(img => ({ dataUrl: img.dataUrl, name: img.name })) : undefined,
    }]);
    const userInput = inputValue;
    const userImages = [...images];
    setInputValue("");
    setImages([]);
    setIsTyping(true);
    setCurrentActivity("Processing...");
    setStreamingText("");
    setError("");

    try {
      // Upload images to server and get file paths
      const attachments: Array<{ type: "file", path: string, displayName?: string }> = [];
      
      for (const image of userImages) {
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              dataUrl: image.dataUrl,
              name: image.name 
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
          }
          
          const result = await response.json();
          attachments.push({
            type: "file",
            path: result.path,
            displayName: image.name,
          });
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          setError(`Failed to upload image: ${uploadError.message}`);
        }
      }

      for await (const event of session.query({ 
        prompt: userInput || "Here are some images for you to analyze.",
        attachments: attachments.length > 0 ? attachments : undefined
      })) {
        console.log('[event]', event.type, event);
        
        if (event.type === 'assistant.message.delta') {
          // Streaming text chunk
          const delta = (event.data as any).delta || (event.data as any).content || '';
          setStreamingText(prev => prev + delta);
          setCurrentActivity("");
        } else if (event.type === 'assistant.message' && (event.data as any).content) {
          // Complete message - add to messages and clear streaming
          setStreamingText("");
          setCurrentActivity("");
          setMessages((prev) => [...prev, {
            id: event.id,
            text: (event.data as any).content,
            sender: "assistant",
            timestamp: new Date(event.timestamp),
          }]);
        } else if (event.type === 'tool.execution_start') {
          const toolName = (event.data as any).toolName;
          setCurrentActivity(`Calling ${toolName}...`);
          setMessages((prev) => [...prev, {
            id: event.id,
            text: JSON.stringify((event.data as any).arguments, null, 2),
            sender: "tool",
            toolName: toolName,
            timestamp: new Date(event.timestamp),
          }]);
        } else if (event.type === 'tool.execution_end') {
          setCurrentActivity("Processing result...");
        } else if (event.type === 'assistant.thinking') {
          setCurrentActivity("Thinking...");
        } else if (event.type === 'assistant.turn_start') {
          setCurrentActivity("Starting response...");
        } else if (event.type === 'assistant.turn_end') {
          setCurrentActivity("");
          setStreamingText("");
          console.log('[turn_end]', (event.data as any).stopReason);
        }
      }
      console.log('[query complete]');
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
      <div className={styles.container}>
        <HeaderBar 
          onNewChat={() => startNewSession(selectedModel)} 
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          isConnecting={!session && !error}
          currentActivity={currentActivity}
          streamingText={streamingText}
        />

        {error && <div style={{ color: 'red', padding: '8px' }}>{error}</div>}

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          images={images}
          onImagesChange={setImages}
        />
      </div>
    </FluentProvider>
  );
};
