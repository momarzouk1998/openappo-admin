"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans dir-rtl">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 border border-red-200 text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h1 className="text-2xl font-bold text-red-700 mb-2">حدث خطأ في النظام</h1>
        <p className="text-gray-700 mb-4">{error.message || "حدث خطأ غير متوقع أثناء تحميل الصفحة."}</p>
        {error.digest && (
          <p className="text-xs text-gray-500 mb-4">
            رمز الخطأ: <code>{error.digest}</code>
          </p>
        )}
        <button
          onClick={() => reset()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition duration-150"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
