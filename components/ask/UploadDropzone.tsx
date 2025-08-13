"use client"
import { useRef } from "react"

export default function UploadDropzone({ 
  onFiles, 
  className="", 
  hint="Drop files here" 
}:{
  onFiles:(files:Array<{id:string;name:string;type?:string;size?:number;url?:string}>)=>void, 
  className?:string, 
  hint?:string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  
  return (
    <div
      onDragOver={(e)=>{e.preventDefault()}}
      onDrop={(e)=>{ 
        e.preventDefault(); 
        const files = Array.from(e.dataTransfer.files).map(f=>({ 
          id:crypto.randomUUID(), 
          name:f.name, 
          type:f.type, 
          size:f.size 
        })); 
        onFiles(files) 
      }}
      className={`border border-dashed p-3 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors ${className}`}
      onClick={()=>inputRef.current?.click()}
    >
      <input 
        id="ask-upload-proxy" 
        ref={inputRef} 
        type="file" 
        multiple 
        className="hidden"
        onChange={(e)=>{ 
          const files = Array.from(e.target.files||[]).map(f=>({ 
            id:crypto.randomUUID(), 
            name:f.name, 
            type:f.type, 
            size:f.size 
          })); 
          onFiles(files) 
        }} 
      />
      {hint}
    </div>
  )
}
