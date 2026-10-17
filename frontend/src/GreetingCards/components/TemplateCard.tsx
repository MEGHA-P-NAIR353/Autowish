import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Eye, ArrowRight, ImageOff, Star } from 'lucide-react';
import { CardTemplate } from '../types';
import TemplatePreview from './TemplatePreview';

interface TemplateCardProps {
  template: CardTemplate;
  onUse: (tpl: CardTemplate) => void;
  onPreview: (tpl: CardTemplate) => void;
  onToggleFavorite: (id: number) => void;
  isFavorite?: boolean;
}

const TemplateCard = memo(function TemplateCard({
  template,
  onUse,
  onPreview,
  onToggleFavorite,
  isFavorite = false,
}: TemplateCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const thumbnailSrc = template.preview_image_url || template.thumbnail_image_url || undefined;
  const isPlaceholder = !thumbnailSrc ||
    thumbnailSrc.includes('greeting_templates/defaults') ||
    thumbnailSrc.includes('greeting_templates\\defaults');
  const showThumbnail = Boolean(thumbnailSrc && !imgError && !isPlaceholder);

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative flex flex-col rounded-2xl overflow-hidden border border-line-soft bg-inset group hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15), rgba(236,72,153,0.15))', padding: '1px' }}
      />

      {/* Thumbnail / Preview */}
      <div className="relative aspect-[4/3] overflow-hidden bg-inset">

        {/* Skeleton shimmer */}
        {imgLoading && showThumbnail && (
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-raised-hover to-surface animate-pulse" />
        )}

        {/* Actual uploaded thumbnail image */}
        {showThumbnail && (
          <img
            src={thumbnailSrc}
            alt={template.title}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imgLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImgLoading(false)}
            onError={() => { setImgError(true); setImgLoading(false); }}
          />
        )}

        {/* Rich live vector preview with occasion decorations & typography */}
        {(!showThumbnail || imgError) && (
          <div className="absolute inset-0">
            <TemplatePreview
              template={template}
              showLabel={false}
              rounded="rounded-none"
              aspect="h-full w-full"
            />
          </div>
        )}

        {/* Image failed indicator */}
        {imgError && template.thumbnail_url && (
          <div className="absolute bottom-2 right-2 z-20">
            <ImageOff size={10} className="text-white/30" />
          </div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-20">
          {template.premium && (
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full shadow-md">
              <Sparkles size={7} />
              PRO
            </span>
          )}
          {template.featured && (
            <span className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full shadow-md">
              <Star size={7} />
              FEATURED
            </span>
          )}
          <span className="bg-black/60 backdrop-blur-sm text-slate-300 font-semibold text-[8px] px-2 py-0.5 rounded-full border border-white/10">
            {template.occasion}
          </span>
        </div>

        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(template.id); }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-sm border border-white/10 transition-all z-20"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={12}
            className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-400'}
          />
        </button>

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-inset/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-300 z-20">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPreview(template); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-raised-hover text-fg rounded-xl text-[10px] font-semibold border border-line transition-all"
          >
            <Eye size={12} />
            Preview
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUse(template); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-semibold transition-all shadow-lg shadow-indigo-600/20"
          >
            <ArrowRight size={12} />
            Use This
          </button>
        </div>
      </div>

      {/* Card meta */}
      <div className="p-3.5 flex flex-col gap-2 bg-inset">
        <h3 className="text-fg font-bold text-xs line-clamp-1 group-hover:text-indigo-400 transition-colors">
          {template.title}
        </h3>

        <div className="flex flex-wrap gap-1">
          {template.style_badge && (
            <span className="bg-surface text-black dark:text-slate-400 text-[8px] px-2 py-0.5 rounded-md border border-line">
              {template.style_badge}
            </span>
          )}
          {template.theme_badge && (
            <span className="bg-indigo-950/30 text-indigo-400 text-[8px] px-2 py-0.5 rounded-md border border-indigo-900/30">
              {template.theme_badge}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onUse(template)}
          className="w-full py-2 bg-surface hover:bg-indigo-600 text-black dark:text-white hover:text-white rounded-xl text-[10px] font-semibold border border-line hover:border-indigo-500 transition-all duration-250"
        >
          Use Template
        </button>
      </div>
    </motion.div>
  );
});

export default TemplateCard;
