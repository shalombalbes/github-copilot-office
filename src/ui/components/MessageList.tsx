import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { makeStyles } from "@fluentui/react-components";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant" | "tool";
  timestamp: Date;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  images?: Array<{ dataUrl: string; name: string }>;
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  isConnecting?: boolean;
  currentActivity?: string;
  streamingText?: string;
}

// Tool display configuration
const toolConfig: Record<string, { icon: string; format: (args: Record<string, unknown>) => string }> = {
  get_slide_image: {
    icon: "📸",
    format: (args) => `Capturing slide ${(args.slideIndex as number) + 1}`,
  },
  get_presentation_overview: {
    icon: "📊",
    format: () => "Getting presentation overview",
  },
  get_presentation_content: {
    icon: "📄",
    format: (args) => {
      if (args.slideIndex !== undefined) return `Reading slide ${(args.slideIndex as number) + 1}`;
      if (args.startIndex !== undefined && args.endIndex !== undefined) 
        return `Reading slides ${(args.startIndex as number) + 1}–${(args.endIndex as number) + 1}`;
      return "Reading all slides";
    },
  },
  set_presentation_content: {
    icon: "✏️",
    format: (args) => `Adding content to slide ${(args.slideIndex as number) + 1}`,
  },
  clear_slide: {
    icon: "🗑️",
    format: (args) => `Clearing slide ${(args.slideIndex as number) + 1}`,
  },
  add_slide_from_code: {
    icon: "➕",
    format: () => "Creating new slide",
  },
  update_slide_shape: {
    icon: "✏️",
    format: (args) => `Updating shape on slide ${(args.slideIndex as number) + 1}`,
  },
  get_document_content: {
    icon: "📄",
    format: () => "Reading document",
  },
  set_document_content: {
    icon: "✏️",
    format: () => "Updating document",
  },
  get_workbook_info: {
    icon: "📊",
    format: () => "Getting workbook structure",
  },
  get_workbook_content: {
    icon: "📄",
    format: (args) => args.sheetName ? `Reading "${args.sheetName}"` : "Reading worksheet",
  },
  set_workbook_content: {
    icon: "✏️",
    format: (args) => args.sheetName ? `Updating "${args.sheetName}"` : "Updating worksheet",
  },
  web_fetch: {
    icon: "🌐",
    format: (args) => {
      try {
        const url = new URL(args.url as string);
        return `Fetching ${url.hostname}`;
      } catch {
        return "Fetching web content";
      }
    },
  },
  report_intent: {
    icon: "💭",
    format: (args) => args.intent as string || "Working",
  },
};

function formatToolCall(toolName: string, args: Record<string, unknown>): { icon: string; description: string } {
  const config = toolConfig[toolName];
  if (config) {
    return { icon: config.icon, description: config.format(args) };
  }
  // Fallback for unknown tools
  return { icon: "🔧", description: toolName.replace(/_/g, " ") };
}

const useStyles = makeStyles({
  chatContainer: {
    flex: 1,
    overflowY: "scroll",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    scrollbarColor: "var(--colorNeutralForeground4) transparent",
    scrollbarWidth: "thin",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: "20px",
    fontWeight: "300",
    color: "var(--colorNeutralForeground4)",
  },
  assistantIcon: {
    width: "24px",
    height: "24px",
    borderRadius: "4px",
  },
  messageUser: {
    alignSelf: "flex-end",
    backgroundColor: "#0078d4",
    color: "white",
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  messageAssistant: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    wordWrap: "break-word",
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: "8px",
    alignItems: "start",
    justifyItems: "center",
    "& p:first-child": {
      marginTop: 0,
    },
    "& p:last-child": {
      marginBottom: 0,
    },
  },
  messageTool: {
    alignSelf: "flex-start",
    fontSize: "13px",
    color: "var(--colorNeutralForeground2)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "12px",
    backgroundColor: "var(--colorNeutralBackground4)",
    transition: "background-color 0.15s",
    ":hover": {
      backgroundColor: "var(--colorNeutralBackground5)",
    },
  },
  toolIcon: {
    fontSize: "14px",
  },
  toolArgs: {
    fontSize: "11px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    marginTop: "4px",
    color: "var(--colorNeutralForeground3)",
  },
  attachmentContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px",
  },
  attachmentThumbnail: {
    width: "120px",
    height: "120px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "2px solid rgba(255, 255, 255, 0.3)",
  },
  attachmentBadge: {
    fontSize: "11px",
    opacity: "0.8",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  streamingIndicator: {
    color: "var(--colorNeutralForeground3)",
    fontStyle: "italic",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
});

// Animated dots component for streaming indicator
const StreamingDots: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes pulse-dot {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
          .streaming-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: var(--colorNeutralForeground3, #666);
            animation: pulse-dot 1.4s ease-in-out infinite;
          }
        `}
      </style>
      <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '2px' }}>
        <span className="streaming-dot" style={{ animationDelay: '0s' }} />
        <span className="streaming-dot" style={{ animationDelay: '0.2s' }} />
        <span className="streaming-dot" style={{ animationDelay: '0.4s' }} />
      </span>
    </>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  isConnecting,
  currentActivity,
  streamingText,
}) => {
  const styles = useStyles();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const toggleTool = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.chatContainer}>
      {messages.length === 0 && !isConnecting && (
        <div className={styles.emptyState}>
          What can I do for you?
        </div>
      )}

      {isConnecting && (
        <div className={styles.emptyState}>
          Connecting...
        </div>
      )}
      
      {messages.map((message) => {
        // Format tool calls nicely
        const toolDisplay = message.toolName 
          ? formatToolCall(message.toolName, message.toolArgs || {})
          : null;
        
        return (
        <div
          key={message.id}
          className={
            message.sender === "user" ? styles.messageUser : 
            message.sender === "tool" ? styles.messageTool :
            styles.messageAssistant
          }
          onClick={message.toolName ? () => toggleTool(message.id) : undefined}
          title={message.toolName ? "Click to show details" : undefined}
        >
          {toolDisplay ? (
            <>
              <span className={styles.toolIcon}>{toolDisplay.icon}</span>
              <span>{toolDisplay.description}</span>
              {expandedTools.has(message.id) && (
                <div className={styles.toolArgs}>{message.text}</div>
              )}
            </>
          ) : message.sender === "assistant" ? (
            <>
              <img src="/icon-32.png" alt="" className={styles.assistantIcon} />
              <div style={{ justifySelf: 'start' }}><Markdown remarkPlugins={[remarkGfm]}>{message.text}</Markdown></div>
            </>
          ) : (
            <>
              {message.text}
              {message.images && message.images.length > 0 && (
                <div className={styles.attachmentContainer}>
                  {message.images.map((img, idx) => (
                    <div key={idx}>
                      <img src={img.dataUrl} alt={img.name} className={styles.attachmentThumbnail} />
                      <div className={styles.attachmentBadge}>📎 {img.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
      })}
      
      {isTyping && (
        <div className={styles.messageAssistant}>
          <img src="/icon-32.png" alt="" className={styles.assistantIcon} />
          <div style={{ justifySelf: 'start' }}>
            {streamingText ? (
              <Markdown remarkPlugins={[remarkGfm]}>{streamingText}</Markdown>
            ) : (
              <span className={styles.streamingIndicator}>
                {currentActivity || "Thinking"}
                <StreamingDots />
              </span>
            )}
          </div>
        </div>
      )}
      
      <div ref={chatEndRef} />
    </div>
  );
};
