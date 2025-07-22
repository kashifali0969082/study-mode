import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Minimize2, ChevronLeft, ChevronRight, RotateCcw, Check, Zap, Network, Copy, Download, Gamepad2, Trophy, Target, Clock, Star, HelpCircle, AlertCircle, BookOpen, Lightbulb, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

interface ToolOverlayProps {
  toolType: string;
  content: string | string[] | any[];
  onClose: () => void;
  onMinimize: () => void;
  onTextHighlight?: (selectedText: string, context: string) => void;
}

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  difficulty: number;
  topic: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: number;
  topic: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
}

interface QuestionState {
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean;
  showExplanation: boolean;
}

interface GameItem {
  id: string;
  concept: string;
  definition: string;
  matched?: boolean;
}

interface TextSelection {
  text: string;
  x: number;
  y: number;
  context: string;
}

// Text Selection Hook for Tool Content
const useTextSelection = (onTextHighlight?: (selectedText: string, context: string) => void) => {
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

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
    
    // Get surrounding context
    const container = range.commonAncestorContainer;
    const textContent = container.textContent || '';
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    
    const beforeText = textContent.substring(Math.max(0, startOffset - 50), startOffset);
    const afterText = textContent.substring(endOffset, Math.min(textContent.length, endOffset + 50));
    const context = `${beforeText}${selectedText}${afterText}`.trim();

    setTextSelection({
      text: selectedText,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      context: context
    });
    setShowPopup(true);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopup(false);
        setTextSelection(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
        setTextSelection(null);
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopup]);

  const handleAskLLM = () => {
    if (textSelection && onTextHighlight) {
      onTextHighlight(textSelection.text, textSelection.context);
      setShowPopup(false);
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
      toast.success('Selected text sent to chat!');
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const TextSelectionPopup = () => (
    showPopup && textSelection ? (
      <div
        ref={popupRef}
        className="fixed z-50 bg-card border rounded-lg shadow-lg animate-in fade-in zoom-in-95"
        style={{
          left: `${Math.max(10, Math.min(window.innerWidth - 200, textSelection.x - 100))}px`,
          top: `${Math.max(10, textSelection.y)}px`,
        }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-xs font-medium truncate max-w-32" title={textSelection.text}>
                "{textSelection.text}"
              </p>
            </div>
            <Button
              onClick={handleClosePopup}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-2 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <Button
            onClick={handleAskLLM}
            size="sm"
            className="w-full gap-2"
          >
            <MessageCircle className="w-3 h-3" />
            Ask LLM
          </Button>
        </div>
      </div>
    ) : null
  );

  return { TextSelectionPopup, showPopup };
};

// Mermaid component (simplified for this implementation)
const MermaidDiagram: React.FC<{ code: string; title?: string }> = ({ code, title }) => {
  const [isRendered, setIsRendered] = useState(false);
  
  useEffect(() => {
    // Simulate mermaid rendering
    const timer = setTimeout(() => {
      setIsRendered(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Diagram code copied!');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleDownload = () => {
    toast.info('Download functionality would be implemented here');
  };

  return (
    <Card className="mb-3">
      {title && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-6 px-2">
                <Copy className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-2">
        {!isRendered ? (
          <div className="flex items-center justify-center h-32 bg-muted rounded">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground">Rendering diagram...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded border p-3 min-h-32 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Network className="w-8 h-8 text-blue-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-xs font-medium">Mermaid Diagram</p>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono max-w-full overflow-auto">
                  {code.length > 100 ? code.substring(0, 100) + '...' : code}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Interactive diagram would render here
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Game Component
const GameOverlay: React.FC<{ content: string | string[] | any[]; onClose: () => void; onMinimize: () => void }> = ({
  content,
  onClose,
  onMinimize,
}) => {
  const [currentGame, setCurrentGame] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'completed'>('playing');
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameData, setGameData] = useState<GameItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const games = useMemo(() => {
    try {
      const contentStr = Array.isArray(content) ? content.join('\n\n') : content;
      const sections = contentStr.split('\n\n').filter(section => section.trim().length > 0);
      return sections;
    } catch (error) {
      console.error('Error parsing game content:', error);
      return [];
    }
  }, [content]);

  // Parse game data from content
  useEffect(() => {
    if (games.length > 0) {
      const currentGameContent = games[currentGame];
      
      // Extract concept-definition pairs
      const items: GameItem[] = [];
      const lines = currentGameContent.split('\n').filter(line => line.includes('→'));
      
      lines.forEach((line, index) => {
        const [concept, definition] = line.split('→').map(s => s.trim());
        if (concept && definition) {
          items.push({
            id: `item-${index}`,
            concept: concept.replace(/^\d+\.\s*/, ''),
            definition,
            matched: false
          });
        }
      });
      
      // If no items found, create sample data
      if (items.length === 0) {
        items.push(
          { id: 'item-1', concept: 'Big O', definition: 'Time complexity upper bound', matched: false },
          { id: 'item-2', concept: 'DFS', definition: 'Depth-first search', matched: false },
          { id: 'item-3', concept: 'BFS', definition: 'Breadth-first search', matched: false },
          { id: 'item-4', concept: 'Heap', definition: 'Complete binary tree', matched: false }
        );
      }
      
      setGameData(items);
    }
  }, [games, currentGame]);

  // Timer effect
  useEffect(() => {
    let interval: number;
    if (gameState === 'playing') {
      interval = window.setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState]);

  const handleItemClick = (itemId: string) => {
    if (gameState !== 'playing') return;

    const newSelected = selectedItems.includes(itemId) 
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];

    setSelectedItems(newSelected);

    // Check for matches when 2 items are selected
    if (newSelected.length === 2) {
      const [first, second] = newSelected.map(id => gameData.find(item => item.id === id)!);
      
      // Simple matching logic - in real implementation this would be more sophisticated
      const isMatch = (
        (first.concept && second.definition) || 
        (first.definition && second.concept)
      );

      setTimeout(() => {
        if (isMatch) {
          setGameData(prev => prev.map(item => 
            newSelected.includes(item.id) ? { ...item, matched: true } : item
          ));
          setScore(prev => prev + 10);
          toast.success('Match found! +10 points');
        } else {
          toast.error('Not a match, try again!');
        }
        setSelectedItems([]);

        // Check if game is completed
        const updatedData = gameData.map(item => 
          newSelected.includes(item.id) && isMatch ? { ...item, matched: true } : item
        );
        
        if (updatedData.every(item => item.matched)) {
          setGameState('completed');
          toast.success('🎉 Game completed!');
        }
      }, 1000);
    }
  };

  const resetGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeElapsed(0);
    setSelectedItems([]);
    setGameData(prev => prev.map(item => ({ ...item, matched: false })));
  };

  const nextGame = () => {
    if (currentGame < games.length - 1) {
      setCurrentGame(prev => prev + 1);
      resetGame();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (games.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-medium">Learning Games</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground text-sm">No games could be generated from the provided content.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 tool-bg-game rounded-lg p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-medium">Learning Games</h3>
          {games.length > 1 && (
            <Badge variant="secondary" className="text-xs">{currentGame + 1} of {games.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-sm font-medium">{score}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium">{formatTime(timeElapsed)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Matches</p>
              <p className="text-sm font-medium">{gameData.filter(item => item.matched).length}/{gameData.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Progress value={(gameData.filter(item => item.matched).length / gameData.length) * 100} className="h-1" />

      {/* Game Area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Memory Match - Connect concepts with definitions</CardTitle>
        </CardHeader>
        <CardContent>
          {gameState === 'completed' ? (
            <div className="text-center space-y-3">
              <div className="text-2xl">🎉</div>
              <div>
                <h3 className="font-medium">Game Completed!</h3>
                <p className="text-sm text-muted-foreground">
                  Score: {score} • Time: {formatTime(timeElapsed)}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={resetGame} size="sm">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Play Again
                </Button>
                {games.length > 1 && currentGame < games.length - 1 && (
                  <Button onClick={nextGame} size="sm" variant="outline">
                    Next Game
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Concepts Column */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Concepts</h4>
                {gameData.map((item) => (
                  <Button
                    key={`concept-${item.id}`}
                    variant={
                      item.matched ? "default" : 
                      selectedItems.includes(item.id) ? "secondary" : "outline"
                    }
                    size="sm"
                    onClick={() => handleItemClick(item.id)}
                    disabled={item.matched}
                    className={`w-full text-xs h-auto p-2 ${
                      item.matched ? 'opacity-50' : ''
                    }`}
                  >
                    {item.concept}
                  </Button>
                ))}
              </div>

              {/* Definitions Column */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Definitions</h4>
                {gameData.map((item) => (
                  <Button
                    key={`definition-${item.id}`}
                    variant={
                      item.matched ? "default" : 
                      selectedItems.includes(item.id) ? "secondary" : "outline"
                    }
                    size="sm"
                    onClick={() => handleItemClick(item.id)}
                    disabled={item.matched}
                    className={`w-full text-xs h-auto p-2 ${
                      item.matched ? 'opacity-50' : ''
                    }`}
                  >
                    {item.definition}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Controls */}
      {gameState === 'playing' && (
        <div className="flex gap-2">
          <Button onClick={resetGame} variant="outline" size="sm" className="flex-1">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          {games.length > 1 && (
            <div className="flex gap-1">
              <Button 
                onClick={() => setCurrentGame(Math.max(0, currentGame - 1))}
                disabled={currentGame === 0}
                variant="outline" 
                size="sm"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button 
                onClick={() => setCurrentGame(Math.min(games.length - 1, currentGame + 1))}
                disabled={currentGame === games.length - 1}
                variant="outline" 
                size="sm"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Updated Flashcard Component with flip animation and text selection
const FlashcardOverlay: React.FC<{ content: string | string[] | any[]; onClose: () => void; onMinimize: () => void; onTextHighlight?: (selectedText: string, context: string) => void }> = ({
  content,
  onClose,
  onMinimize,
  onTextHighlight
}) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { TextSelectionPopup } = useTextSelection(onTextHighlight);
  
  const cards = useMemo(() => {
    try {
      // Handle new API format - array of objects
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
        const flashcardObjects = content as FlashCard[];
        return flashcardObjects.map(card => ({
          front: card.question,
          back: card.answer,
          difficulty: card.difficulty,
          topic: card.topic,
          id: card.id
        }));
      }
      
      // Legacy format fallback
      const contentStr = Array.isArray(content) ? content[0] : content;
      const sections = contentStr.split('\n\n').filter(section => section.includes('**Front:**'));
      const parsedCards: (FlashCard & { front: string; back: string })[] = [];
      
      for (const section of sections) {
        const frontMatch = section.match(/\*\*Front:\*\* (.*?)(?=\n\*\*Back:\*\*|$)/s);
        const backMatch = section.match(/\*\*Back:\*\* (.*?)$/s);
        
        if (frontMatch && backMatch) {
          const front = frontMatch[1]?.trim();
          const back = backMatch[1]?.trim();
          
          if (front && back) {
            parsedCards.push({ 
              front, 
              back, 
              difficulty: 1, 
              topic: 'General', 
              id: `legacy-${parsedCards.length + 1}`,
              question: front,
              answer: back
            });
          }
        }
      }
      
      return parsedCards;
    } catch (error) {
      console.error('Error parsing flashcard content:', error);
      return [];
    }
  }, [content]);

  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentCard((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleCopyCard = async () => {
    if (cards.length === 0) return;
    const currentCardData = cards[currentCard];
    const cardText = `Q: ${currentCardData.front}\nA: ${currentCardData.back}`;
    
    try {
      await navigator.clipboard.writeText(cardText);
      toast.success('Flashcard copied!');
    } catch (error) {
      toast.error('Failed to copy flashcard');
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'text-green-500';
      case 2: return 'text-yellow-500';
      case 3: return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-2 h-2 ${i < difficulty ? 'fill-current' : ''} ${getDifficultyColor(difficulty)}`} 
      />
    ));
  };

  if (cards.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium">Flashcards</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground text-sm">No flashcards could be generated from the provided content.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCardData = cards[currentCard];

  return (
    <div className="space-y-3 tool-bg-flashcard rounded-lg p-1 relative">
      <TextSelectionPopup />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium">Flashcards</h3>
          <Badge variant="secondary" className="text-xs">{currentCard + 1} of {cards.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopyCard} className="h-6 w-6 p-0">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <Progress value={(currentCard + 1) / cards.length * 100} className="h-1" />

      {/* Card metadata */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentCardData.topic}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Difficulty:</span>
          <div className="flex items-center gap-0.5">
            {getDifficultyStars(currentCardData.difficulty)}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-full flashcard-container">
          <div 
            className={`flashcard h-48 cursor-pointer ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
          >
            {/* Front Face */}
            <div className="flashcard-face flashcard-front">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Question
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-24 relative px-3 tool-content">
                <p className="text-center text-sm px-2 overflow-auto max-h-full select-text">
                  {currentCardData.front}
                </p>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <p className="text-xs text-muted-foreground">
                    Click to reveal answer
                  </p>
                </div>
              </CardContent>
            </div>

            {/* Back Face */}
            <div className="flashcard-face flashcard-back">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xs text-muted-foreground">
                  Answer
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-24 relative px-3 tool-content">
                <p className="text-center text-sm px-2 overflow-auto max-h-full select-text">
                  {currentCardData.back}
                </p>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <p className="text-xs text-muted-foreground">
                    Click to see question
                  </p>
                </div>
              </CardContent>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={cards.length <= 1} className="h-7 px-3">
          <ChevronLeft className="w-3 h-3" />
          <span className="text-xs">Prev</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlip} className="h-7 px-3">
          <RotateCcw className="w-3 h-3" />
          <span className="text-xs">Flip</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={cards.length <= 1} className="h-7 px-3">
          <span className="text-xs">Next</span>
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Redesigned Quiz Component with text selection
const QuizOverlay: React.FC<{ content: string | string[] | any[]; onClose: () => void; onMinimize: () => void; onTextHighlight?: (selectedText: string, context: string) => void }> = ({
  content,
  onClose,
  onMinimize,
  onTextHighlight
}) => {
  const [currentPage, setCurrentPage] = useState(0); // Pages of 2 questions each
  const [questionStates, setQuestionStates] = useState<{ [key: string]: QuestionState }>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});

  const { TextSelectionPopup } = useTextSelection(onTextHighlight);

  const questions = useMemo(() => {
    try {
      // Handle new API format - array of objects
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
        return content as QuizQuestion[];
      }
      
      // Legacy format fallback
      const contentStr = Array.isArray(content) ? content[0] : content;
      const sections = contentStr.split('\n\n').filter(section => section.includes('**Question'));
      const parsedQuestions: QuizQuestion[] = [];
      
      for (let index = 0; index < sections.length; index++) {
        const section = sections[index];
        const questionMatch = section.match(/\*\*Question \d+:\*\* (.*?)(?=\n[a-d]\)|$)/s);
        const optionsMatch = section.match(/\n([a-d]\).*?)(?=\n\*\*Answer\*\*|\n\n|$)/gs);
        const answerMatch = section.match(/\*\*Answer:\*\* (.*?)$/s);
        
        if (questionMatch && optionsMatch && answerMatch) {
          const question = questionMatch[1]?.trim();
          const options = optionsMatch.map(opt => opt.trim());
          const correctAnswer = answerMatch[1]?.trim();
          
          if (question && options.length > 0 && correctAnswer) {
            parsedQuestions.push({
              id: index.toString(),
              question,
              options,
              correct_answer: correctAnswer,
              explanation: 'No explanation provided.',
              difficulty: 1,
              topic: 'General',
              question_type: 'multiple_choice'
            });
          }
        }
      }
      
      return parsedQuestions;
    } catch (error) {
      console.error('Error parsing quiz content:', error);
      return [];
    }
  }, [content]);

  // Calculate pages (2 questions per page)
  const questionsPerPage = 2;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    const selectedAnswer = selectedAnswers[questionId];
    
    if (!question || !selectedAnswer) return;

    const isCorrect = selectedAnswer === question.correct_answer;
    
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        answered: true,
        selectedAnswer,
        isCorrect,
        showExplanation: true
      }
    }));

    // Show toast feedback
    if (isCorrect) {
      toast.success('Correct answer! 🎉');
    } else {
      toast.error('Incorrect answer. Check the explanation below.');
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleCopyQuiz = async () => {
    const quizText = questions.map((q, idx) => {
      const state = questionStates[q.id];
      const userAnswer = state?.selectedAnswer || 'Not answered';
      const isCorrect = state?.isCorrect || false;
      
      return `Question ${idx + 1}: ${q.question}\n${q.options.join('\n')}\nYour answer: ${userAnswer}\nCorrect answer: ${q.correct_answer}\nExplanation: ${q.explanation}\nResult: ${isCorrect ? '✓ Correct' : '✗ Incorrect'}`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(quizText);
      toast.success('Quiz results copied!');
    } catch (error) {
      toast.error('Failed to copy quiz');
    }
  };

  const calculateScore = () => {
    const answeredQuestions = Object.keys(questionStates);
    if (answeredQuestions.length === 0) return 0;
    const correctAnswers = answeredQuestions.filter(qId => questionStates[qId].isCorrect).length;
    return Math.round((correctAnswers / answeredQuestions.length) * 100);
  };

  const getAnsweredCount = () => {
    return Object.keys(questionStates).length;
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'text-green-500 bg-green-50 dark:bg-green-950';
      case 2: return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 3: return 'text-orange-500 bg-orange-50 dark:bg-orange-950';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      default: return 'Unknown';
    }
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-medium">Quiz</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground text-sm">No quiz questions could be generated from the provided content.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 tool-bg-quiz rounded-lg p-1 relative">
      <TextSelectionPopup />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-medium">Quiz</h3>
          <Badge variant="secondary" className="text-xs">
            Page {currentPage + 1} of {totalPages}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopyQuiz} className="h-6 w-6 p-0">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Progress and Stats */}
      <div className="space-y-2">
        <Progress value={(currentPage + 1) / totalPages * 100} className="h-1" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Questions {currentPage * questionsPerPage + 1}-{Math.min((currentPage + 1) * questionsPerPage, questions.length)} of {questions.length}</span>
          <span>Answered: {getAnsweredCount()}/{questions.length} • Score: {calculateScore()}%</span>
        </div>
      </div>

      {/* Questions Display */}
      <div className="space-y-4">
        {currentQuestions.map((question, index) => {
          const questionState = questionStates[question.id];
          const globalIndex = currentPage * questionsPerPage + index + 1;
          const selectedAnswer = selectedAnswers[question.id];
          const isAnswered = questionState?.answered || false;
          const isCorrect = questionState?.isCorrect || false;

          return (
            <Card key={question.id} className={`transition-all duration-300 ${
              isAnswered ? (isCorrect ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500 bg-red-50/50 dark:bg-red-950/20') : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Question {globalIndex}</span>
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {getDifficultyLabel(question.difficulty)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.topic}
                    </Badge>
                    {isAnswered && (
                      <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                        {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm tool-content select-text">{question.question}</p>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Options */}
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectAnswer = option === question.correct_answer;
                    
                    let optionStyle = 'border cursor-pointer transition-all duration-200';
                    
                    if (isAnswered) {
                      if (isCorrectAnswer) {
                        optionStyle += ' border-green-500 bg-green-50 dark:bg-green-950/20';
                      } else if (isSelected && !isCorrectAnswer) {
                        optionStyle += ' border-red-500 bg-red-50 dark:bg-red-950/20';
                      } else {
                        optionStyle += ' border-border bg-muted/30';
                      }
                    } else {
                      if (isSelected) {
                        optionStyle += ' border-primary bg-primary/10';
                      } else {
                        optionStyle += ' border-border hover:bg-accent';
                      }
                    }

                    return (
                      <label
                        key={`${question.id}-option-${optionIndex}`}
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm ${optionStyle}`}
                        onClick={!isAnswered ? () => handleAnswerSelect(question.id, option) : undefined}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isAnswered ? (
                            isCorrectAnswer ? 'border-green-500 bg-green-500' :
                            isSelected && !isCorrectAnswer ? 'border-red-500 bg-red-500' : 'border-gray-300'
                          ) : (
                            isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                          )
                        }`}>
                          {((isAnswered && isCorrectAnswer) || (!isAnswered && isSelected)) && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                          {isAnswered && isSelected && !isCorrectAnswer && (
                            <X className="w-2.5 h-2.5 text-white" />
                          )}
                          {isAnswered && isCorrectAnswer && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <span className="flex-1 tool-content select-text">{option}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Submit Button */}
                {!isAnswered && (
                  <Button 
                    onClick={() => handleSubmitQuestion(question.id)}
                    disabled={!selectedAnswer}
                    size="sm"
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                )}

                {/* Explanation Card */}
                {isAnswered && questionState?.showExplanation && (
                  <Card className="bg-accent/50 border-accent">
                    <CardContent className="pt-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Explanation:</p>
                          <p className="text-xs text-muted-foreground leading-relaxed tool-content select-text">
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrev} 
          disabled={currentPage === 0}
          className="h-7 px-3"
        >
          <ChevronLeft className="w-3 h-3" />
          <span className="text-xs">Prev</span>
        </Button>
        
        <span className="text-xs text-muted-foreground px-2">
          {currentPage + 1} of {totalPages}
        </span>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNext} 
          disabled={currentPage === totalPages - 1}
          className="h-7 px-3"
        >
          <span className="text-xs">Next</span>
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Diagram Component (unchanged)
const DiagramOverlay: React.FC<{ content: string | string[] | any[]; onClose: () => void; onMinimize: () => void }> = ({
  content,
  onClose,
  onMinimize,
}) => {
  const [currentDiagram, setCurrentDiagram] = useState(0);

  const diagrams = useMemo(() => {
    if (Array.isArray(content)) {
      return content.filter(diagram => diagram.trim().length > 0);
    } else {
      return content.split('\n\n').filter(diagram => diagram.trim().length > 0);
    }
  }, [content]);

  const handleNext = () => {
    if (diagrams.length === 0) return;
    setCurrentDiagram((prev) => (prev + 1) % diagrams.length);
  };

  const handlePrev = () => {
    if (diagrams.length === 0) return;
    setCurrentDiagram((prev) => (prev - 1 + diagrams.length) % diagrams.length);
  };

  if (diagrams.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium">Diagrams</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <p className="text-center text-muted-foreground text-sm">No diagrams could be generated from the provided content.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-medium">Diagrams</h3>
          {diagrams.length > 1 && (
            <Badge variant="secondary" className="text-xs">{currentDiagram + 1} of {diagrams.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Progress for multiple diagrams */}
      {diagrams.length > 1 && (
        <Progress value={(currentDiagram + 1) / diagrams.length * 100} className="h-1" />
      )}

      {/* Diagram Display */}
      <div className="space-y-3">
        <MermaidDiagram 
          code={diagrams[currentDiagram]} 
          title={diagrams.length > 1 ? `Diagram ${currentDiagram + 1}` : undefined}
        />
      </div>

      {/* Navigation for multiple diagrams */}
      {diagrams.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-7 px-3">
            <ChevronLeft className="w-3 h-3" />
            <span className="text-xs">Prev</span>
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentDiagram + 1} of {diagrams.length}
          </span>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-7 px-3">
            <span className="text-xs">Next</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Main Tool Overlay Component
export const ToolOverlay: React.FC<ToolOverlayProps> = ({ toolType, content, onClose, onMinimize, onTextHighlight }) => {
  const getOverlayContent = () => {
    const type = toolType.toLowerCase();
    
    if (type.includes('flashcard')) {
      return <FlashcardOverlay content={content} onClose={onClose} onMinimize={onMinimize} onTextHighlight={onTextHighlight} />;
    }
    
    if (type.includes('quiz')) {
      return <QuizOverlay content={content} onClose={onClose} onMinimize={onMinimize} onTextHighlight={onTextHighlight} />;
    }
    
    if (type.includes('diagram')) {
      return <DiagramOverlay content={content} onClose={onClose} onMinimize={onMinimize} />;
    }

    if (type.includes('game')) {
      return <GameOverlay content={content} onClose={onClose} onMinimize={onMinimize} />;
    }
    
    // Default fallback
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{toolType}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="whitespace-pre-wrap text-sm">
              {Array.isArray(content) ? JSON.stringify(content, null, 2) : content}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-background/98 backdrop-blur-sm z-50 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-4">
          {getOverlayContent()}
        </div>
      </ScrollArea>
    </div>
  );
};