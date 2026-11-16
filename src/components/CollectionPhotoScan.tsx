import { useEffect, useState, type ChangeEvent } from 'react'
import { Button, Input } from './ui'
import { dataService } from '../services/apiService'

async function jpegPayload(url: string) {
  const image = new Image()
  image.src = url
  await image.decode()
  const scale = Math.min(1, 2600 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the photo.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.88, 0.75, 0.6]) {
    const payload = canvas.toDataURL('image/jpeg', quality).split(',')[1]
    if (payload && payload.length <= 2800000) return payload
  }
  throw new Error('The photo is too large. Try cropping it to the edges of the form.')
}

export function CollectionPhotoScan({ onScan, disabled }: {
  onScan: (draft: Awaited<ReturnType<typeof dataService.scanCollectionForm>>) => void
  disabled: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    setFile(selected)
    setConfirmed(false)
    setError('')
  }

  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function scan() {
    setBusy(true)
    setError('')
    try {
      const draft = await dataService.scanCollectionForm(await jpegPayload(preview))
      if (!draft || !Object.keys(draft).length) throw new Error('No filled fields could be read. Retake the photo in good light.')
      onScan(draft)
      setFile(null)
      setConfirmed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not scan the form. Try another photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="space-y-3 rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer font-medium">Scan a filled paper form</summary>
      <p className="text-sm text-slate-600">
        Cover Aadhaar, PAN and signatures before taking a photo. Scanning sends the photo to Google Gemini to read the filled fields.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="block">Take a photo
          <Input type="file" accept="image/*" capture="environment" disabled={busy || disabled} onChange={selectPhoto} />
        </label>
        <label className="block">Choose an existing photo
          <Input type="file" accept="image/*" disabled={busy || disabled} onChange={selectPhoto} />
        </label>
      </div>
      {preview && (
        <>
          <img src={preview} alt="Selected paper form" className="max-h-56 max-w-full rounded border border-slate-200 object-contain" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={confirmed} disabled={busy || disabled} onChange={(event) => setConfirmed(event.target.checked)} />
            Aadhaar, PAN and signatures are covered. Send this photo to Google Gemini to fill the draft.
          </label>
          <Button type="button" disabled={!confirmed || busy || disabled} onClick={() => void scan()}>
            {busy ? 'Reading form…' : 'Fill draft from photo'}
          </Button>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </details>
  )
}

