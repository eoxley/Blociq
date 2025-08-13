"use client"
import { useEffect } from "react"
import { useAsk } from "./AskBlociqProvider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import AskBlociqSheet from "./AskBlociqSheet"
import BrainIcon from "@/components/icons/BrainIcon"

export default function AskBlociqBubble(){
  const { open, setOpen, unread, setUnread } = useAsk()
  
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ 
      const mac=/Mac/i.test(navigator.platform); 
      if((mac?e.metaKey:e.ctrlKey)&&e.key==="/"){ 
        e.preventDefault()
        setOpen(!open) 
      } 
    }
    window.addEventListener("keydown", onKey); 
    return ()=>window.removeEventListener("keydown", onKey)
  },[open,setOpen])
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="Ask Blociq"
              onClick={()=>{ setOpen(!open); if(unread) setUnread(false) }}
              className={cn(
                "fixed bottom-5 right-5 z-[70] h-12 w-12 rounded-full shadow-lg focus-visible:outline-none",
                "bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-violet-500 flex items-center justify-center",
                "hover:scale-105 transition-transform duration-200"
              )}
            >
              {/* brain icon */}
              <BrainIcon className="h-6 w-6 text-white" />
              {unread && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Ask Blociq (Ctrl+/)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AskBlociqSheet />
    </>
  )
}
