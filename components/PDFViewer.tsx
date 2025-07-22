import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Moon, Sun, RotateCcw, FileText, MessageCircle, X, Brain, Network, HelpCircle, Gamepad2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface PDFViewerProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  documentId: string;
  fileName: string;
  onTextHighlight?: (selectedText: string, context: string, toolType?: string) => void;
}

interface TextSelection {
  text: string;
  x: number;
  y: number;
  context: string;
}

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const availableTools: Tool[] = [
  {
    id: 'ask',
    name: 'Ask LLM',
    icon: <MessageCircle className="w-4 h-4" />,
    description: 'Ask AI about this text',
    color: 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
  },
  {
    id: 'flashcard',
    name: 'Flashcards',
    icon: <Brain className="w-4 h-4" />,
    description: 'Generate flashcards from this text',
    color: 'text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950'
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <HelpCircle className="w-4 h-4" />,
    description: 'Create quiz questions from this text',
    color: 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950'
  },
  {
    id: 'diagram',
    name: 'Diagrams',
    icon: <Network className="w-4 h-4" />,
    description: 'Generate diagrams from this text',
    color: 'text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950'
  },
  {
    id: 'game',
    name: 'Games',
    icon: <Gamepad2 className="w-4 h-4" />,
    description: 'Create learning games from this text',
    color: 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'
  }
];

