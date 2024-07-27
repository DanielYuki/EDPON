
export default function Fetching({ width, border = 'border-2' } : { width: string; border?: string }) {
  return (
    <div className={`animate-pulse ${width} ${border} border-stone-900 rounded-md bg-white p-4 flex space-x-4`}>
      {/* <div className="rounded-full bg-gray-500 h-10 w-10"></div> */}
      <div className="flex-1 space-y-6 py-1">
        <div className="h-2 bg-gray-500 rounded"></div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-2 bg-gray-500 rounded col-span-2"></div>
            <div className="h-2 bg-gray-500 rounded col-span-1"></div>
          </div>
          <div className="h-2 bg-gray-500 rounded"></div>
        </div>
      </div>
    </div>
  )
}