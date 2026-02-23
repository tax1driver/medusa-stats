import { Input, IconButton, DropdownMenu } from "@medusajs/ui"
import { EllipsisHorizontal, Trash, Plus, ArrowUpMini, ArrowDownMini } from "@medusajs/icons"
import { useState, useEffect } from "react"

type MetadataEntry = {
  key: string
  value: string
}

type MetadataEditorProps = {
  value: Record<string, any> | null
  onChange: (value: Record<string, any> | null) => void
}

export const MetadataEditor = ({ value, onChange }: MetadataEditorProps) => {
  const [entries, setEntries] = useState<MetadataEntry[]>([])

  // Initialize entries from value
  useEffect(() => {
    if (value && typeof value === "object") {
      const entriesFromValue = Object.entries(value).map(([key, val]) => ({
        key,
        value: typeof val === "string" ? val : JSON.stringify(val),
      }))
      setEntries(entriesFromValue.length > 0 ? entriesFromValue : [{ key: "", value: "" }])
    } else {
      setEntries([{ key: "", value: "" }])
    }
  }, [value])

  // Update parent when entries change
  const updateParent = (newEntries: MetadataEntry[]) => {
    const filtered = newEntries.filter(e => e.key.trim() !== "")
    if (filtered.length === 0) {
      onChange(null)
    } else {
      const obj: Record<string, any> = {}
      filtered.forEach(entry => {
        try {
          // Try to parse as JSON, otherwise keep as string
          obj[entry.key] = JSON.parse(entry.value)
        } catch {
          obj[entry.key] = entry.value
        }
      })
      onChange(obj)
    }
  }

  const handleKeyChange = (index: number, newKey: string) => {
    const newEntries = [...entries]
    newEntries[index].key = newKey
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleValueChange = (index: number, newValue: string) => {
    const newEntries = [...entries]
    newEntries[index].value = newValue
    setEntries(newEntries)
    updateParent(newEntries)
  }

  const handleAddRow = () => {
    setEntries([...entries, { key: "", value: "" }])
  }

  const handleDeleteRow = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index)
    if (newEntries.length === 0) {
      newEntries.push({ key: "", value: "" })
    }
    setEntries(newEntries)
    updateParent(newEntries)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-ui-bg-base shadow-elevation-card-rest grid grid-cols-1 divide-y rounded-lg">
        {/* Header */}
        <div className="bg-ui-bg-subtle grid grid-cols-2 divide-x rounded-t-lg">
          <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
            <label id="metadata-form-key-label">Key</label>
          </div>
          <div className="txt-compact-small-plus text-ui-fg-subtle px-2 py-1.5">
            <label id="metadata-form-value-label">Value</label>
          </div>
        </div>

        {/* Rows */}
        {entries.map((entry, index) => (
          <div key={index} className="group/table relative">
            <div className="grid grid-cols-2 divide-x overflow-hidden">
              <div className="flex flex-col">
                <Input
                  aria-labelledby="metadata-form-key-label"
                  name={`metadata.${index}.key`}
                  placeholder="Key"
                  value={entry.key}
                  onChange={(e) => handleKeyChange(index, e.target.value)}
                  className="txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none border-0 rounded-none focus:shadow-none"
                />
              </div>
              <div className="flex flex-col">
                <Input
                  aria-labelledby="metadata-form-value-label"
                  name={`metadata.${index}.value`}
                  placeholder="Value"
                  value={entry.value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted disabled:text-ui-fg-disabled disabled:bg-ui-bg-base bg-transparent px-2 py-1.5 outline-none border-0 rounded-none focus:shadow-none"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  size="small"
                  variant="transparent"
                  className="invisible absolute inset-y-0 -end-2.5 my-auto group-hover/table:visible data-[state='open']:visible transition-fg shadow-buttons-neutral text-ui-fg-subtle bg-ui-button-neutral hover:bg-ui-button-neutral-hover active:bg-ui-button-neutral-pressed h-5 w-5"
                >
                  <EllipsisHorizontal />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                    onClick={() => {
                        const newEntries = [...entries]
                        newEntries.splice(index, 0, { key: "", value: "" })
                        setEntries(newEntries)
                        updateParent(newEntries)
                    }}
                >
                    <ArrowUpMini className="mr-2" />
                    Add row above
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onClick={() => {
                        const newEntries = [...entries]
                        newEntries.splice(index + 1, 0, { key: "", value: "" })
                        setEntries(newEntries)
                        updateParent(newEntries)
                    }}
                >
                    <ArrowDownMini className="mr-2" />
                    Add row below
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => handleDeleteRow(index)}
                  className="text-ui-fg-error"
                >
                  <Trash className="mr-2" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  )
}
