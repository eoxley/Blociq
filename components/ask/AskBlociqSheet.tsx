"use client"
import { useEffect, useRef, useState } from "react"
import { useAsk } from "./AskBlociqProvider"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import ChatMessage from "./ChatMessage"
import UploadDropzone from "./UploadDropzone"
import AttachmentChip from "./AttachmentChip"
import { Paperclip, RotateCw } from "lucide-react"
import { useBuildingContext } from "@/hooks/useBuildingContext"

export default function AskBlociqSheet(){
  const { open, setOpen, messages, append, reset, useMemory, setUseMemory, send, pending } = useAsk()
  const [text, setText] = useState("")
  const [files, setFiles] = useState<Array<{id:string;name:string;url?:string;type?:string;size?:number}>>([])
  const listRef = useRef<HTMLDivElement>(null)
  const { buildingId } = useBuildingContext() // undefined if none

  useEffect(()=>{ 
    if (listRef.current) {
      listRef.current.scrollTo({top:999999, behavior:"smooth"}) 
    }
  },[messages,pending,open])

  useEffect(()=>{
    if (!open) return
    const onKey=(e:KeyboardEvent)=>{
      const mac=/Mac/i.test(navigator.platform)
      if((mac?e.metaKey:e.ctrlKey)&&e.key==="Enter"){ 
        e.preventDefault(); 
        handleSend() 
      }
      if(e.key==="Escape"){ 
        setOpen(false) 
      }
    }
    window.addEventListener("keydown", onKey); 
    return ()=>window.removeEventListener("keydown", onKey)
  },[open, text, files])

  const handleSend = async ()=>{
    const t = text.trim()
    if (!t) return
    setText("")
    await send(t, files, { buildingId })
    setFiles([])
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="p-0 w-[520px] sm:w-[460px]">
        <div className="h-[80vh] grid grid-rows-[auto_auto_1fr_auto]">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <SheetHeader className="p-0">
              <SheetTitle className="text-base">Ask Blociq</SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox 
                  checked={useMemory} 
                  onCheckedChange={(v)=>setUseMemory(!!v)} 
                />
                Use previous messages
              </label>
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCw className="h-4 w-4 mr-1" /> 
                New Thread
              </Button>
            </div>
          </div>

          {/* Upload */}
          <div className="px-4 py-2 border-b">
            <UploadDropzone
              onFiles={(newFiles)=> setFiles(prev=>[...prev, ...newFiles])}
              className="rounded-md"
              hint="Drop files here for AI analysis"
            />
            {files.length>0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map(f => (
                  <AttachmentChip 
                    key={f.id} 
                    file={f} 
                    onRemove={()=>setFiles(files.filter(x=>x.id!==f.id))} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea ref={listRef} className="px-4 py-3">
            <div className="space-y-3">
              {messages.length===0 && (
                <div className="text-sm text-muted-foreground">
                  Start a conversation — ask about property management, upload documents, or get help with notices.
                </div>
              )}
              {messages.map(m => <ChatMessage key={m.id} msg={m} />)}
              {pending && <ChatMessage loading />}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="shrink-0" 
                onClick={()=>document.getElementById("ask-upload-proxy")?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Ask Blociq anything about property management…"
                value={text}
                onChange={(e)=>setText(e.target.value)}
                onKeyDown={(e)=>{ 
                  if(e.key==="Enter" && !e.shiftKey){ 
                    e.preventDefault(); 
                    handleSend() 
                  } 
                }}
              />
              <Button onClick={handleSend} disabled={pending || !text.trim()}>
                Send
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Blociq provides guidance, not legal advice. Always consult professionals for legal matters.
              <a href="/ask" className="ml-2 underline">Open full page</a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
