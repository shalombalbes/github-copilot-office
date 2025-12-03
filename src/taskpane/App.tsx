import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Textarea,
  Button,
  makeStyles,
  Tooltip,
} from "@fluentui/react-components";
import { Send24Regular, Compose24Regular } from "@fluentui/react-icons";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  containerLight: {
    backgroundColor: "#f5f5f5",
  },
  containerDark: {
    backgroundColor: "#1b1a19",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "8px 12px",
    gap: "8px",
    minHeight: "40px",
  },
  headerLight: {
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#faf9f8",
  },
  headerDark: {
    borderBottom: "1px solid #3b3a39",
    backgroundColor: "#252423",
  },
  iconButton: {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    backgroundColor: "#0078d4",
    color: "white",
    borderRadius: "4px",
    padding: "4px",
    width: "28px",
    height: "28px",
    minWidth: "28px",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ":hover": {
      backgroundColor: "#106ebe",
    },
  },
  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontSize: "20px",
    fontWeight: "300",
  },
  inputContainer: {
    margin: "16px",
    padding: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    borderRadius: "6px",
  },
  inputContainerLight: {
    backgroundColor: "white",
    border: "1px solid #d1d1d1",
  },
  inputContainerDark: {
    backgroundColor: "#252423",
    border: "1px solid #3b3a39",
  },
  input: {
    flex: 1,
    padding: 0,
    borderRadius: "0",
    border: "none !important",
    backgroundColor: "transparent",
    outline: "none !important",
    boxShadow: "none !important",
    "::after": {
      display: "none !important",
    },
  },
  sendButton: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    padding: "0",
    alignSelf: "flex-end",
    backgroundColor: "transparent",
    border: "none",
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
    padding: "10px 14px",
    borderRadius: "12px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  messageAssistantLight: {
    backgroundColor: "white",
    color: "#323130",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
  },
  messageAssistantDark: {
    backgroundColor: "#292827",
    color: "#f3f2f1",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  },
});

export const App: React.FC = () => {
  const styles = useStyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();

    // Detect dark mode preference
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(darkModeQuery.matches);

    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeQuery.addEventListener("change", handleThemeChange);
    return () => darkModeQuery.removeEventListener("change", handleThemeChange);
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response with 1 second delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `You said: ${userMessage.text}`,
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
      <div className={`${styles.container} ${isDarkMode ? styles.containerDark : styles.containerLight}`}>
        <div className={`${styles.header} ${isDarkMode ? styles.headerDark : styles.headerLight}`}>
          <Tooltip content="New chat" relationship="label">
            <Button
              icon={<Compose24Regular />}
              onClick={handleClearChat}
              aria-label="New chat"
              className={styles.clearButton}
            />
          </Tooltip>
        </div>

        <div className={styles.chatContainer}>
          {messages.length === 0 && (
            <div className={styles.emptyState} style={{ color: isDarkMode ? "#8a8886" : "#999" }}>
              What can I do for you?
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.sender === "user"
                  ? styles.messageUser
                  : `${styles.messageAssistant} ${isDarkMode ? styles.messageAssistantDark : styles.messageAssistantLight}`
              }
            >
              {message.text}
            </div>
          ))}
          
          {isTyping && (
            <div className={`${styles.messageAssistant} ${isDarkMode ? styles.messageAssistantDark : styles.messageAssistantLight}`}>
              <span>Typing...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        <div className={`${styles.inputContainer} ${isDarkMode ? styles.inputContainerDark : styles.inputContainerLight}`}>
          <Textarea
            ref={inputRef}
            className={styles.input}
            value={inputValue}
            onChange={(e, data) => setInputValue(data.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={2}
          />
          <Tooltip content="Send message" relationship="label">
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={styles.sendButton}
            />
          </Tooltip>
        </div>
      </div>
    </FluentProvider>
  );
};
