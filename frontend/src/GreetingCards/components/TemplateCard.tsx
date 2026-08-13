import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Eye, ArrowRight, ImageOff, Star } from 'lucide-react';
import { CardTemplate } from '../types';

interface TemplateCardProps {
  template: CardTemplate;
  onUse: (tpl: CardTemplate) => void;
  onPreview: (tpl: CardTemplate) => void;
  onToggleFavorite: (id: number) => void;
  isFavorite?: boolean;
}

// Deterministic gradient from template id for beautiful no-thumbnail fallback
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
];

const OCCASION_EMOJIS: Record<string, string> = {
  birthday: '🎂',
  anniversary: '💍',
  wedding: '💐',
  christmas: '🎄',
  diwali: '🪔',
  graduation: '🎓',
  valentine: '❤️',
  festival: '✨',
  corporate: '💼',
  default: '🌟',
};

function getOccasionEmoji(occasion: string) {
  const lower = occasion?.toLowerCase() || '';
  for (const [key, emoji] of Object.entries(OCCASION_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return OCCASION_EMOJIS.default;
}

function getFallbackGradient(id: number) {
  return FALLBACK_GRADIENTS[id % FALLBACK_GRADIENTS.length];
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

  const fallbackGradient = getFallbackGradient(template.id);
  const occasionEmoji = getOccasionEmoji(template.occasion);

  // Resolve the actual background style for the card's color preview
  const cardBgStyle: React.CSSProperties = {};
  if (template.background_color) {
    if (
      template.background_color.startsWith('linear-gradient') ||
      template.background_color.startsWith('radial-gradient')
    ) {
      cardBgStyle.background = template.background_color;
    } else {
      cardBgStyle.backgroundColor = template.background_color;
    }
  } else {
    cardBgStyle.background = fallbackGradient;
  }

  const showThumbnail = !!(template.preview_image_url || template.thumbnail_image_url) && !imgError;
  const thumbnailSrc = template.preview_image_url || template.thumbnail_image_url || undefined;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative flex flex-col rounded-2xl overflow-hidden border border-[#1E293B] bg-[#0F1422] group hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15), rgba(236,72,153,0.15))', padding: '1px' }}
      />

      {/* Thumbnail / Preview */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#111827]">

        {/* Skeleton shimmer */}
        {imgLoading && showThumbnail && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B] via-[#334155] to-[#1E293B] animate-pulse" />
        )}

        {/* Actual thumbnail image */}
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

        {/* Fallback: beautiful gradient card preview when no thumbnail */}
        {(!showThumbnail || imgError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4" style={cardBgStyle}>
            {/* Decorative overlay pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            {/* Decorative rings */}
            <div className="absolute top-4 right-4 w-16 h-16 rounded-full border border-white/10" />
            <div className="absolute bottom-4 left-4 w-10 h-10 rounded-full border border-white/10" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="text-4xl mb-2">{occasionEmoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
                {template.occasion}
              </span>
              <span className="text-white text-xs font-semibold text-center line-clamp-2 px-2">
                {template.title}
              </span>
            </div>
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
          <span className="bg-black/60 backdrop-blur-sm text-[#CBD5E1] font-semibold text-[8px] px-2 py-0.5 rounded-full border border-white/10">
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
            className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#94A3B8] hover:text-rose-400'}
          />
        </button>

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-[#0B0F19]/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-300 z-20">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPreview(template); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded-xl text-[10px] font-semibold border border-[#334155] transition-all"
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
      <div className="p-3.5 flex flex-col gap-2 bg-[#0F1422]">
        <h3 className="text-[#F8FAFC] font-bold text-xs line-clamp-1 group-hover:text-indigo-400 transition-colors">
          {template.title}
        </h3>

        <div className="flex flex-wrap gap-1">
          {template.style_badge && (
            <span className="bg-[#1E293B] text-[#94A3B8] text-[8px] px-2 py-0.5 rounded-md border border-[#334155]">
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
          className="w-full py-2 bg-[#1E293B] hover:bg-indigo-600 text-[#CBD5E1] hover:text-white rounded-xl text-[10px] font-semibold border border-[#334155] hover:border-indigo-500 transition-all duration-250"
        >
          Customize Card
        </button>
      </div>
    </motion.div>
  );
});

export default TemplateCard;
