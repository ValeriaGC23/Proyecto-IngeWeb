// Componente individual de opción de votación.
// Recibe la opción, si tiene el voto del usuario, si es la ganadora, y el callback.
import type { PlanOption } from '../../types';
import { FiMapPin, FiClock, FiCheck, FiAward } from 'react-icons/fi';

type Props = {
  option: PlanOption;
  index: number;
  isVoted: boolean;
  isWinner: boolean;
  isVotable: boolean;
  percentage: number;
  onVote: (optionId: string) => void;
  formatDate: (iso: string) => string;
};

export default function OptionCard({ option, index, isVoted, isWinner, isVotable, percentage, onVote, formatDate }: Props) {
  return (
    <div
      className={`option-card ${isVoted ? 'voted' : ''} ${isWinner ? 'winner' : ''} ${isVotable ? 'votable' : ''}`}
      onClick={() => isVotable && onVote(option.id)}
    >
      {isWinner && <span className="winner-badge"><FiAward /> Ganadora</span>}
      <div className="option-info">
        <span className="option-place"><FiMapPin /> {option.place}</span>
        <span className="option-time"><FiClock /> {formatDate(option.time)}</span>
      </div>
      <div className="option-votes">
        <div className="vote-bar-track">
          <div className="vote-bar-fill" style={{ width: `${percentage}%` }} />
        </div>
        <span className="vote-count">
          {option.votesCount} voto{option.votesCount !== 1 ? 's' : ''} ({percentage}%)
        </span>
      </div>
      {isVotable && (
        <div className="vote-action">
          {isVoted
            ? <span className="voted-label"><FiCheck /> Tu voto</span>
            : <span className="vote-label">Votar</span>
          }
        </div>
      )}
    </div>
  );
}
