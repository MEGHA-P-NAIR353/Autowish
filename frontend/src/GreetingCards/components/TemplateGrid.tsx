import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { CardTemplate } from '../types';

interface TemplateGridProps {
  templates: CardTemplate[];
  onUseTemplate: (tpl: CardTemplate) => void;
  onPreviewTemplate: (tpl: CardTemplate) => void;
  onToggleFavorite: (id: number) => void;
  favorites: number[] | Set<number>;
}

/**
 * Pure presentational grid. All filtering/search/pagination is now handled
 * server-side by the GreetingCardTemplate API, so this component only renders.
 */
export default function TemplateGrid({
  templates,
  onUseTemplate,
  onPreviewTemplate,
  onToggleFavorite,
  favorites,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-[#131926]/10">
        <SlidersHorizontal size={40} className="mb-4 text-slate-650" />
        <h3 className="text-white font-semibold mb-1 text-sm">No Matching Templates</h3>
        <p className="text-xs max-w-xs text-center text-slate-400">
          Try adjusting your search query or filters to discover templates.
        </p>
      </div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence mode="popLayout">
        {templates.map((tpl) => (
          <motion.div
            key={tpl.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
          >
            <TemplateCard
              template={tpl}
              onUse={onUseTemplate}
              onPreview={onPreviewTemplate}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites instanceof Set ? favorites.has(tpl.id) : favorites.includes(tpl.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
