"use client"
import { X } from "lucide-react"

export default function AttachmentChip({ file, onRemove }:{ file:any, onRemove:()=>void }){
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors">
      {file.name}
      <button 
        aria-label="Remove" 
        onClick={onRemove}
        className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
