"use client"
import { createContext, useContext, useState, useMemo, useCallback } from "react"

type Msg = { id: string; role: "user"|"assistant"|"system"; content: string; at: number; files?: FileMeta[] }
type FileMeta = { id: string; name: string; url?: string; type?: string; size?: number }
type AskCtx = {
  open: boolean; setOpen(v:boolean):void
  useMemory: boolean; setUseMemory(v:boolean):void
  messages: Msg[]; setMessages(ms:Msg[]):void; append(m:Msg):void; reset():void
  pending: boolean; unread: boolean; setUnread(v:boolean):void
  send: (input:string, files?:FileMeta[], ctx?:{buildingId?:string})=>Promise<void>
}

const Ctx = createContext<AskCtx>(null as any)

export default function AskBlociqProvider({ children }:{children:React.ReactNode}) {
  const [open, setOpen] = useState(false)
  const [useMemory, setUseMemory] = useState(true)
  const [messages, setMessages] = useState<Msg[]>([])
  const [pending, setPending] = useState(false)
  const [unread, setUnread] = useState(false)

  const append = useCallback((m:Msg)=>setMessages(prev=>[...prev, m]), [])
  const reset = useCallback(()=>setMessages([]), [])

  const send: AskCtx["send"] = async (input, files=[], ctx) => {
    if (!input?.trim()) return
    const userMsg: Msg = { id: crypto.randomUUID(), role:"user", content: input, at: Date.now(), files }
    append(userMsg)
    setPending(true)
    try {
      const res = await fetch("/api/ask-ai", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ question: input, use_memory: useMemory, building_id: ctx?.buildingId, files })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // stream-friendly: but if not streaming, just parse JSON
      const data = await res.json()
      const assistantMsg: Msg = { id: crypto.randomUUID(), role:"assistant", content: data.answer ?? "", at: Date.now() }
      append(assistantMsg)
      if (!open) setUnread(true)
    } catch (e:any) {
      append({ id: crypto.randomUUID(), role:"assistant", content: "Sorry—something went wrong answering that.", at: Date.now() })
    } finally { setPending(false) }
  }

  const value = useMemo(()=>({ open,setOpen,useMemory,setUseMemory,messages,setMessages,append,reset,pending,unread,setUnread,send }),[open,useMemory,messages,pending,unread])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAsk = ()=>useContext(Ctx)
