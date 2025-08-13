import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Paperclip, 
  Wand2, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image
} from "lucide-react"

interface EditorToolbarProps {
  onGenerateAIReply: () => void
  onAttach: () => void
  isGeneratingAI?: boolean
}

export default function EditorToolbar({ onGenerateAIReply, onAttach, isGeneratingAI }: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
      {/* Left side - Text formatting */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Underline className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Image className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAttach} className="h-8">
          <Paperclip className="h-4 w-4 mr-1" />
          Attach
        </Button>
        <Button 
          size="sm" 
          onClick={onGenerateAIReply} 
          disabled={isGeneratingAI}
          className="h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
        >
          {isGeneratingAI ? (
            <>
              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-1" />
              Generate AI Reply
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
