import { SocialCardSummary } from '@/components/player/SocialCardSummary';
import { testCardVariables } from './testCardVariables';

export default function TestCardPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a0a0e 0%, #150507 50%, #0a0304 100%)' }}>
      <SocialCardSummary variables={testCardVariables} />
    </div>
  );
}
