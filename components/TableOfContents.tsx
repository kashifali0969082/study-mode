import React, { useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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

interface TableOfContentsProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentPage: number;
  onPageSelect: (page: number, sectionId?: string, chapterId?: string) => void;
  tocData: TOC;
}

const TOCItemComponent: React.FC<{
  chapter: Chapter;
  currentPage: number;
  onPageSelect: (page: number, sectionId?: string, chapterId?: string) => void;
}> = ({ chapter, currentPage, onPageSelect }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  // Check if chapter has only one section with the same name as chapter
  const shouldShowSections = chapter.sections && chapter.sections.length > 0 && 
    !(chapter.sections.length === 1 && chapter.sections[0].title === chapter.title);
  
  const hasExpandableSections = shouldShowSections;
  
  // If chapter has no sections or only one section with same name, make chapter clickable
  const chapterPage = chapter.sections && chapter.sections.length > 0 ? 
    chapter.sections[0].page : null;
  
  const isCurrentChapter = chapterPage && currentPage === chapterPage;

  const handleChapterClick = () => {
    if (chapterPage) {
      onPageSelect(chapterPage, chapter.sections?.[0]?.section_id, chapter.chapter_id);
    }
  };

  const handleSectionClick = (section: Section) => {
    onPageSelect(section.page, section.section_id, chapter.chapter_id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div>
        {/* Chapter Header - Compact */}
        <div
          className={`flex items-center justify-between py-1 px-2 rounded-md transition-colors ${
            !hasExpandableSections ? 'cursor-pointer' : ''
          } ${
            isCurrentChapter && !hasExpandableSections ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
          onClick={!hasExpandableSections ? handleChapterClick : undefined}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {hasExpandableSections ? (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 w-3 h-3"
                  onClick={handleToggleExpand}
                >
                  {isOpen ? (
                    <ChevronDown className="w-2 h-2" />
                  ) : (
                    <ChevronRight className="w-2 h-2" />
                  )}
                </Button>
              </CollapsibleTrigger>
            ) : (
              <div className="w-3" />
            )}
            <span className="truncate text-xs" title={chapter.title}>
              {chapter.title}
            </span>
          </div>
          {chapterPage && !hasExpandableSections && (
            <span className="text-xs text-muted-foreground ml-1">{chapterPage}</span>
          )}
        </div>

        {/* Sections - Compact */}
        {hasExpandableSections && (
          <CollapsibleContent>
            <div className="mt-0.5 ml-3">
              {chapter.sections?.map((section) => {
                const isCurrentSection = currentPage === section.page;
                return (
                  <div
                    key={section.section_id}
                    className={`flex items-center justify-between py-1 px-2 rounded-md cursor-pointer transition-colors ${
                      isCurrentSection ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                    onClick={() => handleSectionClick(section)}
                  >
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <div className="w-3" />
                      <span className="truncate text-xs" title={section.title}>
                        {section.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">{section.page}</span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  isCollapsed,
  onToggleCollapse,
  currentPage,
  onPageSelect,
  tocData,
}) => {
  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-card p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full h-7"
          title="Open Table of Contents"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full border-r bg-card flex flex-col min-w-0">
      {/* Header - Compact */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm truncate">Contents</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0 flex-shrink-0"
            title="Collapse Table of Contents"
          >
            <PanelLeftClose className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Content - Tight spacing */}
      <ScrollArea className="flex-1 p-1">
        <div className="space-y-0.5">
          {tocData.chapters.map((chapter) => (
            <TOCItemComponent
              key={chapter.chapter_id}
              chapter={chapter}
              currentPage={currentPage}
              onPageSelect={onPageSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};