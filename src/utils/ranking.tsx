import { Trophy, Medal, Award } from 'lucide-react';
import { Badge } from '../components/ui';

/**
 * Rank Styling Utilities
 * 
 * Provides consistent styling for 1st, 2nd, 3rd place finishers across the app
 */

/**
 * Returns an icon component for podium finishes (1st, 2nd, 3rd)
 */
export const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return null;
};

/**
 * Returns the appropriate badge variant based on ranking
 */
export const getRankBadgeVariant = (rank: number): "success" | "secondary" | "outline" => {
  if (rank <= 3) return 'success';
  if (rank <= 10) return 'secondary';
  return 'outline';
};

/**
 * Renders a styled place display with icon and colored badge
 */
export const StyledPlace = ({ place, formatPlace }: { place: number; formatPlace: (n: number) => string }) => {
  return (
    <div className="flex items-center gap-2">
      {getRankIcon(place)}
      <Badge variant={getRankBadgeVariant(place)}>
        {formatPlace(place)}
      </Badge>
    </div>
  );
};
