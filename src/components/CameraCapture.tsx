'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Camera, ImageIcon, X, RefreshCw, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  userId: string;
  existingUrl?: string;
  onCapture: (url: string) => void;
}

type Mode = 'idle' | 'camera' | 'preview';

export default function CameraCapture({ userId, existingUrl, onCapture }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  async function startCamera(facing: 'environment' | 'user' = facingMode) {
    setError('');
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not available — use the library button instead.');
      return;
    }

    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Camera access denied — use the library button instead.');
      setMode('idle');
    }
  }

  async function openCamera() {
    setMode('camera');
    await startCamera();
  }

  async function flipCamera() {
    const next: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  }

  function closeCamera() {
    stopStream();
    setMode('idle');
    setError('');
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      stopStream();
      setCapturedBlob(blob);
      setPreviewSrc(URL.createObjectURL(blob));
      setMode('preview');
    }, 'image/jpeg', 0.88);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setPreviewSrc(URL.createObjectURL(file));
    setMode('preview');
    // reset so same file can be re-picked
    e.target.value = '';
  }

  function retake() {
    setPreviewSrc(null);
    setCapturedBlob(null);
    setMode('idle');
    setError('');
  }

  async function confirmUpload() {
    if (!capturedBlob) return;
    setUploading(true);
    setError('');

    const supabase = createClient();
    const ext = capturedBlob.type === 'image/jpeg' ? 'jpg' : 'png';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { data, error: uploadError } = await supabase.storage
      .from('item-photos')
      .upload(path, capturedBlob, { contentType: capturedBlob.type, upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('item-photos')
      .getPublicUrl(data.path);

    onCapture(publicUrl);
    setPreviewSrc(null);
    setCapturedBlob(null);
    setMode('idle');
    setUploading(false);
  }

  return (
    <>
      {/* ── Idle: photo picker trigger ───────────────────────── */}
      <div className="flex gap-2 items-start">
        {/* Thumbnail / placeholder */}
        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
          {existingUrl ? (
            <Image src={existingUrl} alt="Item photo" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
              <ImageIcon size={22} />
              <span className="text-[10px]">No photo</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-1">
          <button
            type="button"
            onClick={openCamera}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Camera size={16} className="text-brand-700 flex-shrink-0" />
            {existingUrl ? 'Retake photo' : 'Take photo'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <ImageIcon size={16} className="text-brand-700 flex-shrink-0" />
            Choose from library
          </button>
        </div>
      </div>

      {error && <p className="text-orange-600 text-xs mt-1">{error}</p>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Camera overlay ───────────────────────────────────── */}
      {mode === 'camera' && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Video preview */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onCanPlay={() => setCameraReady(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="text-white animate-spin" size={36} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-black px-8 py-8 flex items-center justify-between safe-area-pb">
            {/* Close */}
            <button
              onClick={closeCamera}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="text-white" size={22} />
            </button>

            {/* Shutter */}
            <button
              onClick={capture}
              disabled={!cameraReady}
              className="w-18 h-18 rounded-full bg-white border-4 border-white/50 shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
              style={{ width: 72, height: 72 }}
            />

            {/* Flip */}
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            >
              <RefreshCw className="text-white" size={20} />
            </button>
          </div>

          {error && (
            <p className="absolute top-4 left-0 right-0 text-center text-white text-sm bg-black/60 py-2">
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── Preview overlay ──────────────────────────────────── */}
      {mode === 'preview' && previewSrc && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Image preview */}
          <div className="flex-1 relative">
            <Image src={previewSrc} alt="Preview" fill className="object-contain" sizes="100vw" />
          </div>

          {/* Actions */}
          <div className="bg-black px-6 py-8 flex gap-3 safe-area-pb">
            <button
              onClick={retake}
              disabled={uploading}
              className="flex-1 py-3 rounded-2xl border border-white/30 text-white text-sm font-semibold disabled:opacity-50"
            >
              Retake
            </button>
            <button
              onClick={confirmUpload}
              disabled={uploading}
              className="flex-1 py-3 rounded-2xl bg-brand-400 text-gray-900 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                : <><Check size={16} /> Use photo</>
              }
            </button>
          </div>

          {error && (
            <p className="absolute top-4 left-0 right-0 text-center text-white text-sm bg-black/60 py-2">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
