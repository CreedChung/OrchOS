import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "#/components/ui/button"
import { Sparkles } from "lucide-react"
import { m } from "#/paraglide/messages"

const SPEED_FACTOR = 1
const FORM_WIDTH = 360
const FORM_HEIGHT = 200

interface ContextShape {
  showForm: boolean
  successFlag: boolean
  triggerOpen: () => void
  triggerClose: () => void
}

const FormContext = createContext({} as ContextShape)

function useFormContext() {
  return useContext(FormContext)
}

export function MorphPanel() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [successFlag, setSuccessFlag] = useState(false)

  const triggerClose = useCallback(() => {
    setShowForm(false)
    textareaRef.current?.blur()
  }, [])

  const triggerOpen = useCallback(() => {
    setShowForm(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSuccess = useCallback(() => {
    triggerClose()
    setSuccessFlag(true)
    setTimeout(() => setSuccessFlag(false), 1500)
  }, [triggerClose])

  useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  const ctx = useMemo(
    () => ({ showForm, successFlag, triggerOpen, triggerClose }),
    [showForm, successFlag, triggerOpen, triggerClose]
  )

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        ref={wrapperRef}
        data-panel
        className="bg-background relative flex flex-col items-center overflow-hidden rounded-2xl border"
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : 200,
          height: showForm ? FORM_HEIGHT : 44,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm ref={textareaRef} onSuccess={handleSuccess} />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
      <div className="flex w-full items-center justify-center gap-2 px-3">
        <Sparkles className="size-4 text-primary shrink-0" />
        <Button
          type="button"
          className="flex h-fit flex-1 justify-end rounded-full px-2 !py-0.5"
          variant="ghost"
          onClick={triggerOpen}
        >
          <span className="truncate">{m.ai_ask()}</span>
        </Button>
      </div>
    </footer>
  )
}

function InputForm({ ref, onSuccess }: { ref: React.Ref<HTMLTextAreaElement>; onSuccess: () => void }) {
  const { triggerClose, showForm } = useFormContext()
  const btnRef = useRef<HTMLButtonElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSuccess()
  }

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      btnRef.current?.click()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-1"
          >
            <div className="flex items-center justify-between py-1">
              <p className="text-foreground flex items-center gap-1.5 select-none">
                <Sparkles className="size-4 text-primary" />
                {m.ai_ask()}
              </p>
              <button
                type="submit"
                ref={btnRef}
                className="flex items-center gap-1 rounded-[12px] bg-transparent pr-1 text-center select-none"
              >
                <KeyHint>⌘</KeyHint>
                <KeyHint className="w-fit">Enter</KeyHint>
              </button>
            </div>
            <textarea
              ref={ref}
              placeholder={m.ai_placeholder()}
              name="message"
              className="h-full w-full resize-none scroll-py-2 rounded-md p-4 outline-0"
              required
              onKeyDown={handleKeys}
              spellCheck={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

function KeyHint({ children, className }: { children: string; className?: string }) {
  return (
    <kbd className={`text-foreground flex h-6 w-fit items-center justify-center rounded-sm border px-[6px] font-sans ${className || ""}`}>
      {children}
    </kbd>
  )
}

export default MorphPanel
