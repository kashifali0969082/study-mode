import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TableOfContents } from './components/TableOfContents';
import { PDFViewer } from './components/PDFViewer';
import { ToolPanel } from './components/ToolPanel';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { ArrowLeft, BookOpen, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// Types based on API response
interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  created_at: string;
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

interface LastPosition {
  page_number: number;
  chapter_id: string | null;
  section_id: string | null;
  updated_at: string;
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

interface StudyModeData {
  document: Document;
  chat_session_id: string;
  toc?: TOC; // Make TOC optional
  last_position: LastPosition;
}

export default function App() {
  const [studyData, setStudyData] = useState<StudyModeData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isTOCCollapsed, setIsTOCCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPDFHidden, setIsPDFHidden] = useState(false);
  const [highlightedText, setHighlightedText] = useState<{ text: string; context: string; toolType?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolPanelRef = useRef<{ 
    handleHighlightedText: (text: string, context: string, toolType?: string) => void;
    handleDirectToolGeneration: (text: string, context: string, toolType: string) => void;
  }>(null);

  // Apply dark theme by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Calculate total pages from TOC or default
  const totalPages = studyData?.toc ? 
    Math.max(...studyData.toc.chapters.flatMap(chapter => 
      chapter.sections ? chapter.sections.map(section => section.page) : [1]
    )) : 100; // Default fallback

  // Check if TOC is available
  const hasTOC = studyData?.toc?.chapters && studyData.toc.chapters.length > 0;
  
  // Fixed TOC width in pixels (0 when no TOC or when PDF is hidden)
  const tocWidth = !hasTOC || isPDFHidden ? 0 : (isTOCCollapsed ? 48 : 240);
  
  // Load chat history
  const loadChatHistory = async (chatSessionId: string) => {
    try {
      // Mock API response based on provided structure
      const mockChatHistory: ChatHistory = {
        chat_session_id: chatSessionId,
        messages: [
          {
            id: "790689bb-dc15-47df-a292-a123d57fded5",
            chat_session_id: chatSessionId,
            role: "user",
            content: "what is a block in dds ? can you explain",
            model_id: null,
            tool_response_id: null,
            tool_type: null,
            created_at: "2025-07-18T00:18:56.144657+00:00"
          },
          {
            id: "48743bba-6944-4c83-ac61-4f551f156fb5",
            chat_session_id: chatSessionId,
            role: "assistant",
            content: "In the context of Distributed Data Storage (DDS) and blockchain, a block is a fundamental unit of data that contains a set of transactions or records. Think of it as a digital container that holds a collection of information, similar to a page in a ledger book.\n\nEach block has a unique identifier, called a \"block hash,\" which helps to",
            model_id: "d50a33ce-2462-4a5a-9aa7-efc2d1749745",
            tool_response_id: "f97c7715-91c0-452d-b3d9-49575a819751",
            tool_type: "diagram",
            created_at: "2025-07-18T00:18:57.169477+00:00"
          },
          {
            id: "50f05769-4485-4d7e-b63b-0c4ca1fea93c",
            chat_session_id: chatSessionId,
            role: "user",
            content: "can you give me the exact text that was given to you as the page content please",
            model_id: null,
            tool_response_id: null,
            tool_type: null,
            created_at: "2025-07-18T00:24:33.859215+00:00"
          },
          {
            id: "dfe42e62-3883-4880-9a22-998367643638",
            chat_session_id: chatSessionId,
            role: "assistant",
            content: "The exact text that was given to me as the page content is:\n\n```\nHOW BLOCKCHAIN WORKS?\n```",
            model_id: "d50a33ce-2462-4a5a-9aa7-efc2d1749745",
            tool_response_id: null,
            tool_type: null,
            created_at: "2025-07-18T00:24:34.545374+00:00"
          }
        ]
      };
      
      setChatHistory(mockChatHistory);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };
  
  // Initialize study mode data
  useEffect(() => {
    const initializeStudyMode = async () => {
      try {
        setIsLoading(true);
        // Mock API response - sometimes without TOC
        const mockData: StudyModeData = {
          document: {
            id: "a4b8b023-5d0f-47fd-9c11-de9c38808600",
            user_id: "db391bfe-d580-4855-b4be-19ec6d45e7cc",
            title: "Introduction to Algorithms",
            file_name: "Introduction_to_algorithms-6-12.pdf",
            created_at: "2025-07-10T23:06:34.028593"
          },
          chat_session_id: "8bb10527-c62d-43e1-bd81-c3a44b590262",
          // Conditionally include TOC
          toc: {
            book_id: "a4b8b023-5d0f-47fd-9c11-de9c38808600",
            chapters: [
              {
                chapter_id: "10273a10-b1ea-4514-b6c7-d1bf2d20a856",
                chapter_number: "1",
                title: "Chapter 1: Foundations",
                sections: [
                  {
                    section_id: "06671124-438a-424b-84cc-43ef360501b0",
                    title: "1.1 Algorithms",
                    page: 5
                  },
                  {
                    section_id: "b8e19ca7-0dab-49cc-832a-91a099c32031",
                    title: "1.2 Algorithms as a technology",
                    page: 11
                  },
                  {
                    section_id: "6a0fe27b-a200-4777-becb-5ec0c62b6cee",
                    title: "2 Getting Started",
                    page: 16
                  }
                ]
              },
              {
                chapter_id: "0ada99be-dfc6-4efa-acca-c91d67458e4e",
                chapter_number: "2",
                title: "Chapter 2: Sorting and Order Statistics",
                sections: [
                  {
                    section_id: "d945fa7c-2d8d-4302-811c-05a7ab9646dc",
                    title: "6 Heapsort",
                    page: 151
                  },
                  {
                    section_id: "abcdfe9d-b9cd-4820-ae8d-5ba3a9c16cb6",
                    title: "6.1 Heaps",
                    page: 151
                  }
                ]
              }
            ]
          },
          last_position: {
            page_number: 12,
            chapter_id: null,
            section_id: null,
            updated_at: "2025-07-18T01:56:41.864035+00:00"
          }
        };

        setStudyData(mockData);
        setCurrentPage(mockData.last_position.page_number);
        
        // Load chat history
        await loadChatHistory(mockData.chat_session_id);
      } catch (error) {
        console.error('Failed to initialize study mode:', error);
        toast.error('Failed to load study materials');
      } finally {
        setIsLoading(false);
      }
    };

    initializeStudyMode();
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsTOCCollapsed(true);
        setRightPanelWidth(280);
      } else {
        // Adjust panel width based on PDF visibility
        if (isPDFHidden) {
          setRightPanelWidth(Math.min(800, window.innerWidth - 100)); // Take most of the screen when PDF is hidden
        } else {
          setRightPanelWidth(hasTOC ? (isTOCCollapsed ? 380 : 320) : 400);
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isTOCCollapsed, hasTOC, isPDFHidden]);

  // Panel resizing logic with proper constraints
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current || isMobile) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    const newRightPanelWidth = containerWidth - mouseX - 4;
    const minWidth = 280;
    const maxWidth = isPDFHidden ? containerWidth - 100 : containerWidth * 0.6;
    
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newRightPanelWidth));
    setRightPanelWidth(clampedWidth);
  }, [isResizing, isMobile, isPDFHidden]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const updatePosition = async (page: number, sectionId?: string, chapterId?: string) => {
    if (!studyData) return;
    try {
      console.log('Position updated:', { page, sectionId, chapterId });
    } catch (error) {
      console.error('Failed to update position:', error);
    }
  };

  const handlePageChange = (page: number, sectionId?: string, chapterId?: string) => {
    setCurrentPage(page);
    updatePosition(page, sectionId, chapterId);
    toast.success(`Navigated to page ${page}`);
  };

  const handleTOCToggle = () => {
    setIsTOCCollapsed(!isTOCCollapsed);
  };

  const handleGoHome = () => {
    toast.info('Returning to AdaptiveLearnAI dashboard...');
  };

  const handleTogglePDF = () => {
    setIsPDFHidden(!isPDFHidden);
    toast.info(isPDFHidden ? 'Document shown' : 'Document hidden for focused studying');
  };

  // Handle text highlighting from PDF or Tool Overlays
  const handleTextHighlight = useCallback((selectedText: string, context: string, toolType?: string) => {
    setHighlightedText({ text: selectedText, context, toolType });
    
    // Send to ToolPanel for processing
    if (toolPanelRef.current) {
      if (toolType && toolType !== 'ask') {
        // Direct tool generation for specific tools
        toolPanelRef.current.handleDirectToolGeneration(selectedText, context, toolType);
      } else {
        // Regular chat for "ask" tool or default behavior
        toolPanelRef.current.handleHighlightedText(selectedText, context, toolType);
      }
    }
  }, []);

  if (isLoading || !studyData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with Hide Book Button */}
      <header className="border-b bg-card px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button 
              variant="ghost" 
              onClick={handleGoHome}
              className="gap-2 px-2 hover:bg-accent h-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-semibold text-primary">AdaptiveLearnAI</span>
            </Button>
            
            <div className="h-5 w-px bg-border" />
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base truncate">{studyData.document.title}</h1>
              <p className="text-xs text-muted-foreground">
                {!isPDFHidden && `Page ${currentPage} of ${totalPages} • ${Math.round((currentPage / totalPages) * 100)}% complete`}
                {isPDFHidden && 'Study Mode - Document Hidden'}
              </p>
            </div>
          </div>
          
          {/* Hide/Show Document Button */}
          <Button 
            variant="outline" 
            onClick={handleTogglePDF}
            className="gap-2 h-8"
            title={isPDFHidden ? 'Show document' : 'Hide document for focused studying'}
          >
            {isPDFHidden ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Show Book</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span className="text-sm">Hide Book</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex overflow-hidden relative"
        style={{ height: 'calc(100vh - 57px)' }}
      >
        {isMobile ? (
          <div className="flex flex-col w-full h-full">
            {hasTOC && !isPDFHidden && (
              <div className="flex-shrink-0">
                <TableOfContents
                  isCollapsed={isTOCCollapsed}
                  onToggleCollapse={handleTOCToggle}
                  currentPage={currentPage}
                  onPageSelect={handlePageChange}
                  tocData={studyData.toc!}
                />
              </div>
            )}
            
            {!isPDFHidden && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <PDFViewer
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  documentId={studyData.document.id}
                  fileName={studyData.document.file_name}
                  onTextHighlight={handleTextHighlight}
                />
              </div>
            )}
            
            <div className={`border-t ${isPDFHidden ? 'flex-1' : 'max-h-96'} flex-shrink-0 overflow-hidden`}>
              <ToolPanel 
                ref={toolPanelRef}
                chatSessionId={studyData.chat_session_id}
                documentId={studyData.document.id}
                currentPage={currentPage}
                tocData={studyData.toc}
                initialChatHistory={chatHistory}
                onTextHighlight={handleTextHighlight}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Left Sidebar - Table of Contents (only if available and PDF not hidden) */}
            {hasTOC && !isPDFHidden && (
              <div 
                className="flex-shrink-0 border-r bg-card overflow-hidden"
                style={{ width: `${tocWidth}px` }}
              >
                <TableOfContents
                  isCollapsed={isTOCCollapsed}
                  onToggleCollapse={handleTOCToggle}
                  currentPage={currentPage}
                  onPageSelect={handlePageChange}
                  tocData={studyData.toc!}
                />
              </div>
            )}

            {/* Center - PDF Viewer (conditionally rendered) */}
            {!isPDFHidden && (
              <div 
                className="flex-1 min-w-0 overflow-hidden"
                style={{ 
                  width: `calc(100% - ${tocWidth}px - ${rightPanelWidth}px - 4px)`
                }}
              >
                <PDFViewer
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  documentId={studyData.document.id}
                  fileName={studyData.document.file_name}
                  onTextHighlight={handleTextHighlight}
                />
              </div>
            )}

            {/* Resize Handle (only when PDF is visible) */}
            {!isPDFHidden && (
              <div
                className={`w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors flex-shrink-0 relative ${
                  isResizing ? 'bg-primary/30' : ''
                }`}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-current opacity-50" />
              </div>
            )}

            {/* Right Sidebar - Tool Panel */}
            <div 
              className="flex-shrink-0 border-l bg-card overflow-hidden"
              style={{ 
                width: isPDFHidden ? '100%' : `${rightPanelWidth}px`,
                borderLeft: isPDFHidden ? 'none' : undefined
              }}
            >
              <ToolPanel 
                ref={toolPanelRef}
                chatSessionId={studyData.chat_session_id}
                documentId={studyData.document.id}
                currentPage={currentPage}
                tocData={studyData.toc}
                initialChatHistory={chatHistory}
                onTextHighlight={handleTextHighlight}
              />
            </div>
          </>
        )}
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 3000 }}
      />
    </div>
  );
}