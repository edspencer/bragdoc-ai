import { Check } from "lucide-react"

export function BragAction({ action }: { action: any }) {
  const {brags} = action

  return (
    <div className="flex gap-4 flex-wrap">
      {brags.map((brag: any) => (
        <BragCreated key={brag.title} brag={brag} />
      ))}
    </div>
  )
}

export function BragCreated({brag}: {brag: any}) {
  return (
    <div className="bg-slate-100 border border-slate-400 text-slate-700 px-2 py-1 rounded-md relative max-w-54" role="alert">
      <span className="inline-block align-middle mr-2">
        <Check className="size-4" />
      </span>

      <span className="block sm:inline text-sm">{brag.title}</span>
    </div>
  )
}