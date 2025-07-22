import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Mic, Brain, Network, HelpCircle, ChevronDown, Loader2, MicOff, ExternalLink, Copy, Check, Gamepad2, Quote, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ToolOverlay } from './ToolOverlays';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  model?: string;
  toolUsed?: string;
  toolResponse?: {
    type: string;
    content: string | string[] | any[];
    toolResponseId?: string;
  };
  highlightedText?: {
    text: string;
    context: string;
  };
}

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface Section {
  section_id: string;
  title: string;
  page: number;
}

interface Chapter {
  chapter_id: string;
  chapter_number: string;
  title: string;
  sections: Section[] | null;
}

interface TOC {
  book_id: string;
  chapters: Chapter[];
}

interface ChatMessage {
  id: string;
  chat_session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_id: string | null;
  tool_response_id: string | null;
  tool_type: string | null;
  created_at: string;
}

interface ChatHistory {
  chat_session_id: string;
  messages: ChatMessage[];
}

interface ToolResponse {
  id: string;
  tool_type: string;
  response: string[];
  created_at: string;
  response_text: string | null;
}

interface ToolPanelProps {
  chatSessionId: string;
  documentId: string;
  currentPage: number;
  tocData?: TOC;
  initialChatHistory?: ChatHistory | null;
  onTextHighlight?: (selectedText: string, context: string, toolType?: string) => void;
}

interface ToolPanelRef {
  handleHighlightedText: (text: string, context: string, toolType?: string) => void;
  handleDirectToolGeneration: (text: string, context: string, toolType: string) => void;
}

