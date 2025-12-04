import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { makeStyles } from "@fluentui/react-components";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant" | "tool";
  timestamp: Date;
  toolName?: string;
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

const useStyles = makeStyles({
  chatContainer: {
    flex: 1,
    overflowY: "scroll",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
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
    backgroundColor: "var(--colorNeutralBackground1Hover)",
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  messageTool: {
    alignSelf: "flex-start",
    padding: "4px 0",
    fontSize: "12px",
    color: "var(--colorNeutralForeground3)",
    cursor: "pointer",
  },
  toolArgs: {
    fontSize: "11px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    marginTop: "4px",
    color: "var(--colorNeutralForeground3)",
  },
});

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
}) => {
  const styles = useStyles();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      {messages.length === 0 && (
        <div className={styles.emptyState}>
          What can I do for you?
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.sender === "user" ? styles.messageUser : 
            message.sender === "tool" ? styles.messageTool :
            styles.messageAssistant
          }
          onClick={message.toolName ? () => toggleTool(message.id) : undefined}
        >
          {message.toolName ? (
            <>
              🔧 {message.toolName}
              {expandedTools.has(message.id) && (
                <div className={styles.toolArgs}>{message.text}</div>
              )}
            </>
          ) : message.text}
        </div>
      ))}
      
      {isTyping && (
        <div className={styles.messageAssistant}>
          <span>Typing...</span>
        </div>
      )}
      
      <div ref={chatEndRef} />
    </div>
  );
};