export const PDFViewer: React.FC<PDFViewerProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  documentId,
  fileName,
  onTextHighlight,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  React.useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowPopup(false);
      setTextSelection(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      setShowPopup(false);
      setTextSelection(null);
      return;
    }

    // Get the range and its position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get surrounding context (previous and next sentences)
    const container = range.commonAncestorContainer;
    const textContent = container.textContent || '';
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    // Extract context around the selection
    const beforeText = textContent.substring(Math.max(0, startOffset - 100), startOffset);
    const afterText = textContent.substring(endOffset, Math.min(textContent.length, endOffset + 100));
    const context = `${beforeText}${selectedText}${afterText}`.trim();

    setTextSelection({
      text: selectedText,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      context: context
    });
    setShowPopup(true);
  }, []);

  // Listen for text selection
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopup(false);
        setTextSelection(null);
        setHoveredTool(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTextSelection]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
        setTextSelection(null);
        setHoveredTool(null);
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopup]);

  const handleToolSelect = (toolId: string) => {
    if (textSelection && onTextHighlight) {
      // For "ask" tool, use the original behavior, for others pass the tool type
      const toolType = toolId === 'ask' ? undefined : toolId;
      onTextHighlight(textSelection.text, textSelection.context, toolType);
      setShowPopup(false);
      setTextSelection(null);
      setHoveredTool(null);
      window.getSelection()?.removeAllRanges();
      
      // Show appropriate toast message
      const tool = availableTools.find(t => t.id === toolId);
      if (tool) {
        toast.success(`Selected text sent to ${tool.name}!`);
      }
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setTextSelection(null);
    setHoveredTool(null);
    window.getSelection()?.removeAllRanges();
  };

  // Generate dynamic content based on current page
  const generatePageContent = () => {
    const chapterNum = Math.ceil(currentPage / 20);
    const sectionNum = Math.ceil((currentPage % 20) / 5) || 1;
    
    const topics = [
      "Algorithm Analysis and Complexity",
      "Data Structures and Abstract Data Types", 
      "Sorting and Searching Algorithms",
      "Graph Algorithms and Network Flow",
      "Dynamic Programming Techniques",
      "Greedy Algorithms and Optimization",
      "Divide and Conquer Strategies",
      "Advanced Tree Structures"
    ];
    
    const currentTopic = topics[(currentPage - 1) % topics.length];
    
    const concepts = [
      ["Big O Notation", "Time Complexity", "Space Complexity", "Asymptotic Analysis"],
      ["Arrays", "Linked Lists", "Stacks", "Queues", "Hash Tables"],
      ["Quick Sort", "Merge Sort", "Binary Search", "Heap Sort"],
      ["BFS", "DFS", "Dijkstra's Algorithm", "Minimum Spanning Trees"],
      ["Optimal Substructure", "Memoization", "Tabulation", "State Transitions"],
      ["Greedy Choice Property", "Activity Selection", "Huffman Coding", "Fractional Knapsack"],
      ["Recurrence Relations", "Master Theorem", "Binary Search Trees", "FFT"],
      ["AVL Trees", "Red-Black Trees", "B-Trees", "Segment Trees"]
    ];
    
    const currentConcepts = concepts[(currentPage - 1) % concepts.length];
    
    return {
      chapter: chapterNum,
      section: sectionNum,
      topic: currentTopic,
      concepts: currentConcepts
    };
  };

  const pageContent = generatePageContent();

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm overflow-hidden relative">
      {/* Enhanced Text Selection Popup with All Tools */}
      {showPopup && textSelection && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg md:rounded-xl shadow-2xl animate-in fade-in zoom-in-95"
          style={{
            left: `${Math.max(10, Math.min(window.innerWidth - 280, textSelection.x - 140))}px`,
            top: `${Math.max(10, textSelection.y)}px`,
          }}
        >
          <div className="p-3 md:p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-slate-400 mb-1">Selected text:</p>
                <p className="text-xs md:text-sm font-medium text-white truncate max-w-48" title={textSelection.text}>
                  "{textSelection.text}"
                </p>
              </div>
              <Button
                onClick={handleClosePopup}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2 flex-shrink-0 hover:bg-slate-700/50"
              >
                <X className="w-3 h-3 text-slate-400" />
              </Button>
            </div>

            {/* Tools Grid */}
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-slate-400">Choose an action:</p>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {availableTools.map((tool) => (
                  <div key={tool.id} className="relative">
                    <Button
                      onClick={() => handleToolSelect(tool.id)}
                      variant={tool.id === 'ask' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-10 w-10 md:h-12 md:w-12 p-0 relative transition-all duration-300 hover-lift ${tool.color} ${
                        tool.id === 'ask' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                      onMouseEnter={() => setHoveredTool(tool.id)}
                      onMouseLeave={() => setHoveredTool(null)}
                    >
                      {tool.icon}
                    </Button>
                    
                    {/* Tooltip */}
                    {hoveredTool === tool.id && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 md:px-3 py-1 md:py-2 bg-slate-800/95 backdrop-blur-sm text-white text-xs md:text-sm rounded-lg shadow-2xl border border-slate-700/50 whitespace-nowrap z-10 animate-in fade-in zoom-in-95">
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-slate-400 text-xs">{tool.description}</div>
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-700"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick hint */}
            <div className="mt-3 md:mt-4 pt-2 border-t border-slate-700/50">
              <p className="text-xs md:text-sm text-slate-400 text-center">
                {hoveredTool ? availableTools.find(t => t.id === hoveredTool)?.description : 'Hover over tools for details'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Toolbar with Centered Navigation */}
      <div className="border-b border-slate-700/50 p-2 md:p-3 flex items-center justify-between bg-slate-800/90 backdrop-blur-sm flex-shrink-0">
        {/* Left: Zoom Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-7">
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-xs md:text-sm text-slate-400 min-w-[2.5rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-7">
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleResetZoom} className="h-7">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="h-7 hover-lift"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 md:gap-2">
            <Input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-12 md:w-14 text-center h-7 text-xs md:text-sm bg-slate-700/50 border-slate-600"
              size={3}
            />
            <span className="text-slate-400 text-xs md:text-sm">of {totalPages}</span>
          </form>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="h-7 hover-lift"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: Dark Mode Toggle */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-7 hover-lift"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Content Area with Custom Scrollbar */}
      <div 
        className={`flex-1 overflow-auto transition-all duration-500 custom-scrollbar ${
          isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100/80'
        }`}
      >        
        <div className="h-full flex justify-center p-3 md:p-6">
          <div 
            ref={contentRef}
            className={`w-full max-w-4xl transition-all duration-500 hover-lift ${
              isDarkMode ? 'bg-slate-800/90 text-slate-100 border border-slate-700/50' : 'bg-white/90 text-slate-900 border border-slate-300/50'
            } rounded-lg md:rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden select-text`}
            style={{ 
              fontSize: `${zoom}em`,
              lineHeight: 1.6
            }}
          >
            <div className="p-4 md:p-6 lg:p-8 h-full overflow-auto">
              {/* PDF Header - Compact */}
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-slate-700/30">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl lg:text-2xl font-semibold mb-1 truncate text-white">{fileName}</h1>
                  <p className="text-xs md:text-sm text-slate-400">Page {currentPage} of {totalPages}</p>
                </div>
              </div>

              {/* Dynamic Content - Tighter spacing with selectable text */}
              <div className="space-y-4 md:space-y-6 user-select-text">
                <div className="border-b border-slate-700/30 pb-3 md:pb-4">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 md:mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Chapter {pageContent.chapter}: {pageContent.topic}
                  </h1>
                  <p className="text-slate-400 text-sm md:text-base">Section {pageContent.section} - Introduction and Fundamentals</p>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">Overview</h2>
                  <p className="leading-relaxed text-sm md:text-base text-slate-200">
                    This section introduces the fundamental concepts of {pageContent.topic.toLowerCase()}. 
                    Understanding these principles is essential for developing efficient algorithms and 
                    solving complex computational problems in computer science. Algorithm analysis provides 
                    the mathematical foundation for understanding how programs behave under different conditions.
                  </p>
                  
                  <p className="leading-relaxed text-sm md:text-base text-slate-200">
                    The concepts covered in this chapter build upon previous knowledge and provide 
                    the foundation for more advanced topics. Students should focus on understanding 
                    both the theoretical aspects and practical applications. Performance analysis is crucial 
                    for writing efficient code that scales well with larger input sizes.
                  </p>
                  
                  <h3 className="text-base md:text-lg lg:text-xl font-semibold mt-4 md:mt-6 text-white">Key Concepts</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 list-disc pl-4 md:pl-6">
                    {pageContent.concepts.map((concept, index) => (
                      <li key={index} className="leading-relaxed text-sm md:text-base text-slate-200">{concept}</li>
                    ))}
                  </ul>
                  
                  <div className={`mt-4 md:mt-6 p-3 md:p-4 rounded-lg md:rounded-xl border ${
                    isDarkMode ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <h4 className="flex items-center gap-2 mb-2 text-sm md:text-base font-medium text-white">
                      <span className="text-blue-400 text-lg">💡</span>
                      Study Tip
                    </h4>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                      Practice implementing these concepts in your preferred programming language. 
                      Use the study tools on the right to create flashcards and quizzes for better retention. 
                      Work through the exercises at the end of each section to reinforce your understanding.
                      <strong className="text-blue-400"> Try highlighting any text in this document to access all learning tools instantly!</strong>
                    </p>
                  </div>

                  {/* Detailed Algorithm Analysis Section */}
                  <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white">Algorithm Analysis in Detail</h3>
                    <p className="text-sm md:text-base leading-relaxed text-slate-200">
                      Algorithm analysis is the theoretical study of computer program performance and resource usage. 
                      It involves mathematical techniques to describe the running time of an algorithm as a function 
                      of its input size. This analysis helps us predict how the algorithm will perform on large datasets 
                      and compare different algorithmic approaches.
                    </p>
                    
                    <p className="text-sm md:text-base leading-relaxed text-slate-200">
                      The most common complexity measures are time complexity and space complexity. Time complexity 
                      describes how the running time increases with input size, while space complexity describes 
                      how memory usage grows. Both are typically expressed using Big O notation, which provides 
                      an upper bound on the growth rate.
                    </p>

                    <h4 className="text-sm md:text-base lg:text-lg font-medium mt-4 md:mt-6 text-white">Common Time Complexities</h4>
                    <div className="space-y-2 md:space-y-3 text-sm md:text-base">
                      <p className="text-slate-200"><strong className="text-green-400">O(1) - Constant Time:</strong> Operations that take the same amount of time regardless of input size, such as array indexing or hash table lookups.</p>
                      <p className="text-slate-200"><strong className="text-blue-400">O(log n) - Logarithmic Time:</strong> Algorithms that divide the problem in half at each step, like binary search or balanced tree operations.</p>
                      <p className="text-slate-200"><strong className="text-yellow-400">O(n) - Linear Time:</strong> Algorithms that examine each element once, such as linear search or finding the maximum element in an unsorted array.</p>
                      <p className="text-slate-200"><strong className="text-orange-400">O(n log n) - Linearithmic Time:</strong> Efficient sorting algorithms like merge sort and heap sort fall into this category.</p>
                      <p className="text-slate-200"><strong className="text-red-400">O(n²) - Quadratic Time:</strong> Algorithms with nested loops over the input, such as bubble sort or simple matrix multiplication.</p>
                    </div>
                  </div>

                  {/* Example/Algorithm Box - Compact */}
                  <div className={`mt-4 md:mt-6 p-3 md:p-4 rounded-lg md:rounded-xl font-mono text-xs md:text-sm border ${
                    isDarkMode ? 'bg-slate-700/50 border-slate-600/50 backdrop-blur-sm' : 'bg-gray-50 border-gray-300'
                  }`}>
                    <h4 className="mb-2 md:mb-3 font-sans text-sm md:text-base font-medium text-white">Algorithm Example: Binary Search</h4>
                    <pre className="whitespace-pre-wrap overflow-auto">
{`function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid; // Found target at index mid
    } else if (arr[mid] < target) {
      left = mid + 1; // Search right half
    } else {
      right = mid - 1; // Search left half
    }
  }
  
  return -1; // Target not found
}

// Time Complexity: O(log n)
// Space Complexity: O(1)`}
                    </pre>
                  </div>

                  {/* Exercises Section - Compact */}
                  <div className="mt-6 md:mt-8">
                    <h3 className="text-base md:text-lg lg:text-xl font-semibold mb-3 md:mb-4 text-white">Practice Exercises</h3>
                    <div className="space-y-2 md:space-y-3">
                      <div className={`p-3 md:p-4 rounded-lg md:rounded-xl text-sm md:text-base border hover-lift transition-all duration-300 ${
                        isDarkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className="text-slate-200"><strong className="text-blue-400">Exercise {currentPage}.1:</strong> Implement the basic binary search algorithm and analyze its time complexity step by step. Explain why it's O(log n).</p>
                      </div>
                      <div className={`p-3 md:p-4 rounded-lg md:rounded-xl text-sm md:text-base border hover-lift transition-all duration-300 ${
                        isDarkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className="text-slate-200"><strong className="text-green-400">Exercise {currentPage}.2:</strong> Compare linear search vs binary search performance. When would you use each approach?</p>
                      </div>
                      <div className={`p-3 md:p-4 rounded-lg md:rounded-xl text-sm md:text-base border hover-lift transition-all duration-300 ${
                        isDarkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className="text-slate-200"><strong className="text-purple-400">Exercise {currentPage}.3:</strong> Apply the concept to solve a real-world problem: design an efficient algorithm to find a specific record in a large sorted database.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Compact */}
              <div className="mt-8 md:mt-12 pt-4 md:pt-6 border-t border-slate-700/30 text-center text-xs md:text-sm text-slate-400">
                <p className="flex items-center justify-center gap-2 flex-wrap">
                  <span>Introduction to Algorithms</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Page {currentPage}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-blue-400">Highlight text to access all learning tools</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};