const availableModels = [
  { id: 'd50a33ce-2462-4a5a-9aa7-efc2d1749745', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini', provider: 'Google' },
];

const availableTools: Tool[] = [
  {
    id: 'flashcard',
    name: 'Flashcards',
    icon: <Brain className="w-4 h-4" />,
    description: 'Generate flashcards',
    color: 'text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950'
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <HelpCircle className="w-4 h-4" />,
    description: 'Create quiz questions',
    color: 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
  },
  {
    id: 'diagram',
    name: 'Diagrams',
    icon: <Network className="w-4 h-4" />,
    description: 'Generate diagrams',
    color: 'text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950'
  },
  {
    id: 'game',
    name: 'Games',
    icon: <Gamepad2 className="w-4 h-4" />,
    description: 'Create learning games',
    color: 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'
  }
];

// Get tool-specific button text
const getToolButtonText = (toolType: string): string => {
  const type = toolType.toLowerCase();
  if (type.includes('flashcard')) return 'Open Flashcards';
  if (type.includes('quiz')) return 'Open Quiz';
  if (type.includes('diagram')) return 'Open Diagrams';
  if (type.includes('game')) return 'Open Game';
  return 'Open Tool';
};

// Get tool name for display
const getToolDisplayName = (toolType: string): string => {
  const type = toolType.toLowerCase();
  if (type.includes('flashcard')) return 'Flashcards';
  if (type.includes('quiz')) return 'Quiz';
  if (type.includes('diagram')) return 'Diagrams';
  if (type.includes('game')) return 'Games';
  return toolType;
};

// Message Component with Copy Button
const MessageComponent: React.FC<{
  message: Message;
  selectedModelInfo: any;
  onOpenToolMessage: (toolResponse: { type: string; content: string | string[] | any[]; toolResponseId?: string }) => void;
  onLoadToolResponse: (toolResponseId: string, toolType: string) => Promise<void>;
}> = ({ message, selectedModelInfo, onOpenToolMessage, onLoadToolResponse }) => {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [isLoadingTool, setIsLoadingTool] = useState(false);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates(prev => ({ ...prev, [messageId]: true }));
      toast.success('Message copied!');
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleOpenTool = async () => {
    if (!message.toolResponse) return;

    // If we have the content already, open it directly
    if (message.toolResponse.content && 
        (Array.isArray(message.toolResponse.content) ? 
         message.toolResponse.content.length > 0 : 
         message.toolResponse.content.length > 0)) {
      onOpenToolMessage(message.toolResponse);
      return;
    }

    // If we have a tool response ID but no content, fetch it
    if (message.toolResponse.toolResponseId) {
      setIsLoadingTool(true);
      try {
        await onLoadToolResponse(message.toolResponse.toolResponseId, message.toolResponse.type);
      } catch (error) {
        toast.error('Failed to load tool response');
      } finally {
        setIsLoadingTool(false);
      }
    }
  };

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg p-2 ${
          message.sender === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Highlighted text context */}
        {message.highlightedText && (
          <div className={`mb-2 p-2 rounded border-l-2 ${
            message.sender === 'user' 
              ? 'bg-primary-foreground/10 border-l-primary-foreground/30' 
              : 'bg-accent/50 border-l-accent-foreground/30'
          }`}>
            <div className="flex items-start gap-2">
              <Quote className="w-3 h-3 mt-0.5 opacity-70" />
              <div className="flex-1">
                <p className="text-xs opacity-90 mb-1">Selected from document:</p>
                <p className="text-xs italic">"{message.highlightedText.text}"</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="text-sm whitespace-pre-wrap flex-1">{message.content}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(message.content, message.id)}
            className={`h-5 w-5 p-0 flex-shrink-0 ${
              message.sender === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-accent'
            }`}
          >
            {copiedStates[message.id] ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        
        {message.toolResponse && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenTool}
              disabled={isLoadingTool}
              className="text-xs gap-1 h-5 px-2"
            >
              {isLoadingTool ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              {getToolButtonText(message.toolResponse.type)}
            </Button>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-1 text-xs opacity-70">
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.sender === 'ai' && message.model && selectedModelInfo && (
            <Badge variant="secondary" className="text-xs h-4">
              {selectedModelInfo.name}
            </Badge>
          )}
        </div>
        {message.toolUsed && (
          <Badge variant="outline" className="text-xs mt-1 h-4">
            📊 {message.toolUsed}
          </Badge>
        )}
      </div>
    </div>
  );
};

export const ToolPanel = forwardRef<ToolPanelRef, ToolPanelProps>(({
  chatSessionId,
  documentId,
  currentPage,
  tocData,
  initialChatHistory,
  onTextHighlight
}, ref) => {
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolResponse, setToolResponse] = useState<{ tool: string; content: string; isCollapsed: boolean } | null>(null);
  const [contextText, setContextText] = useState<{ text: string; context: string } | null>(null);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Tool overlay states
  const [activeOverlay, setActiveOverlay] = useState<{ type: string; content: string | string[] | any[]; toolResponseId?: string } | null>(null);
  
  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleHighlightedText: (text: string, context: string, toolType?: string) => {
      setContextText({ text, context });
      setInputValue(`Please explain: "${text}"`);
    },
    handleDirectToolGeneration: (text: string, context: string, toolType: string) => {
      // Generate tool content directly and show in chat (no auto-opening overlay)
      const toolName = getToolDisplayName(toolType);
      const toolMessage = `Generate ${toolName.toLowerCase()} from the selected text: "${text}"`;
      handleSendMessage(toolMessage, true, { text, context });
      toast.info(`Generating ${toolName.toLowerCase()} from selected text...`);
    }
  }));

  // Handle text highlighting from tool overlays
  const handleToolTextHighlight = (selectedText: string, context: string) => {
    // Set the context and input for the chat
    setContextText({ text: selectedText, context });
    setInputValue(`Please explain: "${selectedText}"`);
    toast.success('Selected text added to chat!');
  };

  // Load tool response from API
  const loadToolResponse = async (toolResponseId: string, toolType: string): Promise<void> => {
    try {
      // Mock API response based on provided structure
      const mockToolResponse: ToolResponse = {
        id: toolResponseId,
        tool_type: toolType,
        response: [
          "graph TD\n    Blockchain  -->  A[Decentralized Network]\n    A  -->  B[Nodes  Peers]\n    B  -->  C[Transactions Verified]\n    C  -->  D[Blocks Created]\n    D  -->  E[Blockchain Updated]",
          "graph TD\n    Transaction  -->  A[Verified by Nodes]\n    A  -->  B[Encrypted  Linked]\n    B  -->  C[Block Created]\n    C  -->  D[Block Hashed]\n    D  -->  E[Blockchain Updated]",
          "graph TD\n    Data  -->  A[Encrypted]\n    A  -->  B[Distributed Ledger]\n    B  -->  C[Decentralized Network]\n    C  -->  D[Consensus Mechanism]\n    D  -->  E[Validated Transactions]"
        ],
        created_at: "2025-07-18T00:18:56.906161+00:00",
        response_text: null
      };

      // Update the message with the loaded tool response
      setMessages(prev => prev.map(msg => {
        if (msg.toolResponse?.toolResponseId === toolResponseId) {
          return {
            ...msg,
            toolResponse: {
              ...msg.toolResponse,
              content: mockToolResponse.response
            }
          };
        }
        return msg;
      }));

      // Open the tool overlay with the loaded content
      setActiveOverlay({
        type: toolType,
        content: mockToolResponse.response,
        toolResponseId
      });
    } catch (error) {
      console.error('Failed to load tool response:', error);
      throw error;
    }
  };

  // Initialize messages from chat history
  useEffect(() => {
    const convertMessagesFromHistory = async () => {
      if (initialChatHistory && initialChatHistory.messages.length > 0) {
        const convertedMessages: Message[] = await Promise.all(
          initialChatHistory.messages.map(async (msg) => {
            let toolResponse = undefined;
            
            if (msg.tool_response_id && msg.tool_type) {
              toolResponse = {
                type: msg.tool_type,
                content: [], // Will be loaded on demand
                toolResponseId: msg.tool_response_id
              };
            }

            return {
              id: msg.id,
              content: msg.content,
              sender: msg.role === 'user' ? 'user' : 'ai' as const,
              timestamp: new Date(msg.created_at),
              model: msg.model_id || undefined,
              toolUsed: msg.tool_type || undefined,
              toolResponse
            };
          })
        );
        setMessages(convertedMessages);
      } else {
        // Default welcome message if no history
        setMessages([{
          id: '1',
          content: 'Hello! I\'m here to help you study. Ask me questions, use the tools to generate flashcards, quizzes, diagrams, or games, or highlight any text in the document to instantly access all learning tools.',
          sender: 'ai',
          timestamp: new Date(),
          model: availableModels[0].id
        }]);
      }
    };

    convertMessagesFromHistory();
  }, [initialChatHistory]);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    if (messagesEndRef.current && chatContainerRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Get current section and chapter info
  const getCurrentContext = () => {
    if (!tocData) return { chapterName: '', sectionName: '', chapterId: null, sectionId: null };
    
    for (const chapter of tocData.chapters) {
      if (chapter.sections) {
        for (const section of chapter.sections) {
          if (section.page === currentPage) {
            return {
              chapterName: chapter.title,
              sectionName: section.title,
              chapterId: chapter.chapter_id,
              sectionId: section.section_id
            };
          }
        }
      }
    }
    return { chapterName: '', sectionName: '', chapterId: null, sectionId: null };
  };

  // Voice recording functionality
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Audio recording not supported.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setTimeout(() => {
          const transcribedText = "Can you explain the key concepts in this section?";
          setInputValue(prev => prev + (prev ? '\n' : '') + transcribedText);
          toast.success('Audio transcribed!');
        }, 1000);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred.');
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started...');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording.');
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        toast.info('Processing audio...');
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [isRecording]);

  // Send message API call
  const sendChatMessage = async (content: string, autoGenerated = false, highlightedText?: { text: string; context: string }) => {
    const context = getCurrentContext();
    
    try {
      const mockResponse = {
        chat_session_id: chatSessionId,
        role: "assistant",
        content: highlightedText 
          ? `Based on the selected text "${highlightedText.text}", this refers to ${highlightedText.text.toLowerCase()}. ${highlightedText.text} is a fundamental concept that plays a crucial role in algorithm analysis. It represents the upper bound of an algorithm's time complexity, helping us understand the worst-case scenario for performance.`
          : autoGenerated 
            ? "I've analyzed the selected content and generated the requested tool. You can interact with the results using the tool button below."
            : "This page discusses important concepts. The content covers fundamental principles that are essential for understanding the subject matter.",
        model_id: selectedModel,
        tool_type: autoGenerated ? (
          content.includes('game') ? 'game' :
          content.includes('diagram') ? 'diagram' : 
          content.includes('flashcard') ? 'flashcard' : 'quiz'
        ) : null,
        tool_response_id: autoGenerated ? 'mock-response-' + Date.now() : null,
        tool_response: autoGenerated ? (
          content.includes('game') ? [
            "**Memory Match Game**\n\nMatch the algorithm concepts with their definitions:\n\n1. Big O → Time complexity upper bound\n2. DFS → Depth-first search\n3. BFS → Breadth-first search\n4. Heap → Complete binary tree",
            "**Quiz Game**\n\nAnswer these questions to level up:\n\n**Level 1:** What is O(n)?\n**Level 2:** Which is faster: O(log n) or O(n)?\n**Level 3:** Implement bubble sort"
          ] :
          content.includes('diagram') ? [
            "graph TD\n    Algorithm[Algorithm Analysis] --> TimeComplexity[Time Complexity]\n    Algorithm --> SpaceComplexity[Space Complexity]\n    TimeComplexity --> BigO[Big O Notation]\n    TimeComplexity --> Omega[Omega Notation]\n    TimeComplexity --> Theta[Theta Notation]",
            "graph LR\n    Input[Input Size n] --> Linear[O(n)]\n    Input --> Quadratic[O(n²)]\n    Input --> Logarithmic[O(log n)]\n    Input --> Constant[O(1)]"
          ] : content.includes('flashcard') ? [
            {
              "id": "1",
              "question": "What is the primary subject of the book 'Introduction to Algorithms'?",
              "answer": "Computer algorithms and programming.",
              "difficulty": 1,
              "topic": "Book Overview"
            },
            {
              "id": "2",
              "question": "Who are the authors of 'Introduction to Algorithms'?",
              "answer": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, and Clifford Stein.",
              "difficulty": 1,
              "topic": "Book Overview"
            },
            {
              "id": "3",
              "question": "What is Algorithm Analysis?",
              "answer": "Algorithm analysis is the process of determining the computational complexity of algorithms - both time and space complexity.",
              "difficulty": 2,
              "topic": "Algorithm Analysis"
            },
            {
              "id": "4",
              "question": "What does Big O notation represent?",
              "answer": "Big O notation describes the upper bound of time complexity in the worst-case scenario for an algorithm.",
              "difficulty": 2,
              "topic": "Algorithm Analysis"
            },
            {
              "id": "5",
              "question": "What is the difference between O(n) and O(log n)?",
              "answer": "O(n) is linear time complexity where runtime increases directly with input size, while O(log n) is logarithmic time where runtime increases much slower.",
              "difficulty": 3,
              "topic": "Time Complexity"
            }
          ] : content.includes('quiz') ? [
            {
              "id": "1",
              "question": "What does Big O notation represent in algorithm analysis?",
              "options": [
                "a) Best case time complexity",
                "b) Average case time complexity", 
                "c) Worst case time complexity",
                "d) Space complexity only"
              ],
              "correct_answer": "c) Worst case time complexity",
              "explanation": "Big O notation specifically describes the upper bound of an algorithm's time complexity, representing the worst-case scenario. This helps developers understand how the algorithm will perform under the most challenging conditions.",
              "difficulty": 2,
              "topic": "Algorithm Analysis",
              "question_type": "multiple_choice"
            },
            {
              "id": "2", 
              "question": "Which of the following algorithms has O(log n) time complexity?",
              "options": [
                "a) Linear search",
                "b) Binary search",
                "c) Bubble sort", 
                "d) Selection sort"
              ],
              "correct_answer": "b) Binary search",
              "explanation": "Binary search achieves O(log n) time complexity because it eliminates half of the remaining elements in each step. This logarithmic behavior makes it very efficient for searching in sorted arrays.",
              "difficulty": 2,
              "topic": "Search Algorithms",
              "question_type": "multiple_choice"
            },
            {
              "id": "3",
              "question": "What is the time complexity of accessing an element in an array by index?",
              "options": [
                "a) O(1)",
                "b) O(log n)",
                "c) O(n)",
                "d) O(n²)"
              ],
              "correct_answer": "a) O(1)",
              "explanation": "Array access by index is O(1) or constant time because arrays store elements in contiguous memory locations. The memory address can be calculated directly using the base address plus the index offset.",
              "difficulty": 1,
              "topic": "Data Structures",
              "question_type": "multiple_choice"
            },
            {
              "id": "4",
              "question": "Which sorting algorithm is generally considered the most efficient for large datasets?",
              "options": [
                "a) Bubble sort",
                "b) Selection sort",
                "c) Quick sort",
                "d) Insertion sort"
              ],
              "correct_answer": "c) Quick sort",
              "explanation": "Quick sort has an average time complexity of O(n log n) and is generally faster in practice than other O(n log n) algorithms like merge sort due to better cache performance and lower constant factors.",
              "difficulty": 3,
              "topic": "Sorting Algorithms", 
              "question_type": "multiple_choice"
            },
            {
              "id": "5",
              "question": "Hash tables provide O(1) average case time complexity for insertions and lookups.",
              "options": [
                "a) True",
                "b) False"
              ],
              "correct_answer": "a) True", 
              "explanation": "Hash tables do provide O(1) average case time complexity for basic operations when the hash function distributes elements evenly. However, in the worst case (many collisions), operations can degrade to O(n).",
              "difficulty": 2,
              "topic": "Data Structures",
              "question_type": "true_false"
            }
          ] : [
            "**Question 1:** What does Big O notation represent?\na) Best case\nb) Average case\nc) Worst case\nd) Space only\n\n**Answer:** c) Worst case"
          ]
        ) : null,
        created_at: new Date().toISOString(),
        highlighted_text: highlightedText ? {
          text: highlightedText.text,
          context: highlightedText.context,
          page: currentPage,
          chapter_id: context.chapterId,
          section_id: context.sectionId
        } : null
      };

      return mockResponse;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const handleSendMessage = async (messageContent?: string, autoGenerated = false, highlightedTextOverride?: { text: string; context: string }) => {
    const content = messageContent || inputValue;
    if (!content.trim() || isLoading) return;

    const currentContextText = highlightedTextOverride || contextText;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content,
      sender: 'user',
      timestamp: new Date(),
      highlightedText: currentContextText || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    if (!autoGenerated) {
      setInputValue('');
    }
    
    // Clear context after sending (unless overridden)
    if (!highlightedTextOverride) {
      setContextText(null);
    }
    
    setIsLoading(true);

    try {
      const response = await sendChatMessage(content, autoGenerated, currentContextText || undefined);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date(),
        model: selectedModel,
        toolUsed: response.tool_type || undefined,
        toolResponse: response.tool_response ? {
          type: response.tool_type,
          content: response.tool_response,
          toolResponseId: response.tool_response_id || undefined
        } : undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Do NOT auto-open tool overlay - just show in chat
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolUse = (tool: Tool) => {
    const toolMessage = `Generate a ${tool.name.toLowerCase()} based on the current content on page ${currentPage}`;
    handleSendMessage(toolMessage, true);
    toast.info(`Generating ${tool.name.toLowerCase()}...`);
  };

  const handleOpenToolMessage = (toolResponse: { type: string; content: string | string[] | any[]; toolResponseId?: string }) => {
    setActiveOverlay(toolResponse);
  };

  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearContext = () => {
    setContextText(null);
    setInputValue('');
  };

  return (
    <div className="w-full h-full bg-slate-800/90 backdrop-blur-sm flex flex-col relative overflow-hidden">
      {/* Tool Overlay */}
      {activeOverlay && (
        <ToolOverlay
          toolType={activeOverlay.type}
          content={activeOverlay.content}
          onClose={() => setActiveOverlay(null)}
          onMinimize={() => setActiveOverlay(null)}
          onTextHighlight={handleToolTextHighlight}
        />
      )}

      {/* Compact Toolbar */}
      <div className="p-3 md:p-4 border-b border-slate-700/50 space-y-3 md:space-y-4 flex-shrink-0 bg-slate-800/90 backdrop-blur-sm">
        {/* Model Selector - No label text */}
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm bg-slate-700/50 border-slate-600 hover:border-slate-500 hover-lift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col items-start">
                  <span className="text-xs md:text-sm font-medium">{model.name}</span>
                  <span className="text-xs text-slate-400">{model.provider}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tools in 2 columns with hover colors */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {availableTools.map((tool) => (
            <Button
              key={tool.id}
              variant="outline"
              size="sm"
              onClick={() => handleToolUse(tool)}
              disabled={isLoading}
              className={`justify-start gap-1 md:gap-2 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 transition-all duration-300 hover-lift bg-slate-700/30 border-slate-600 hover:border-slate-500 ${tool.color}`}
              title={tool.description}
            >
              {tool.icon}
              {tool.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tool Response */}
      {toolResponse && (
        <div className="p-3 md:p-4 border-b border-slate-700/50 flex-shrink-0 bg-slate-800/90 backdrop-blur-sm">
          <Collapsible open={!toolResponse.isCollapsed} onOpenChange={(open) => setToolResponse({...toolResponse, isCollapsed: !open})}>
            <Card className="bg-slate-700/30 border-slate-600/50 hover-lift">
              <CardHeader className="pb-2 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2 text-white">
                    <Brain className="w-4 h-4 text-blue-400" />
                    {toolResponse.tool}
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6 hover:bg-slate-600/50">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${toolResponse.isCollapsed ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 p-3 md:p-4">
                  <div className="text-xs md:text-sm whitespace-pre-wrap text-slate-200">
                    {toolResponse.content}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <div 
            ref={chatContainerRef}
            className="p-3 md:p-4 space-y-1"
          >
            {messages.map((message) => (
              <MessageComponent
                key={message.id}
                message={message}
                selectedModelInfo={selectedModelInfo}
                onOpenToolMessage={handleOpenToolMessage}
                onLoadToolResponse={loadToolResponse}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-3 md:mb-4">
                <div className="bg-slate-700/50 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3 border border-slate-600/50">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm md:text-base text-slate-200">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input with Context and Mic Button */}
      <div className="p-3 md:p-4 border-t border-slate-700/50 flex-shrink-0 bg-slate-800/90 backdrop-blur-sm">
        {/* Context Display */}
        {contextText && (
          <div className="mb-3 md:mb-4 p-3 md:p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg md:rounded-xl border-l-4 border-l-blue-500/50 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="w-4 h-4 text-blue-400" />
                  <span className="text-xs md:text-sm text-slate-400 font-medium">Selected text:</span>
                </div>
                <p className="text-xs md:text-sm italic text-slate-200">"{contextText.text}"</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearContext}
                className="h-6 w-6 p-0 hover:bg-slate-600/50"
              >
                <X className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 md:gap-3">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={contextText ? "Ask about the selected text..." : "Ask a question..."}
            className="resize-none text-sm md:text-base bg-slate-700/50 border-slate-600 focus:border-blue-500 placeholder:text-slate-400"
            rows={2}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={toggleRecording}
              className="h-8 w-8 md:h-9 md:w-9 p-0 hover-lift"
              disabled={isLoading}
              title={isRecording ? `Recording ${formatRecordingTime(recordingTime)}` : 'Start recording'}
            >
              {isRecording ? (
                <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="h-8 w-8 md:h-9 md:w-9 p-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover-lift"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs md:text-sm text-slate-400 mt-2 md:mt-3 leading-relaxed">
          Enter to send • Shift+Enter for new line • Highlight text to access all learning tools instantly
        </p>
      </div>
    </div>
  );
});

ToolPanel.displayName = 'ToolPanel';