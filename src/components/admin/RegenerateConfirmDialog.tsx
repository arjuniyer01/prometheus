"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegenerateConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    count: number;
    isLoading: boolean;
}

export function RegenerateConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    count,
    isLoading
}: RegenerateConfirmDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden">
                {/* Visual Flair */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 animate-pulse" />

                <DialogHeader className="pt-4">
                    <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20 mx-auto">
                        <AlertTriangle className="w-7 h-7 text-orange-500" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center text-white font-outfit">
                        Confirm Universe Reset
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-400 text-sm mt-2 px-4 leading-relaxed">
                        You are about to trigger a deep financial synthesis for <span className="text-white font-bold">{count} assets</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Zap className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Operation Details</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Current market data will be refreshed and AI insights will be regenerated using the latest model architecture.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest transition-all border border-white/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                Initiate Sync
                            </>
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
