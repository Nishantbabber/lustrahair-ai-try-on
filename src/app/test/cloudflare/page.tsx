"use client";

import { useState, useRef, useCallback } from "react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Sparkles, Upload, RefreshCw, AlertCircle, Clock, Zap, CheckCircle2, Layers } from "lucide-react";

const DEFAULT_HAIR_PROMPT =
  "Preserve the person's identity, facial features, skin tone, expression, clothing and background. Change only the hairstyle as requested. Make the result photorealistic, with natural hair strands, realistic lighting and believable hair texture.";

interface TestResult {
  image: string;
  model: string;
  elapsedMs: number;
  neurons?: number;
  inputDetails?: {
    originalWidth: number;
    originalHeight: number;
    processedWidth: number;
    processedHeight: number;
    wasResized: boolean;
    format: string;
  };
}

export default function CloudflareTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_HAIR_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setErrorMessage("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image file exceeds 2 MB limit.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGenerate = async () => {
    if (!previewUrl) {
      setErrorMessage("Please upload an image first.");
      return;
    }

    if (!prompt.trim()) {
      setErrorMessage("Please enter a transformation prompt.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/test/cloudflare-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image: previewUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Generation failed with status " + response.status);
        return;
      }

      setResult({
        image: data.image,
        model: data.model,
        elapsedMs: data.elapsedMs,
        neurons: data.neurons,
        inputDetails: data.inputDetails,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error while connecting to the test API."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-sand text-charcoal py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-ivory rounded-2xl p-6 sm:p-8 shadow-sm border border-sand-dark">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-light/60 border border-champagne text-xs font-semibold uppercase tracking-wider text-charcoal mb-3">
                <Sparkles className="w-3.5 h-3.5 text-champagne-dark" />
                Isolated Development Testing
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">
                Cloudflare FLUX.2 Klein 4B Image-to-Image
              </h1>
              <p className="text-sm text-charcoal-muted mt-1">
                Model Evaluation & Benchmark: <code className="text-xs bg-sand-dark px-1.5 py-0.5 rounded font-mono">@cf/black-forest-labs/flux-2-klein-4b</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-charcoal-muted hover:text-charcoal bg-sand hover:bg-sand-dark transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset / New Image
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Generation Error</p>
              <p className="mt-0.5 text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Grid: Upload & Controls | Preview & Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="space-y-6">
            {/* Image Upload Box */}
            <div className="bg-ivory rounded-2xl p-6 shadow-sm border border-sand-dark space-y-4">
              <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
                <Upload className="w-4 h-4 text-champagne-dark" />
                1. Upload Reference Image
              </h2>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  previewUrl
                    ? "border-champagne bg-champagne-light/20"
                    : "border-sand-dark hover:border-champagne hover:bg-sand/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Original Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-xs object-contain"
                    />
                    <p className="text-xs text-charcoal-muted">
                      {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : "Image loaded"}
                    </p>
                    <p className="text-xs text-champagne-dark font-medium underline">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <Upload className="w-8 h-8 text-charcoal-muted mx-auto" />
                    <p className="text-sm font-medium text-charcoal">
                      Drag and drop your image, or click to browse
                    </p>
                    <p className="text-xs text-charcoal-muted">
                      JPG, PNG, or WEBP up to 2 MB (Auto-resized to &lt; 512px)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Box */}
            <div className="bg-ivory rounded-2xl p-6 shadow-sm border border-sand-dark space-y-4">
              <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-champagne-dark" />
                2. Transformation Prompt
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full text-sm rounded-xl border border-sand-dark p-3 focus:outline-none focus:ring-2 focus:ring-champagne focus:border-champagne bg-sand/30"
                placeholder="Enter prompt instructions..."
              />
              <div className="flex items-center justify-between text-xs text-charcoal-muted">
                <span>Realistic hair transformations require identity preservation</span>
                <span>{prompt.length}/1000</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !previewUrl}
              className={`w-full py-4 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                isGenerating || !previewUrl
                  ? "bg-sand-dark text-charcoal-muted cursor-not-allowed"
                  : "bg-charcoal text-ivory hover:bg-charcoal/90 active:scale-[0.99]"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-champagne" />
                  Running Cloudflare 4-Step Inference...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-champagne" />
                  Generate with Cloudflare FLUX.2 Klein 4B
                </>
              )}
            </button>
          </div>

          {/* Results Column */}
          <div className="space-y-6">
            <div className="bg-ivory rounded-2xl p-6 shadow-sm border border-sand-dark space-y-4 min-h-[460px] flex flex-col">
              <h2 className="text-base font-semibold text-charcoal flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-champagne-dark" />
                  3. Generation Result & Comparison
                </span>
                {result && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                  </span>
                )}
              </h2>

              {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-sand-dark border-t-charcoal animate-spin" />
                    <Sparkles className="w-6 h-6 text-champagne absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">
                      Running 4-Step FLUX.2 Inference
                    </p>
                    <p className="text-xs text-charcoal-muted mt-1">
                      Executing on Cloudflare Workers AI serverless GPU network...
                    </p>
                  </div>
                </div>
              ) : result && previewUrl ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {/* Before / After Comparison */}
                  <div className="rounded-xl overflow-hidden shadow-sm border border-sand-dark">
                    <BeforeAfterSlider
                      beforeImage={previewUrl}
                      afterImage={result.image}
                      beforeLabel="Original Input"
                      afterLabel="Cloudflare FLUX.2"
                    />
                  </div>

                  {/* Benchmark & Usage Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-sand/60 p-3 rounded-xl border border-sand-dark">
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                        <Clock className="w-3.5 h-3.5 text-charcoal-muted" />
                        Elapsed Time
                      </div>
                      <p className="text-sm font-bold text-charcoal mt-1">
                        {(result.elapsedMs / 1000).toFixed(2)}s
                      </p>
                    </div>

                    <div className="bg-sand/60 p-3 rounded-xl border border-sand-dark">
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                        <Zap className="w-3.5 h-3.5 text-champagne-dark" />
                        Neurons Usage
                      </div>
                      <p className="text-sm font-bold text-charcoal mt-1">
                        {result.neurons !== undefined ? `${result.neurons} neurons` : "N/A"}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1 bg-sand/60 p-3 rounded-xl border border-sand-dark">
                      <div className="text-xs text-charcoal-muted">Dimensions</div>
                      <p className="text-sm font-bold text-charcoal mt-1">
                        512 × 512
                      </p>
                    </div>
                  </div>

                  {/* Resize & Preprocessing details */}
                  {result.inputDetails && (
                    <div className="p-3 bg-sand/40 rounded-xl text-xs text-charcoal-muted space-y-1">
                      <p className="font-semibold text-charcoal">Pre-processing Information:</p>
                      <p>
                        Input original: {result.inputDetails.originalWidth} × {result.inputDetails.originalHeight}px
                        {result.inputDetails.wasResized ? (
                          <span className="text-amber-700 font-medium"> (resized to {result.inputDetails.processedWidth} × {result.inputDetails.processedHeight}px for model constraints)</span>
                        ) : (
                          <span className="text-emerald-700 font-medium"> (maintained dimensions under 512px)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-charcoal-muted space-y-2 border border-dashed border-sand-dark rounded-xl">
                  <Sparkles className="w-10 h-10 text-charcoal-muted/40" />
                  <p className="text-sm font-medium text-charcoal">No generation yet</p>
                  <p className="text-xs max-w-xs">
                    Upload an image and click generate to test the Cloudflare Workers AI integration.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
