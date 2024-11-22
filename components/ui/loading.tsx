export function Loading() {
  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-4 h-4 rounded-full bg-blue-500 animate-bounce"></div>
        </div>
      </div>
    </div>
  );
} 